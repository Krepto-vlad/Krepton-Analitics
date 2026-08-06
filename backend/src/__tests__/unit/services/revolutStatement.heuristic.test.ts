import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBrokerStatement } from '../../../services/brokerParsers/index.js';
import { readSafeXlsxBuffer } from '../../../utils/excelSafeReader.js';

jest.mock('../../../services/geminiClient.js', () => ({
  inferImportSchemaWithGemini: jest.fn(),
}));

jest.mock('../../../config/env.js', () => ({
  isGeminiConfigured: false,
  isGeminiGroundingEnabled: false,
  env: { geminiApiKey: '' },
}));

const SAMPLE_FILE_PATH = resolve(
  process.cwd(),
  '../Docs/statements/trading_account_statement_2026_01_01_2026_07_13_en_us_3b3ee6 copy.xlsx'
);

describe('Revolut statement via universal heuristic', () => {
  it('parses trades and skips non-trade rows without AI', async () => {
    const buffer = readFileSync(SAMPLE_FILE_PATH);
    const sheetData = readSafeXlsxBuffer(buffer);
    const result = await parseBrokerStatement(sheetData, 'user-test');

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
