import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import {
  ERROR_MESSAGES,
  HEADER_TICKER_SEARCH_INPUT_ID,
  HEADER_TICKER_SEARCH_MAX_RESULTS,
  ROUTES,
  STOCK_SEARCH_DEBOUNCE_MS,
  formatTickerNotFoundMessage,
} from '../../../../constants';
import { renderWithProviders } from '../../../../__tests__/renderWithProviders';
import { fetchStockSearch } from '../../../../api/stockApi';
import type { StockSearchResult } from '../../../../types/stock.types';
import { HeaderTickerSearch } from '../HeaderTickerSearch';

jest.mock('../../../../api/stockApi', () => ({
  fetchStockSearch: jest.fn(),
}));

const APPLE_TICKER = 'AAPL';
const MICROSOFT_TICKER = 'MSFT';
const UNKNOWN_TICKER = 'ZZZZ';

const appleResult: StockSearchResult = {
  ticker: APPLE_TICKER,
  name: 'Apple Inc.',
  exchange: 'NMS',
  type: 'EQUITY',
};

const microsoftResult: StockSearchResult = {
  ticker: MICROSOFT_TICKER,
  name: 'Microsoft Corporation',
  exchange: 'NMS',
  type: 'EQUITY',
};

function renderSearch() {
  return renderWithProviders(
    <>
      <HeaderTickerSearch />
      <Routes>
        <Route path="/" element={null} />
        <Route path={ROUTES.TICKER} element={<p>Ticker page</p>} />
      </Routes>
    </>
  );
}

async function typeQuery(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.type(screen.getByRole('combobox', { name: 'Search ticker' }), query);
  await act(async () => {
    jest.advanceTimersByTime(STOCK_SEARCH_DEBOUNCE_MS);
  });
}

describe('HeaderTickerSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.mocked(fetchStockSearch).mockResolvedValue([appleResult, microsoftResult]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces search and lists matching tickers', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderSearch();

    await typeQuery(user, 'AA');
    await waitFor(() => {
      expect(fetchStockSearch).toHaveBeenCalledWith('AA');
    });

    expect(await screen.findByText(APPLE_TICKER)).toBeInTheDocument();
    expect(screen.getByText(MICROSOFT_TICKER)).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  it('opens a ticker page from a dropdown result', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderSearch();

    await typeQuery(user, APPLE_TICKER);
    await screen.findByText(APPLE_TICKER);
    await user.click(screen.getByRole('button', { name: new RegExp(APPLE_TICKER) }));

    expect(await screen.findByText('Ticker page')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search ticker' })).toHaveValue('');
  });

  it('submits an exact match with Enter', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderSearch();

    await typeQuery(user, APPLE_TICKER);
    await screen.findByText(APPLE_TICKER);
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Ticker page')).toBeInTheDocument();
  });

  it('submits a unique result when the query is not an exact ticker', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.mocked(fetchStockSearch).mockResolvedValue([appleResult]);
    renderSearch();

    await typeQuery(user, 'Apple');
    await screen.findByText(APPLE_TICKER);
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Ticker page')).toBeInTheDocument();
  });

  it('shows a not-found message when search returns nothing', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.mocked(fetchStockSearch).mockResolvedValue([]);
    renderSearch();

    await typeQuery(user, UNKNOWN_TICKER);
    expect(
      await screen.findByText(formatTickerNotFoundMessage(UNKNOWN_TICKER))
    ).toBeInTheDocument();
  });

  it('shows a search error and closes on Escape or outside click', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();
    jest.mocked(fetchStockSearch).mockRejectedValue({});
    renderSearch();

    await user.type(screen.getByRole('combobox', { name: 'Search ticker' }), APPLE_TICKER);
    expect(await screen.findByText(ERROR_MESSAGES.STOCK_SEARCH_FAILED)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText(ERROR_MESSAGES.STOCK_SEARCH_FAILED)).not.toBeInTheDocument();

    const searchInput = screen.getByRole('combobox', { name: 'Search ticker' });
    searchInput.blur();
    fireEvent.focus(searchInput);
    expect(screen.getByText(ERROR_MESSAGES.STOCK_SEARCH_FAILED)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText(ERROR_MESSAGES.STOCK_SEARCH_FAILED)).not.toBeInTheDocument();
  });

  it('clears results when the query is emptied and ignores blank Enter', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderSearch();

    await typeQuery(user, APPLE_TICKER);
    await screen.findByText(APPLE_TICKER);

    await user.clear(screen.getByRole('combobox', { name: 'Search ticker' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(fetchStockSearch).toHaveBeenCalledTimes(1);
  });

  it('limits dropdown results to the header search cap', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const manyResults = Array.from(
      { length: HEADER_TICKER_SEARCH_MAX_RESULTS + 3 },
      (_, index) => ({
        ticker: `T${index}`,
        name: `Company ${index}`,
        exchange: 'NMS',
        type: 'EQUITY',
      })
    );
    jest.mocked(fetchStockSearch).mockResolvedValue(manyResults);
    renderSearch();

    await typeQuery(user, 'T');
    await screen.findByRole('listbox');
    expect(screen.getAllByRole('option')).toHaveLength(HEADER_TICKER_SEARCH_MAX_RESULTS);
  });

  it('uses the shared search input id', () => {
    renderSearch();
    expect(screen.getByRole('combobox', { name: 'Search ticker' })).toHaveAttribute(
      'id',
      HEADER_TICKER_SEARCH_INPUT_ID
    );
  });
});
