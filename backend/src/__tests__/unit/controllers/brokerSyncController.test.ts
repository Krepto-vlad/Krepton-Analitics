jest.mock('../../../services/brokerSyncService.js', () => ({
  parseSnaptradeBroker: jest.fn((broker: string) => broker),
  createBrokerSyncPortalUrl: jest.fn(),
  previewBrokerSyncHoldings: jest.fn(),
  confirmBrokerSyncHoldings: jest.fn(),
}));

import {
  confirmBrokerSync,
  connectBrokerSync,
  previewBrokerSync,
} from '../../../controllers/brokerSyncController.js';
import {
  confirmBrokerSyncHoldings,
  createBrokerSyncPortalUrl,
  parseSnaptradeBroker,
  previewBrokerSyncHoldings,
} from '../../../services/brokerSyncService.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedParseBroker = parseSnaptradeBroker as jest.MockedFunction<typeof parseSnaptradeBroker>;
const mockedConnect = createBrokerSyncPortalUrl as jest.MockedFunction<
  typeof createBrokerSyncPortalUrl
>;
const mockedPreview = previewBrokerSyncHoldings as jest.MockedFunction<
  typeof previewBrokerSyncHoldings
>;
const mockedConfirm = confirmBrokerSyncHoldings as jest.MockedFunction<
  typeof confirmBrokerSyncHoldings
>;

describe('brokerSyncController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParseBroker.mockImplementation((broker) => broker as never);
  });

  it('returns a Connection Portal URL', async () => {
    mockedConnect.mockResolvedValue({ redirectUrl: 'https://app.snaptrade.com/portal/abc' });
    const res = createMockResponse();

    await connectBrokerSync(createMockRequest({ body: { broker: 'TRADING212' } }), asResponse(res));

    expect(mockedConnect).toHaveBeenCalledWith('user-1', 'TRADING212');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { redirectUrl: 'https://app.snaptrade.com/portal/abc' },
    });
  });

  it('previews connected holdings', async () => {
    mockedPreview.mockResolvedValue({ importId: 'imp-1' } as never);
    const res = createMockResponse();

    await previewBrokerSync(createMockRequest(), asResponse(res));

    expect(mockedPreview).toHaveBeenCalledWith('user-1');
  });

  it('confirms a stored holdings preview', async () => {
    mockedConfirm.mockResolvedValue({ importedCount: 1 } as never);
    const res = createMockResponse();

    await confirmBrokerSync(createMockRequest({ body: { importId: ' imp-1 ' } }), asResponse(res));

    expect(mockedConfirm).toHaveBeenCalledWith('user-1', 'imp-1');
  });

  it('rejects confirm without importId', async () => {
    await expect(
      confirmBrokerSync(createMockRequest({ body: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects connect without a session user', async () => {
    await expect(
      connectBrokerSync(
        createMockRequest({ userId: undefined, body: { broker: 'TRADING212' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
