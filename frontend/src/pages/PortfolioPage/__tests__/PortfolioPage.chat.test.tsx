import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLivePollingScope } from '../../../hooks/useLivePollingScope';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import {
  loadChatScreenContext,
  savePortfolioChatScreen,
  saveTickerChatScreen,
} from '../../../utils/tickerChatSession';
import { PortfolioPage } from '../PortfolioPage';

jest.mock('../../../hooks/useLivePollingScope', () => ({
  useLivePollingScope: jest.fn(),
}));

jest.mock('../components/PositionsPanel/PositionsPanel', () => ({
  PositionsPanel: () => <div>Positions panel</div>,
}));

jest.mock('../components/WatchlistPanel/WatchlistPanel', () => ({
  WatchlistPanel: () => <div>Watchlist panel</div>,
}));

jest.mock('../components/BrokerImporterPanel/BrokerImporterPanel', () => ({
  BrokerImporterPanel: () => <div>Importer panel</div>,
}));

describe('PortfolioPage chat screen', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.mocked(useLivePollingScope).mockReset();
    Element.prototype.scrollTo = jest.fn();
  });

  it('attaches weights, the watchlist, or neither as the section changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    expect(await screen.findByText('Positions panel')).toBeInTheDocument();
    expect(loadChatScreenContext()).toEqual({ kind: 'portfolio', displayCurrency: 'USD' });

    await user.click(screen.getByRole('button', { name: 'Watchlist' }));
    expect(await screen.findByText('Watchlist panel')).toBeInTheDocument();
    expect(loadChatScreenContext()).toEqual({ kind: 'watchlist' });

    savePortfolioChatScreen('USD');
    await user.click(screen.getByRole('button', { name: 'Add holdings' }));
    expect(await screen.findByText('Importer panel')).toBeInTheDocument();
    await waitFor(() => {
      expect(loadChatScreenContext()).toBeNull();
    });
  });

  it('leaves a ticker chart snapshot when the importer opens', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    expect(await screen.findByText('Positions panel')).toBeInTheDocument();
    saveTickerChatScreen('1y');
    await user.click(screen.getByRole('button', { name: 'Add holdings' }));

    expect(await screen.findByText('Importer panel')).toBeInTheDocument();
    expect(loadChatScreenContext()).toEqual({ kind: 'ticker', period: '1y' });
  });
});
