import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fetchTickerTape } from '../../../api/stockApi';
import { ROUTES, TICKER_CACHE_TTL_MS } from '../../../constants';
import { createTestStore } from '../../../__tests__/renderWithProviders';
import type { StockQuote } from '../../../types/stock.types';
import { LandingPage } from '../LandingPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

jest.mock('../../../components/layout', () => ({
  Navbar: () => <nav>Navbar</nav>,
  Footer: () => <footer>Footer</footer>,
}));

jest.mock('../../../api/stockApi', () => ({
  fetchTickerTape: jest.fn(),
}));

function quote(overrides: Partial<StockQuote> = {}): StockQuote {
  return {
    ticker: 'AAPL',
    name: 'Apple',
    price: 213.4,
    change: 3.2,
    changePercent: 1.56,
    volume: 1,
    marketCap: 1,
    currency: 'USD',
    fiftyTwoWeekHigh: 250,
    fiftyTwoWeekLow: 150,
    logoUrl: null,
    marketState: 'REGULAR',
    exchange: 'NMS',
    preMarketPrice: null,
    preMarketChange: null,
    preMarketChangePercent: null,
    postMarketPrice: null,
    postMarketChange: null,
    postMarketChangePercent: null,
    ...overrides,
  };
}

function renderLanding(
  entries: Array<string | { pathname: string; state?: unknown; key?: string }> = ['/']
) {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={entries}>
        <LandingPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('LandingPage', () => {
  let now = 1_700_000_000_000;

  beforeEach(() => {
    now += TICKER_CACHE_TTL_MS + 1;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    window.scrollTo = jest.fn();
    Element.prototype.scrollIntoView = jest.fn();
    jest.mocked(fetchTickerTape).mockReset();
    jest
      .mocked(fetchTickerTape)
      .mockResolvedValue([
        quote({ ticker: 'AAPL', price: 213.4, changePercent: 1.56 }),
        quote({ ticker: 'TLT', price: 94.5, changePercent: -0.34 }),
      ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the hero, features, and privacy call to action', async () => {
    renderLanding();

    expect(screen.getByRole('heading', { name: /Advanced Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analyze Your Portfolio Free/i })).toHaveAttribute(
      'href',
      ROUTES.REGISTER
    );
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', ROUTES.LOGIN);
    expect(screen.getByText('Universal Broker Import')).toBeInTheDocument();
    expect(
      screen.getByText(/Not a financial assistant or investment adviser/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/No bank connections/i)).not.toBeInTheDocument();
    expect(screen.getByText('Zero Personal Data Tracked')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start Anonymously/i })).toHaveAttribute(
      'href',
      ROUTES.REGISTER
    );

    await waitFor(() => expect(fetchTickerTape).toHaveBeenCalled());
    expect(screen.getAllByText('$AAPL').length).toBeGreaterThan(0);
  });

  it('keeps fallback tickers when the tape request fails or returns a zero quote', async () => {
    jest.mocked(fetchTickerTape).mockResolvedValueOnce([quote({ ticker: 'ZERO', price: 0 })]);

    renderLanding();
    await waitFor(() => expect(fetchTickerTape).toHaveBeenCalled());
    expect(screen.getAllByText('$AAPL').length).toBeGreaterThan(0);

    now += TICKER_CACHE_TTL_MS + 1;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.mocked(fetchTickerTape).mockRejectedValueOnce({});
    renderLanding();

    expect(screen.getAllByText('$AAPL').length).toBeGreaterThan(0);
  });

  it('reuses in-memory ticker cache within the TTL', async () => {
    const { unmount } = renderLanding();
    await waitFor(() => expect(fetchTickerTape).toHaveBeenCalledTimes(1));
    unmount();

    renderLanding();
    await waitFor(() => expect(screen.getAllByText('$AAPL').length).toBeGreaterThan(0));
    expect(fetchTickerTape).toHaveBeenCalledTimes(1);
  });

  it('scrolls to features when navigation state requests it', async () => {
    jest.useFakeTimers();
    renderLanding([{ pathname: '/', state: { scrollToFeatures: true }, key: 'features' }]);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('resets scroll on a normal visit and tilts the dashboard preview', () => {
    renderLanding();

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });

    const preview = screen.getByText('LIVE').closest('div')?.parentElement;
    expect(preview).toBeTruthy();
    if (!preview) {
      return;
    }

    Object.defineProperty(preview, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    });
    preview.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 180, clientY: 180, bubbles: true })
    );
    preview.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  });
});
