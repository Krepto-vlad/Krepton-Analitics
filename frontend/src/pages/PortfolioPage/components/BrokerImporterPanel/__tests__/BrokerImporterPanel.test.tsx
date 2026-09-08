import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { confirmBrokerImport, previewBrokerImport } from '../../../../../api/importApi';
import { ERROR_MESSAGES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { ImportPreviewResponse } from '../../../../../types/import.types';
import { BrokerImporterPanel } from '../BrokerImporterPanel';

jest.mock('../../../../../api/importApi', () => ({
  previewBrokerImport: jest.fn(),
  confirmBrokerImport: jest.fn(),
}));

jest.mock('../../../../../features/portfolio/portfolioSlice', () => {
  const actual = jest.requireActual('../../../../../features/portfolio/portfolioSlice');
  const idle = () => () => Promise.resolve();
  return {
    ...actual,
    fetchPortfolioSummaryThunk: idle,
    fetchInvestmentSummaryThunk: idle,
    fetchPositionsPageThunk: idle,
    fetchTransactionsPageThunk: idle,
  };
});

function csvFile(name = 'trades.csv'): File {
  return new File(['date,ticker\n'], name, { type: 'text/csv' });
}

function selectFile(file: File): void {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

function preview(overrides: Partial<ImportPreviewResponse> = {}): ImportPreviewResponse {
  return {
    importId: 'import-1',
    broker: 'GENERIC',
    parserMode: 'heuristic',
    confidence: 0.92,
    warning: 'Check currency column',
    columnMapping: null,
    trades: [
      {
        rowNumber: 2,
        ticker: 'AAPL',
        companyName: 'Apple',
        transactionType: 'BUY',
        shares: 10,
        pricePerShare: 150,
        currency: 'USD',
        transactionDate: '2026-01-02',
        sourceType: 'TRADE',
        sourceRowHash: 'hash-1',
      },
      {
        rowNumber: 3,
        ticker: 'MSFT',
        companyName: 'Microsoft',
        transactionType: 'SELL',
        shares: 2,
        pricePerShare: 400,
        currency: 'USD',
        transactionDate: '2026-01-03',
        sourceType: 'TRADE',
        sourceRowHash: 'hash-2',
      },
    ],
    skipped: [{ rowNumber: 4, sourceType: 'DIVIDEND', reason: 'Not a trade' }],
    summary: {
      totalRows: 4,
      tradeCount: 2,
      buyCount: 1,
      sellCount: 1,
      skippedCount: 1,
      duplicateCount: 0,
    },
    ...overrides,
  };
}

describe('BrokerImporterPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unsupported files and accepts a csv via the file input', () => {
    renderWithProviders(<BrokerImporterPanel />);

    expect(screen.getByText('Statement Importer')).toBeInTheDocument();

    selectFile(new File(['pdf'], 'report.pdf', { type: 'application/pdf' }));
    expect(screen.getByText(/Only \.xlsx and \.csv/)).toBeInTheDocument();

    selectFile(csvFile());
    expect(screen.getByText('trades.csv')).toBeInTheDocument();
  });

  it('previews, confirms, and shows a success result', async () => {
    jest.mocked(previewBrokerImport).mockResolvedValue(preview());
    jest.mocked(confirmBrokerImport).mockResolvedValue({
      importedCount: 2,
      skippedDuplicateCount: 1,
      affectedTickers: ['AAPL', 'MSFT'],
    });
    const user = userEvent.setup();
    renderWithProviders(<BrokerImporterPanel />);

    selectFile(csvFile());
    await user.click(screen.getByRole('button', { name: 'Preview Import' }));

    expect(await screen.findByText('Auto-detected')).toBeInTheDocument();
    expect(screen.getByText('Check currency column')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('SELL')).toBeInTheDocument();
    expect(screen.getByText('Not a trade')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import 2 trades' }));
    expect(await screen.findByText('Import complete')).toBeInTheDocument();
    expect(screen.getByText(/1 duplicate skipped/)).toBeInTheDocument();
  });

  it('shows preview and confirm errors and can clear the file', async () => {
    jest.mocked(previewBrokerImport).mockRejectedValueOnce({});
    const user = userEvent.setup();
    renderWithProviders(<BrokerImporterPanel />);

    selectFile(csvFile());
    await user.click(screen.getByRole('button', { name: 'Preview Import' }));
    expect(await screen.findByText(ERROR_MESSAGES.IMPORT_PREVIEW_FAILED)).toBeInTheDocument();

    jest.mocked(previewBrokerImport).mockResolvedValueOnce(
      preview({
        parserMode: 'ai_schema',
        warning: null,
        skipped: [],
        trades: Array.from({ length: 26 }, (_, index) => ({
          rowNumber: index + 2,
          ticker: `T${index}`,
          companyName: `Company ${index}`,
          transactionType: 'BUY' as const,
          shares: 1,
          pricePerShare: 10,
          currency: 'USD',
          transactionDate: '2026-01-02',
          sourceType: 'TRADE',
          sourceRowHash: `hash-${index}`,
        })),
        summary: {
          totalRows: 26,
          tradeCount: 26,
          buyCount: 26,
          sellCount: 0,
          skippedCount: 0,
          duplicateCount: 0,
        },
      })
    );
    await user.click(screen.getByRole('button', { name: 'Preview Import' }));
    expect(await screen.findByText(/Showing first 25 of 26 trades/)).toBeInTheDocument();
    expect(screen.getByText('AI-assisted')).toBeInTheDocument();

    jest.mocked(confirmBrokerImport).mockRejectedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Import 26 trades' }));
    expect(await screen.findByText('Import failed')).toBeInTheDocument();
    expect(screen.getByText(ERROR_MESSAGES.IMPORT_CONFIRM_FAILED)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Import failed')).not.toBeInTheDocument();
  });

  it('supports drag-and-drop, keyboard browse, cancel preview, and empty importable count', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BrokerImporterPanel />);

    const dropZone = screen.getByRole('button', { name: 'Upload broker statement file' });
    dropZone.focus();
    dropZone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);
    fireEvent.drop(dropZone, { dataTransfer: { files: [csvFile('ibkr.xlsx')] } });
    expect(await screen.findByText('ibkr.xlsx')).toBeInTheDocument();

    jest.mocked(previewBrokerImport).mockResolvedValue(
      preview({
        summary: {
          totalRows: 2,
          tradeCount: 2,
          buyCount: 2,
          sellCount: 0,
          skippedCount: 0,
          duplicateCount: 2,
        },
      })
    );
    await user.click(screen.getByRole('button', { name: 'Preview Import' }));
    expect(await screen.findByRole('button', { name: 'Import 0 trades' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel preview' }));
    expect(screen.queryByRole('button', { name: 'Import 0 trades' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText(/Drop your statement here/)).toBeInTheDocument();
  });
});
