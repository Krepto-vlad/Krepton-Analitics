jest.mock('../../../services/watchlistService.js', () => ({
  getUserWatchlist: jest.fn(),
  addWatchlistItem: jest.fn(),
  removeWatchlistItem: jest.fn(),
}));

import {
  deleteWatchlistItemHandler,
  getWatchlist,
  postWatchlistItem,
} from '../../../controllers/watchlistController.js';
import {
  addWatchlistItem,
  getUserWatchlist,
  removeWatchlistItem,
} from '../../../services/watchlistService.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedGet = getUserWatchlist as jest.MockedFunction<typeof getUserWatchlist>;
const mockedAdd = addWatchlistItem as jest.MockedFunction<typeof addWatchlistItem>;
const mockedRemove = removeWatchlistItem as jest.MockedFunction<typeof removeWatchlistItem>;

describe('watchlistController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists, adds and deletes watchlist items', async () => {
    mockedGet.mockResolvedValue([]);
    mockedAdd.mockResolvedValue({
      id: 'wl-1',
      ticker: 'AAPL',
      companyName: 'Apple',
      createdAt: '',
    });
    mockedRemove.mockResolvedValue(undefined);
    const res = createMockResponse();

    await getWatchlist(createMockRequest(), asResponse(res));
    await postWatchlistItem(createMockRequest({ body: { ticker: 'AAPL' } }), asResponse(res));
    await deleteWatchlistItemHandler(
      createMockRequest({ params: { itemId: 'wl-1' } }),
      asResponse(res)
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('rejects requests without a user id', async () => {
    await expect(
      getWatchlist(createMockRequest({ userId: undefined }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
