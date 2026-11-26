import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import {
  DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY,
  DASHBOARD_MARKET_INDICES,
  DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY,
} from '../../../../../constants';
import { MarketIndicesRow } from '../MarketIndicesRow';

jest.mock('../../../../../hooks/useMarketIndexData', () => ({
  LOADING_MARKET_INDEX_DATA: { status: 'loading', quote: null, candles: [] },
  useMarketIndexData: () => ({}),
}));

jest.mock('../../MarketIndexCard/MarketIndexCard', () => ({
  MarketIndexCard: ({
    label,
    isEditing,
    onHide,
  }: {
    label: string;
    isEditing?: boolean;
    onHide?: () => void;
  }) => (
    <article>
      {label} card
      {isEditing ? (
        <button type="button" onClick={onHide}>
          Hide {label}
        </button>
      ) : null}
    </article>
  ),
}));

describe('MarketIndicesRow', () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('shows a card for every index by default', () => {
    renderWithProviders(<MarketIndicesRow />);

    expect(screen.getAllByRole('article')).toHaveLength(DASHBOARD_MARKET_INDICES.length);
    expect(screen.getByRole('region', { name: 'MARKET INDICES' })).toBeInTheDocument();
  });

  it('enters desktop edit mode from the pencil and opens the dialog from the list button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MarketIndicesRow />);

    await user.click(screen.getByRole('button', { name: 'Arrange market indices' }));

    expect(screen.getByRole('button', { name: 'Hide Dow Jones' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Choose visible market indices' }));

    const dialog = screen.getByRole('dialog', { name: 'Market indices' });
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(DASHBOARD_MARKET_INDICES.length);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides a card with the minus control in edit mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MarketIndicesRow />);

    await user.click(screen.getByRole('button', { name: 'Arrange market indices' }));
    await user.click(screen.getByRole('button', { name: 'Hide Dow Jones' }));

    expect(screen.queryByText('Dow Jones card')).not.toBeInTheDocument();
  });

  it('opens the dialog directly from the pencil on mobile', async () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as unknown as typeof window.matchMedia;

    const user = userEvent.setup();
    renderWithProviders(<MarketIndicesRow />);

    await user.click(screen.getByRole('button', { name: 'Choose visible market indices' }));
    expect(screen.getByRole('dialog', { name: 'Market indices' })).toBeInTheDocument();
  });

  it('starts with the saved choice', () => {
    localStorage.setItem(
      DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        visibleOrderedTickers: DASHBOARD_MARKET_INDICES.map((index) => index.ticker).filter(
          (ticker) => ticker !== '^GSPC'
        ),
        knownTickers: DASHBOARD_MARKET_INDICES.map((index) => index.ticker),
      })
    );

    renderWithProviders(<MarketIndicesRow />);

    expect(screen.queryByText('S&P 500 card')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(DASHBOARD_MARKET_INDICES.length - 1);
  });

  it('collapses when every card is hidden and can bring them back', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        visibleOrderedTickers: [],
        knownTickers: DASHBOARD_MARKET_INDICES.map((index) => index.ticker),
      })
    );
    renderWithProviders(<MarketIndicesRow />);

    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText('All index cards are hidden.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Arrange market indices' }));
    await user.click(screen.getByRole('button', { name: 'Choose visible market indices' }));
    await user.click(screen.getByRole('checkbox', { name: /S&P 500/ }));

    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
