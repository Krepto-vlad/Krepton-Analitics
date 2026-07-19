import { AppError } from '../middleware/errorHandler.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import { readSafeXlsxBuffer } from '../utils/excelSafeReader.js';
import { buildTradeFingerprint } from '../utils/tradeFingerprint.js';
import { assertSupportedBrokerId, parseBrokerStatement } from './brokerParsers/index.js';
import { saveImportPreview, consumeImportPreview } from './importPreviewStore.js';
import {
  findOrCreatePortfolioAccount,
  getAllTransactionsForDedup,
} from '../repositories/portfolioRepository.js';
import { confirmImportedTrades } from './portfolioService.js';
import type {
  ImportPreviewResponse,
  ImportConfirmResponse,
  NormalizedTrade,
  SkippedImportRow,
} from '../types/import.types.js';

function countDuplicates(trades: NormalizedTrade[], existingFingerprints: Set<string>): number {
  let duplicateCount = 0;

  for (const trade of trades) {
    const fingerprint = buildTradeFingerprint(trade);
    if (existingFingerprints.has(fingerprint)) {
      duplicateCount += 1;
    }
  }

  return duplicateCount;
}

function buildPreviewSummary(
  totalRows: number,
  trades: NormalizedTrade[],
  skipped: SkippedImportRow[],
  duplicateCount: number
): ImportPreviewResponse['summary'] {
  const buyCount = trades.filter((trade) => trade.transactionType === 'BUY').length;
  const sellCount = trades.filter((trade) => trade.transactionType === 'SELL').length;

  return {
    totalRows,
    tradeCount: trades.length,
    buyCount,
    sellCount,
    skippedCount: skipped.length,
    duplicateCount,
  };
}

export async function previewBrokerImport(
  userId: string,
  brokerRaw: string,
  fileBuffer: Buffer
): Promise<ImportPreviewResponse> {
  const broker = assertSupportedBrokerId(brokerRaw);
  const sheetData = readSafeXlsxBuffer(fileBuffer);
  const parsed = parseBrokerStatement(broker, sheetData);

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const existingTransactions = await getAllTransactionsForDedup(portfolioId);

  const existingFingerprints = new Set(
    existingTransactions.map((transaction) =>
      buildTradeFingerprint({
        ticker: transaction.ticker,
        transactionDate:
          transaction.transaction_date ?? transaction.created_at.toISOString().slice(0, 10),
        transactionType: transaction.transaction_type,
        shares: Number.parseFloat(transaction.shares),
        pricePerShare: Number.parseFloat(transaction.price_per_share),
      })
    )
  );

  const duplicateCount = countDuplicates(parsed.trades, existingFingerprints);
  const importId = saveImportPreview(userId, broker, parsed.trades);

  return {
    importId,
    broker,
    trades: parsed.trades,
    skipped: parsed.skipped,
    summary: buildPreviewSummary(
      sheetData.rows.length,
      parsed.trades,
      parsed.skipped,
      duplicateCount
    ),
  };
}

export async function confirmBrokerImport(
  userId: string,
  importId: string
): Promise<ImportConfirmResponse> {
  const preview = consumeImportPreview(importId, userId);
  if (!preview) {
    throw new AppError(404, 'Import preview expired or not found. Upload the file again.');
  }

  return confirmImportedTrades(userId, preview.broker, preview.trades);
}
