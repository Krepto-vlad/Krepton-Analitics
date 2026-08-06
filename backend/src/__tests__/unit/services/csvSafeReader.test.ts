import { readSafeCsvBuffer, readSafeTabularBuffer } from '../../../utils/excelSafeReader.js';
import { AppError } from '../../../middleware/errorHandler.js';

describe('readSafeCsvBuffer / readSafeTabularBuffer', () => {
  it('parses a CSV trade export from memory', () => {
    const csv = [
      'Action,Time,Ticker,No. of shares,Price / share,Currency (Price / share)',
      'Market buy,2026-05-10 16:10:05,AAPL,2,190.00,USD',
      'Market sell,2026-05-11 10:00:00,AAPL,1,195.00,USD',
    ].join('\n');

    const sheet = readSafeCsvBuffer(Buffer.from(csv, 'utf8'));

    expect(sheet.rows.length).toBe(3);
    expect(sheet.rows[0][0]).toBe('Action');
    expect(sheet.rows[1][2]).toBe('AAPL');
  });

  it('routes by filename extension', () => {
    const csv = 'Date,Ticker,Type,Quantity,Price,Currency\n2026-01-01,MSFT,BUY,1,100,USD\n';
    const sheet = readSafeTabularBuffer(Buffer.from(csv, 'utf8'), 't212-export.csv');
    expect(sheet.rows[0][1]).toBe('Ticker');
  });

  it('rejects PDF filenames', () => {
    expect(() => readSafeTabularBuffer(Buffer.from('%PDF-1.4'), 'statement.pdf')).toThrow(AppError);
  });
});
