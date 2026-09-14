jest.mock('../../../config/env.js', () => ({
  env: {
    frontendUrl: 'http://localhost:5173',
  },
  isSnaptradeConfigured: true,
}));

jest.mock('../../../services/snaptradeClient.js', () => ({
  requireSnaptradeClient: jest.fn(),
  rethrowSnaptradeFailure: jest.fn((error: unknown) => {
    throw error;
  }),
}));

jest.mock('../../../repositories/snaptradeRepository.js', () => ({
  findSnaptradeUserByUserId: jest.fn(),
}));

jest.mock('../../../services/snaptradeUserLifecycle.js', () => ({
  deleteRemoteSnaptradeUserIfPresent: jest.fn(),
}));

import { SNAPTRADE_INVALID_CONNECTION_ID_MESSAGE } from '../../../constants.js';
import { findSnaptradeUserByUserId } from '../../../repositories/snaptradeRepository.js';
import { requireSnaptradeClient } from '../../../services/snaptradeClient.js';
import { deleteRemoteSnaptradeUserIfPresent } from '../../../services/snaptradeUserLifecycle.js';
import {
  disconnectBrokerSyncConnection,
  listBrokerSyncConnections,
  parseSnaptradeAuthorizationId,
} from '../../../services/snaptradeConnectionsService.js';

const mockedFindSnaptradeUser = findSnaptradeUserByUserId as jest.MockedFunction<
  typeof findSnaptradeUserByUserId
>;
const mockedRequireClient = requireSnaptradeClient as jest.MockedFunction<
  typeof requireSnaptradeClient
>;
const mockedDeleteRemoteUser = deleteRemoteSnaptradeUserIfPresent as jest.MockedFunction<
  typeof deleteRemoteSnaptradeUserIfPresent
>;

const CONNECTION_ID = '87b24961-b51e-4db8-9226-f198f6518a89';

function snaptradeUser() {
  return {
    user_id: 'user-1',
    snaptrade_user_id: 'user-1',
    user_secret: 'secret-1',
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe('snaptradeConnectionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects malformed connection ids', () => {
    expect(() => parseSnaptradeAuthorizationId('not-a-uuid')).toThrow(
      expect.objectContaining({
        statusCode: 400,
        message: SNAPTRADE_INVALID_CONNECTION_ID_MESSAGE,
      })
    );
    expect(parseSnaptradeAuthorizationId(` ${CONNECTION_ID} `)).toBe(CONNECTION_ID);
  });

  it('returns an empty list when the user has never connected SnapTrade', async () => {
    mockedFindSnaptradeUser.mockResolvedValue(null);

    await expect(listBrokerSyncConnections('user-1')).resolves.toEqual([]);
    expect(mockedRequireClient).not.toHaveBeenCalled();
  });

  it('maps SnapTrade authorizations without leaking account identifiers', async () => {
    mockedFindSnaptradeUser.mockResolvedValue(snaptradeUser());
    mockedRequireClient.mockReturnValue({
      connections: {
        listBrokerageAuthorizations: jest.fn().mockResolvedValue({
          data: [
            {
              id: CONNECTION_ID,
              created_date: '2026-01-12T00:00:00.000Z',
              type: 'read',
              disabled: false,
              meta: { identifier: 123456 },
              brokerage: {
                slug: 'TRADING212',
                display_name: 'Trading 212',
                aws_s3_square_logo_url: 'https://example.com/t212.png',
              },
            },
          ],
        }),
      },
    } as never);

    await expect(listBrokerSyncConnections('user-1')).resolves.toEqual([
      {
        id: CONNECTION_ID,
        brokerageName: 'Trading 212',
        brokerageSlug: 'TRADING212',
        logoUrl: 'https://example.com/t212.png',
        connectedAt: '2026-01-12T00:00:00.000Z',
        disabled: false,
        accessType: 'read',
      },
    ]);
  });

  it('deletes the SnapTrade user after the last connection is removed', async () => {
    mockedFindSnaptradeUser.mockResolvedValue(snaptradeUser());
    const deleteConnection = jest.fn().mockResolvedValue({ data: undefined });
    const listBrokerageAuthorizations = jest.fn().mockResolvedValue({ data: [] });
    mockedRequireClient.mockReturnValue({
      connections: {
        deleteConnection,
        listBrokerageAuthorizations,
      },
    } as never);

    await disconnectBrokerSyncConnection('user-1', CONNECTION_ID);

    expect(deleteConnection).toHaveBeenCalledWith({
      connectionId: CONNECTION_ID,
      userId: 'user-1',
      userSecret: 'secret-1',
    });
    expect(mockedDeleteRemoteUser).toHaveBeenCalledWith('user-1');
  });
});
