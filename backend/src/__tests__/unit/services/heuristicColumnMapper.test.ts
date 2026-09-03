import { mapColumnsHeuristically } from '../../../services/brokerParsers/heuristicColumnMapper.js';
import { parseRowsWithMapping } from '../../../services/brokerParsers/mappedRowParser.js';
import type { SafeSheetData } from '../../../utils/excelSafeReader.js';

function sheet(rows: unknown[][]): SafeSheetData {
  return { sheetName: 'Sheet1', rows };
}

describe('mapColumnsHeuristically', () => {
  it('maps common generic trade headers', () => {
    const data = sheet([
      ['Trade Date', 'Symbol', 'Action', 'Qty', 'Price', 'Currency'],
      ['2026-03-01', 'MSFT', 'BUY', 2, 400.5, 'USD'],
      ['2026-03-02', 'MSFT', 'SELL', 1, 410, 'USD'],
    ]);

    const heuristic = mapColumnsHeuristically(data);
    expect(heuristic).not.toBeNull();
    expect(heuristic!.confidence).toBeGreaterThanOrEqual(0.72);

    const parsed = parseRowsWithMapping(data, heuristic!.mapping);
    expect(parsed.trades).toHaveLength(2);
    expect(parsed.trades[0].ticker).toBe('MSFT');
    expect(parsed.trades[0].transactionType).toBe('BUY');
    expect(parsed.trades[1].transactionType).toBe('SELL');
  });

  it('prefers Ticker over ISIN and price currency over result currency', () => {
    const data = sheet([
      [
        'Action',
        'Time',
        'ISIN',
        'Ticker',
        'No. of shares',
        'Price / share',
        'Currency (Price / share)',
        'Currency (Result)',
      ],
      ['Market buy', '2026-05-10 16:10:05', 'US0378331005', 'AAPL', 2, 190, 'USD', 'EUR'],
    ]);

    const heuristic = mapColumnsHeuristically(data);
    expect(heuristic).not.toBeNull();
    expect(heuristic!.mapping.columns.ticker).toBe(3);
    expect(heuristic!.mapping.columns.currency).toBe(6);

    const parsed = parseRowsWithMapping(data, heuristic!.mapping);
    expect(parsed.trades[0].ticker).toBe('AAPL');
    expect(parsed.trades[0].currency).toBe('USD');
  });

  it('maps when currency is missing and price is renamed; defaults currency later', () => {
    const data = sheet([
      ['Date', 'Ticker', 'Type', 'Quantity', 'Price', 'Extra A', 'Extra B'],
      ['2026-01-02', 'AAPL', 'BUY - MARKET', 1, 100, 'x', 'y'],
    ]);

    const heuristic = mapColumnsHeuristically(data);
    expect(heuristic).not.toBeNull();
    expect(heuristic!.missingCurrency).toBe(true);
    expect(heuristic!.mapping.columns.currency).toBeNull();
    expect(heuristic!.mapping.columns.price).toBe(4);

    const parsed = parseRowsWithMapping(data, heuristic!.mapping);
    expect(parsed.trades).toHaveLength(1);
    expect(parsed.trades[0].currency).toBe('USD');
    expect(parsed.trades[0].pricePerShare).toBe(100);
    expect(parsed.usedDefaultCurrency).toBe(true);
  });

  it('extracts currency embedded in price cells (USD 340.61)', () => {
    const data = sheet([
      ['Date', 'Ticker', 'Type', 'Quantity', 'Price', 'FX Rate', 'Piti'],
      ['2026-01-09T23:18:36.037880Z', 'MU', 'BUY - MARKET', 1.8610141, 'USD 340.61', 1.1709, 1],
      ['2026-01-10T14:55:00.112233Z', 'MU', 'SELL - STOP', 1.8610141, 'EUR 363.69', 1.1639, 2],
    ]);

    const heuristic = mapColumnsHeuristically(data);
    expect(heuristic).not.toBeNull();
    expect(heuristic!.missingCurrency).toBe(true);

    const parsed = parseRowsWithMapping(data, heuristic!.mapping);
    expect(parsed.trades).toHaveLength(2);
    expect(parsed.trades[0].currency).toBe('USD');
    expect(parsed.trades[0].pricePerShare).toBe(340.61);
    expect(parsed.trades[1].currency).toBe('EUR');
    expect(parsed.trades[1].pricePerShare).toBe(363.69);
    expect(parsed.usedDefaultCurrency).toBe(false);
  });

  it('returns null when required columns are missing', () => {
    const result = mapColumnsHeuristically(
      sheet([
        ['Date', 'Notes'],
        ['2026-01-01', 'hello'],
      ])
    );

    expect(result).toBeNull();
  });
});
