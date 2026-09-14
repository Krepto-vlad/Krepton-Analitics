import { buildPortfolioExportXlsxBuffer } from '../../../utils/portfolioExportWorkbook.js';
import type { PortfolioDataExport } from '../../../types/portfolio.types.js';

function exportPayload(overrides: Partial<PortfolioDataExport> = {}): PortfolioDataExport {
  return {
    schemaVersion: 2,
    exportedAt: '2026-01-15T00:00:00.000Z',
    account: {
      email: 'user@example.com',
      memberSince: '2026-01-01T00:00:00.000Z',
    },
    positions: [
      {
        id: 'pos-1',
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        shares: 10,
        avgBuyPrice: 100,
        currency: 'USD',
        sector: 'Technology',
        entryDate: '2026-01-10',
        createdAt: '2026-01-10T00:00:00.000Z',
        updatedAt: '2026-01-10T00:00:00.000Z',
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        shares: 10,
        pricePerShare: 100,
        currency: 'USD',
        transactionDate: '2026-01-10',
        transactionType: 'BUY',
        createdAt: '2026-01-10T00:00:00.000Z',
        source: 'import',
      },
    ],
    watchlist: [
      {
        id: 'wl-1',
        ticker: 'MSFT',
        companyName: 'Microsoft',
        createdAt: '2026-01-12T00:00:00.000Z',
      },
    ],
    rebalancing: {
      strategyId: 'custom',
      customBaseStrategyId: 'warren-buffett-9010',
      customAllocations: { equities: 90, bonds: 10 },
    },
    brokerageConnections: [
      {
        brokerageName: 'Trading 212',
        brokerageSlug: 'TRADING212',
        connectedAt: '2026-01-12T00:00:00.000Z',
        disabled: false,
        accessType: 'read',
      },
    ],
    ...overrides,
  };
}

describe('buildPortfolioExportXlsxBuffer', () => {
  it('returns an xlsx buffer for a full snapshot', () => {
    const buffer = buildPortfolioExportXlsxBuffer(exportPayload());

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('still builds a workbook when custom allocations are absent', () => {
    const buffer = buildPortfolioExportXlsxBuffer(
      exportPayload({
        rebalancing: {
          strategyId: 'warren-buffett-9010',
          customBaseStrategyId: null,
          customAllocations: null,
        },
      })
    );

    expect(buffer.length).toBeGreaterThan(0);
  });
});
