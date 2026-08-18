jest.mock('../../../services/fxRateService.js', () => ({
  getFxRate: jest.fn(),
  getFxRatesForRange: jest.fn(),
}));

import { getFxRateHandler, getFxRatesRangeHandler } from '../../../controllers/fxController.js';
import { getFxRate, getFxRatesForRange } from '../../../services/fxRateService.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedRate = getFxRate as jest.MockedFunction<typeof getFxRate>;
const mockedRange = getFxRatesForRange as jest.MockedFunction<typeof getFxRatesForRange>;

describe('fxController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a single FX rate', async () => {
    mockedRate.mockResolvedValue({} as never);
    const res = createMockResponse();

    await getFxRateHandler(
      createMockRequest({ query: { from: 'USD', to: 'EUR', date: '2026-01-15' } }),
      asResponse(res)
    );

    expect(mockedRate).toHaveBeenCalledWith('USD', 'EUR', '2026-01-15');
  });

  it('rejects a missing FX query', async () => {
    await expect(
      getFxRateHandler(createMockRequest({ query: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns a date range of FX rates', async () => {
    mockedRange.mockResolvedValue({} as never);
    const res = createMockResponse();

    await getFxRatesRangeHandler(
      createMockRequest({
        query: { from: 'USD', to: 'EUR', fromDate: '2026-01-01', toDate: '2026-01-15' },
      }),
      asResponse(res)
    );

    expect(mockedRange).toHaveBeenCalledWith('USD', 'EUR', '2026-01-01', '2026-01-15');
  });

  it('rejects a missing FX range query', async () => {
    await expect(
      getFxRatesRangeHandler(
        createMockRequest({ query: { from: 'USD' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
