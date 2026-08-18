import { consumeImportPreview, saveImportPreview } from '../../../services/importPreviewStore.js';
import type { NormalizedTrade } from '../../../types/import.types.js';

function trade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    rowNumber: 2,
    ticker: 'AAPL',
    companyName: 'Apple',
    transactionType: 'BUY',
    shares: 1,
    pricePerShare: 10,
    currency: 'USD',
    transactionDate: '2026-01-02',
    sourceType: 'csv',
    sourceRowHash: 'hash-1',
    ...overrides,
  };
}

describe('importPreviewStore', () => {
  it('saves a preview and consumes it once for the owner', () => {
    const importId = saveImportPreview('user-1', 'GENERIC', [trade()]);

    const first = consumeImportPreview(importId, 'user-1');
    expect(first).toEqual({
      broker: 'GENERIC',
      trades: [trade()],
    });

    expect(consumeImportPreview(importId, 'user-1')).toBeNull();
  });

  it('does not hand a preview to a different user', () => {
    const importId = saveImportPreview('user-1', 'GENERIC', [trade()]);

    expect(consumeImportPreview(importId, 'user-2')).toBeNull();
  });
});
