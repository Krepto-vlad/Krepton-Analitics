import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRevolutStatement } from '../../../services/brokerParsers/revolutParser.js';
import { readSafeXlsxBuffer } from '../../../utils/excelSafeReader.js';

const SAMPLE_FILE_PATH = resolve(
  process.cwd(),
  '../Docs/statements/trading_account_statement_2026_01_01_2026_07_13_en_us_3b3ee6.xlsx'
);

describe('revolutParser', () => {
  it('parses Revolut account statement trades and skips non-trade rows', () => {
    const buffer = readFileSync(SAMPLE_FILE_PATH);
    const sheetData = readSafeXlsxBuffer(buffer);
    const result = parseRevolutStatement(sheetData);

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
