import { parseBrokerStatement } from '../../../services/brokerParsers/index.js';
import type { SafeSheetData } from '../../../utils/excelSafeReader.js';

jest.mock('../../../services/geminiClient.js', () => ({
  inferImportSchemaWithGemini: jest.fn(),
}));

jest.mock('../../../config/env.js', () => ({
  isGeminiConfigured: false,
  isGeminiGroundingEnabled: false,
  env: { geminiApiKey: '' },
}));

function sheet(rows: unknown[][]): SafeSheetData {
  return { sheetName: 'Sheet1', rows };
}

describe('Revolut statement via universal heuristic', () => {
  it('parses trades and skips non-trade rows without AI', async () => {
    const result = await parseBrokerStatement(
      sheet([
        ['Date', 'Ticker', 'Type', 'Quantity', 'Price', 'FX Rate', 'Piti'],
        ['2026-01-09T23:18:36.037880Z', 'MU', 'BUY - MARKET', 1.8610141, 'USD 340.61', 1.1709, 1],
        ['2026-01-10T14:55:00.112233Z', 'MU', 'SELL - STOP', 1.8610141, 'EUR 363.69', 1.1639, 2],
        ['2026-01-11T09:00:00.000000Z', '', 'CASH TOP-UP', '', '', '', ''],
      ]),
      'user-test'
    );

    expect(result.meta.mode).toBe('heuristic');
    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.skipped.length).toBeGreaterThan(0);
    expect(
      result.trades.every(
        (trade) => trade.transactionType === 'BUY' || trade.transactionType === 'SELL'
      )
    ).toBe(true);
    expect(result.trades.some((trade) => trade.ticker === 'MU')).toBe(true);
    expect(result.skipped.some((row) => row.sourceType === 'CASH TOP-UP')).toBe(true);
  });
});
