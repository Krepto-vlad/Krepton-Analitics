import * as XLSX from 'xlsx';
import type { PortfolioDataExport } from '../types/portfolio.types.js';

const XLSX_BOOK_TYPE = 'xlsx' as const;
const DEFAULT_COLUMN_WIDTH = 18;
const WIDE_COLUMN_WIDTH = 28;
const SUMMARY_FIELD_COLUMN_WIDTH = 36;
const SUMMARY_VALUE_COLUMN_WIDTH = 40;

const SHEET_NAME_POSITIONS = 'Positions';
const SHEET_NAME_TRANSACTIONS = 'Transactions';
const SHEET_NAME_WATCHLIST = 'Watchlist';
const SHEET_NAME_SUMMARY = 'Summary';

const POSITION_SHEET_HEADERS = [
  'Ticker',
  'Company',
  'Shares',
  'Avg buy price',
  'Currency',
  'Sector',
  'Entry date',
  'Created at',
  'Updated at',
] as const;

const TRANSACTION_SHEET_HEADERS = [
  'Ticker',
  'Company',
  'Type',
  'Source',
  'Shares',
  'Price per share',
  'Currency',
  'Transaction date',
  'Created at',
] as const;

const WATCHLIST_SHEET_HEADERS = ['Ticker', 'Company', 'Added at'] as const;

const CONNECTION_SHEET_HEADERS = [
  'Brokerage',
  'Slug',
  'Connected at',
  'Disabled',
  'Access type',
] as const;

const SHEET_NAME_CONNECTIONS = 'Brokerage connections';

type SheetRow = Record<string, string | number>;

function buildSheetWithHeaders(headers: string[], rows: SheetRow[]): XLSX.WorkSheet {
  const matrix: Array<Array<string | number>> = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  worksheet['!cols'] = headers.map((header) => ({
    wch: Math.max(
      header.length + 2,
      header.includes('Company') ? WIDE_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH
    ),
  }));
  return worksheet;
}

function buildSummarySheet(exportData: PortfolioDataExport): XLSX.WorkSheet {
  const allocationEntries = Object.entries(exportData.rebalancing.customAllocations ?? {});

  const rows: Array<Array<string | number>> = [
    ['Your Krepton Analytics data export'],
    [''],
    ['This workbook contains your stored portfolio data. Open the other sheets for full details:'],
    ['1) Positions — current holdings'],
    ['2) Transactions — buy/sell history'],
    ['3) Watchlist — saved tickers'],
    ['4) Brokerage connections — read-only SnapTrade links (no passwords or account numbers)'],
    [''],
    ['Field', 'Value'],
    ['Exported at', exportData.exportedAt],
    ['Email', exportData.account.email],
    ['Member since', exportData.account.memberSince],
    ['Schema version', exportData.schemaVersion],
    ['Rebalancing strategy', exportData.rebalancing.strategyId],
    ['Custom base strategy', exportData.rebalancing.customBaseStrategyId ?? ''],
    ['Positions count', exportData.positions.length],
    ['Transactions count', exportData.transactions.length],
    ['Watchlist count', exportData.watchlist.length],
    ['Brokerage connections count', exportData.brokerageConnections.length],
  ];

  if (allocationEntries.length > 0) {
    rows.push([''], ['Custom allocation asset class', 'Weight %']);
    for (const [assetClass, weight] of allocationEntries) {
      rows.push([assetClass, weight]);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: SUMMARY_FIELD_COLUMN_WIDTH }, { wch: SUMMARY_VALUE_COLUMN_WIDTH }];
  return worksheet;
}

/**
 * Builds an in-memory .xlsx workbook (never written to disk) for human-readable export.
 * Full row-level data lives on Positions / Transactions / Watchlist sheets.
 */
export function buildPortfolioExportXlsxBuffer(exportData: PortfolioDataExport): Buffer {
  const workbook = XLSX.utils.book_new();

  const positionsSheet = buildSheetWithHeaders(
    [...POSITION_SHEET_HEADERS],
    exportData.positions.map((position) => ({
      Ticker: position.ticker,
      Company: position.companyName,
      Shares: position.shares,
      'Avg buy price': position.avgBuyPrice,
      Currency: position.currency,
      Sector: position.sector ?? '',
      'Entry date': position.entryDate ?? '',
      'Created at': position.createdAt,
      'Updated at': position.updatedAt,
    }))
  );

  const transactionsSheet = buildSheetWithHeaders(
    [...TRANSACTION_SHEET_HEADERS],
    exportData.transactions.map((transaction) => ({
      Ticker: transaction.ticker,
      Company: transaction.companyName,
      Type: transaction.transactionType,
      Source: transaction.source,
      Shares: transaction.shares,
      'Price per share': transaction.pricePerShare,
      Currency: transaction.currency,
      'Transaction date': transaction.transactionDate ?? '',
      'Created at': transaction.createdAt,
    }))
  );

  const watchlistSheet = buildSheetWithHeaders(
    [...WATCHLIST_SHEET_HEADERS],
    exportData.watchlist.map((item) => ({
      Ticker: item.ticker,
      Company: item.companyName,
      'Added at': item.createdAt,
    }))
  );

  const connectionsSheet = buildSheetWithHeaders(
    [...CONNECTION_SHEET_HEADERS],
    exportData.brokerageConnections.map((connection) => ({
      Brokerage: connection.brokerageName,
      Slug: connection.brokerageSlug,
      'Connected at': connection.connectedAt ?? '',
      Disabled: connection.disabled ? 'yes' : 'no',
      'Access type': connection.accessType,
    }))
  );

  // Lead with data sheets so Excel opens on holdings, not summary counts.
  XLSX.utils.book_append_sheet(workbook, positionsSheet, SHEET_NAME_POSITIONS);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, SHEET_NAME_TRANSACTIONS);
  XLSX.utils.book_append_sheet(workbook, watchlistSheet, SHEET_NAME_WATCHLIST);
  XLSX.utils.book_append_sheet(workbook, connectionsSheet, SHEET_NAME_CONNECTIONS);
  XLSX.utils.book_append_sheet(workbook, buildSummarySheet(exportData), SHEET_NAME_SUMMARY);

  const workbookOutput = XLSX.write(workbook, {
    type: 'buffer',
    bookType: XLSX_BOOK_TYPE,
  }) as Buffer;

  return Buffer.from(workbookOutput);
}
