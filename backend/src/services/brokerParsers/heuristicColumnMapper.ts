import {
  IMPORT_HEADER_SCAN_MAX_ROWS,
  IMPORT_HEURISTIC_CONFIDENCE_THRESHOLD,
} from '../../constants.js';
import type { ColumnMapping, TradeColumnKey } from '../../types/import.types.js';
import { REQUIRED_TRADE_COLUMN_KEYS } from '../../types/import.types.js';
import type { SafeSheetData } from '../../utils/excelSafeReader.js';
import { buildHeaderFingerprint, normalizeHeader } from './parseUtils.js';

interface HeaderSynonym {
  column: TradeColumnKey;
  patterns: readonly string[];
  weight: number;
  /** When true, only exact (or near-exact) matches count — avoids ISIN stealing ticker. */
  exactPreferred?: boolean;
}

export interface HeuristicMappingResult {
  mapping: ColumnMapping;
  confidence: number;
  headerFingerprint: string;
  missingCurrency: boolean;
}

const CURRENCY_PENALTY_TOKENS = [
  'result',
  'total',
  'withholding',
  'stamp',
  'conversion fee',
  'tax',
] as const;

const CURRENCY_BONUS_TOKENS = [
  'price share',
  'price per share',
  'unit price',
  'share price',
] as const;

/**
 * Exact / near-exact header synonyms. Longer / more specific phrases score higher
 * when multiple headers compete for the same logical column.
 */
const HEADER_SYNONYMS: readonly HeaderSynonym[] = [
  {
    column: 'date',
    patterns: [
      'trade date',
      'transaction date',
      'date executed',
      'settlement date',
      'activity date',
      'time',
      'date',
    ],
    weight: 1,
  },
  {
    column: 'ticker',
    patterns: ['ticker', 'symbol', 'instrument code'],
    weight: 1.15,
    exactPreferred: true,
  },
  {
    column: 'side',
    patterns: [
      'transaction type',
      'trade type',
      'action',
      'side',
      'type',
      'buy sell',
      'direction',
      'operation',
    ],
    weight: 1,
  },
  {
    column: 'quantity',
    patterns: [
      'no of shares',
      'number of shares',
      'amount of shares',
      'quantity',
      'qty',
      'shares',
      'units',
      'volume',
    ],
    weight: 1,
  },
  {
    column: 'price',
    patterns: [
      'price per share',
      'price share',
      'share price',
      'unit price',
      'trade price',
      'execution price',
      'price',
    ],
    weight: 1,
  },
  {
    column: 'currency',
    patterns: [
      'currency price share',
      'currency price per share',
      'currency share',
      'currency code',
      'currency',
      'ccy',
      'curr',
    ],
    weight: 1,
  },
];

/** Fallback only when no ticker/symbol column exists. */
const ISIN_TICKER_FALLBACK_PATTERN = 'isin';

function scoreHeaderAgainstColumn(normalizedHeader: string, synonym: HeaderSynonym): number {
  let bestScore = 0;

  for (const pattern of synonym.patterns) {
    const normalizedPattern = normalizeHeader(pattern);
    if (!normalizedPattern) {
      continue;
    }

    if (normalizedHeader === normalizedPattern) {
      bestScore = Math.max(bestScore, 1 * synonym.weight);
      continue;
    }

    if (synonym.exactPreferred) {
      continue;
    }

    if (
      normalizedHeader.includes(normalizedPattern) ||
      normalizedPattern.includes(normalizedHeader)
    ) {
      const overlap =
        Math.min(normalizedHeader.length, normalizedPattern.length) /
        Math.max(normalizedHeader.length, normalizedPattern.length);
      bestScore = Math.max(bestScore, 0.75 * overlap * synonym.weight);
    }
  }

  if (synonym.column === 'currency' && bestScore > 0) {
    if (CURRENCY_PENALTY_TOKENS.some((token) => normalizedHeader.includes(token))) {
      bestScore *= 0.25;
    } else if (CURRENCY_BONUS_TOKENS.some((token) => normalizedHeader.includes(token))) {
      bestScore = Math.min(bestScore * 1.2, 1.2);
    }
  }

  if (synonym.column === 'price' && normalizedHeader.includes('exchange rate')) {
    return 0;
  }

  if (synonym.column === 'price' && normalizedHeader === 'rate') {
    return 0;
  }

  return bestScore;
}

function mapHeadersToColumns(headerRow: unknown[]): {
  columns: ColumnMapping['columns'] | null;
  scoreSum: number;
  missingCurrency: boolean;
} {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const assigned = new Map<TradeColumnKey, { index: number; score: number }>();
  const usedIndexes = new Set<number>();

  const candidates: Array<{ column: TradeColumnKey; index: number; score: number }> = [];

  for (let index = 0; index < normalizedHeaders.length; index += 1) {
    const header = normalizedHeaders[index];
    if (!header) {
      continue;
    }

    for (const synonym of HEADER_SYNONYMS) {
      const score = scoreHeaderAgainstColumn(header, synonym);
      if (score > 0) {
        candidates.push({ column: synonym.column, index, score });
      }
    }
  }

  candidates.sort((left, right) => right.score - left.score);

  for (const candidate of candidates) {
    if (assigned.has(candidate.column) || usedIndexes.has(candidate.index)) {
      continue;
    }
    assigned.set(candidate.column, { index: candidate.index, score: candidate.score });
    usedIndexes.add(candidate.index);
  }

  if (!assigned.has('ticker')) {
    const isinIndex = normalizedHeaders.findIndex(
      (header) => header === ISIN_TICKER_FALLBACK_PATTERN
    );
    if (isinIndex >= 0 && !usedIndexes.has(isinIndex)) {
      assigned.set('ticker', { index: isinIndex, score: 0.55 });
      usedIndexes.add(isinIndex);
    }
  }

  if (REQUIRED_TRADE_COLUMN_KEYS.some((key) => !assigned.has(key))) {
    return { columns: null, scoreSum: 0, missingCurrency: false };
  }

  let scoreSum = 0;
  for (const key of REQUIRED_TRADE_COLUMN_KEYS) {
    scoreSum += assigned.get(key)!.score;
  }

  const currencyMatch = assigned.get('currency');
  if (currencyMatch) {
    scoreSum += currencyMatch.score;
  }

  return {
    columns: {
      date: assigned.get('date')!.index,
      ticker: assigned.get('ticker')!.index,
      side: assigned.get('side')!.index,
      quantity: assigned.get('quantity')!.index,
      price: assigned.get('price')!.index,
      currency: currencyMatch?.index ?? null,
    },
    scoreSum,
    missingCurrency: !currencyMatch,
  };
}

export function mapColumnsHeuristically(sheetData: SafeSheetData): HeuristicMappingResult | null {
  const scanLimit = Math.min(sheetData.rows.length, IMPORT_HEADER_SCAN_MAX_ROWS);
  let best: HeuristicMappingResult | null = null;

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const headerRow = sheetData.rows[rowIndex];
    if (!headerRow || headerRow.length === 0) {
      continue;
    }

    const { columns, scoreSum, missingCurrency } = mapHeadersToColumns(headerRow);
    if (!columns) {
      continue;
    }

    // Score against required columns (+ currency bonus when present).
    const denominator = REQUIRED_TRADE_COLUMN_KEYS.length + (missingCurrency ? 0 : 1);
    const confidence = Math.min(scoreSum / denominator, 1);
    if (confidence < IMPORT_HEURISTIC_CONFIDENCE_THRESHOLD) {
      continue;
    }

    const candidate: HeuristicMappingResult = {
      mapping: { headerRowIndex: rowIndex, columns },
      confidence,
      headerFingerprint: buildHeaderFingerprint(headerRow.map(normalizeHeader)),
      missingCurrency,
    };

    if (!best || candidate.confidence > best.confidence) {
      best = candidate;
    }
  }

  return best;
}
