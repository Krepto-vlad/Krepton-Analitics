import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  disconnectBrokerSyncConnection,
  fetchBrokerSyncConnections,
} from '../../../api/brokerSyncApi';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { BrokerConnectionsList } from '../BrokerConnectionsList';

jest.mock('../../../api/brokerSyncApi', () => ({
  fetchBrokerSyncConnections: jest.fn(),
  disconnectBrokerSyncConnection: jest.fn(),
}));

const CONNECTION_ID = '87b24961-b51e-4db8-9226-f198f6518a89';

describe('BrokerConnectionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an empty state when no brokerage is connected', async () => {
    jest.mocked(fetchBrokerSyncConnections).mockResolvedValue([]);

    renderWithProviders(<BrokerConnectionsList />);

    expect(await screen.findByText('No brokerage connected.')).toBeInTheDocument();
  });

  it('disconnects a listed brokerage after confirmation', async () => {
    jest.mocked(fetchBrokerSyncConnections).mockResolvedValueOnce([
      {
        id: CONNECTION_ID,
        brokerageName: 'Trading 212',
        brokerageSlug: 'TRADING212',
        logoUrl: null,
        connectedAt: '2026-01-12T00:00:00.000Z',
        disabled: false,
        accessType: 'read',
      },
    ]);
    jest.mocked(fetchBrokerSyncConnections).mockResolvedValueOnce([]);
    jest.mocked(disconnectBrokerSyncConnection).mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<BrokerConnectionsList />);

    expect(await screen.findByText('Trading 212')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    await user.click(screen.getByRole('button', { name: 'Confirm disconnect' }));

    expect(disconnectBrokerSyncConnection).toHaveBeenCalledWith(CONNECTION_ID);
    expect(await screen.findByText('No brokerage connected.')).toBeInTheDocument();
  });
});
