import { parseBrokerStatement } from '../../../services/brokerParsers/index.js';
import type { SafeSheetData } from '../../../utils/excelSafeReader.js';

jest.mock('../../../services/geminiClient.js', () => ({
  inferImportSchemaWithGemini: jest.fn(),
}));

jest.mock('../../../services/aiQuotaService.js', () => ({
  assertAiQuotaAvailable: jest.fn().mockResolvedValue({
    used: 0,
    limit: 10,
    remaining: 10,
    resetsAt: new Date().toISOString(),
  }),
  recordAiUsage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../config/env.js', () => ({
  isGeminiConfigured: true,
  isGeminiGroundingEnabled: false,
  env: { geminiApiKey: 'test-key' },
}));

import { inferImportSchemaWithGemini } from '../../../services/geminiClient.js';
import { assertAiQuotaAvailable, recordAiUsage } from '../../../services/aiQuotaService.js';

const mockedInfer = inferImportSchemaWithGemini as jest.MockedFunction<
  typeof inferImportSchemaWithGemini
>;

function sheet(rows: unknown[][]): SafeSheetData {
  return { sheetName: 'Sheet1', rows };
}

describe('parseBrokerStatement universal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps Revolut-like headers heuristically without AI', async () => {
    const result = await parseBrokerStatement(
      sheet([
        [
          'Date',
          'Ticker',
          'Type',
          'Quantity',
          'Price per share',
          'Total Amount',
          'Currency',
          'FX Rate',
        ],
        ['2026-01-02', 'AAPL', 'BUY - MARKET', 1, 100, 100, 'USD', 1],
        ['2026-01-03', 'AAPL', 'CASH TOP-UP', '', '', 50, 'USD', 1],
      ]),
      'user-1'
    );

    expect(result.meta.mode).toBe('heuristic');
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].ticker).toBe('AAPL');
    expect(result.skipped.some((row) => row.sourceType === 'CASH TOP-UP')).toBe(true);
    expect(mockedInfer).not.toHaveBeenCalled();
  });

  it('maps Trading 212-like headers and skips dividends', async () => {
    const result = await parseBrokerStatement(
      sheet([
        [
          'Action',
          'Time',
          'ISIN',
          'Ticker',
          'Name',
          'Notes',
          'ID',
          'No. of shares',
          'Price / share',
          'Currency (Price / share)',
          'Exchange rate',
          'Result',
          'Currency (Result)',
          'Total',
          'Currency (Total)',
          'Withholding tax',
          'Currency (Withholding tax)',
          'Stamp duty reserve tax',
          'Currency (Stamp duty reserve tax)',
          'Currency conversion fee',
          'Currency (Currency conversion fee)',
        ],
        [
          'Market sell',
          '2026-05-10 16:10:05',
          'US0378331005',
          'AAPL',
          'Apple',
          '',
          '-',
          5,
          195.0,
          'USD',
          1.24,
          58.5,
          'EUR',
          786.29,
          'EUR',
          '',
          '',
          '',
          '',
          1.57,
          'EUR',
        ],
        [
          'Dividend (Ordinary)',
          '2026-05-11 09:00:00',
          'US0378331005',
          'AAPL',
          'Apple',
          '',
          '-',
          '',
          '',
          'USD',
          1.2,
          12,
          'EUR',
          12,
          'EUR',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
      ]),
      'user-1'
    );

    expect(result.meta.mode).toBe('heuristic');
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].ticker).toBe('AAPL');
    expect(result.trades[0].transactionType).toBe('SELL');
    expect(result.trades[0].currency).toBe('USD');
    expect(result.trades[0].shares).toBe(5);
    expect(result.skipped.some((row) => row.sourceType.includes('Dividend'))).toBe(true);
    expect(mockedInfer).not.toHaveBeenCalled();
  });

  it('parses stripped Revolut-like sheet without currency via heuristic', async () => {
    const result = await parseBrokerStatement(
      sheet([
        ['Date', 'Ticker', 'Type', 'Quantity', 'Price', 'Noise'],
        ['2026-01-02', 'AAPL', 'BUY - MARKET', 1, 100, 'ignore'],
        ['2026-01-03', 'AAPL', 'CASH TOP-UP', '', '', 'ignore'],
      ]),
      'user-1'
    );

    expect(result.meta.mode).toBe('heuristic');
    expect(result.meta.warning).toContain('USD');
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].currency).toBe('USD');
    expect(mockedInfer).not.toHaveBeenCalled();
  });

  it('falls back to AI schema from truncated sample only', async () => {
    mockedInfer.mockResolvedValue({
      mapping: {
        headerRowIndex: 0,
        columns: {
          date: 0,
          ticker: 1,
          side: 2,
          quantity: 3,
          price: 4,
          currency: 5,
        },
      },
      confidence: 0.81,
    });

    const result = await parseBrokerStatement(
      sheet([
        ['ColA', 'ColB', 'ColC', 'ColD', 'ColE', 'ColF'],
        ['2026-05-01', 'AMD', 'BUY', 5, 90, 'USD'],
      ]),
      'user-1'
    );

    expect(result.meta.mode).toBe('ai_schema');
    expect(result.trades).toHaveLength(1);
    expect(assertAiQuotaAvailable).toHaveBeenCalledWith('user-1', 'import_schema');
    expect(recordAiUsage).toHaveBeenCalledWith('user-1', 'import_schema');
    expect(mockedInfer).toHaveBeenCalledTimes(1);
    const sampleArg = mockedInfer.mock.calls[0][0];
    expect(sampleArg.sampleRows.length).toBeLessThanOrEqual(20);
  });
});
