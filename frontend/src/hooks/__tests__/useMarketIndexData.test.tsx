import { act, renderHook, waitFor } from '@testing-library/react';
import { fetchStockHistory, fetchStockQuotesBatch } from '../../api/stockApi';
import { DASHBOARD_INDEX_REFRESH_INTERVAL_MS } from '../../constants';
import type { StockHistoryResponse, StockQuote } from '../../types/stock.types';
import { useMarketIndexData } from '../useMarketIndexData';

jest.mock('../../api/stockApi', () => ({
  fetchStockQuotesBatch: jest.fn(),
  fetchStockHistory: jest.fn(),
}));

const candle = { time: 1, open: 1, high: 2, low: 1, close: 2, volume: 10 };

function quote(ticker: string, price: number): StockQuote {
  return { ticker, price, changePercent: 0.5 } as StockQuote;
}

function history(ticker: string): StockHistoryResponse {
  return { ticker, interval: '1d', candles: [candle] };
}

describe('useMarketIndexData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads quotes and closes for each requested index', async () => {
    jest
      .mocked(fetchStockQuotesBatch)
      .mockResolvedValue([quote('^GSPC', 7000), quote('^DJI', 50000)]);
    jest.mocked(fetchStockHistory).mockImplementation(async (ticker) => history(ticker));

    const { result } = renderHook(() => useMarketIndexData(['^GSPC', '^DJI']));

    await waitFor(() => expect(result.current['^GSPC']?.status).toBe('ready'));
    expect(result.current['^GSPC'].quote?.price).toBe(7000);
    expect(result.current['^DJI'].candles).toEqual([candle]);
  });

  it('marks an index as failed only when both quote and history are missing', async () => {
    jest.mocked(fetchStockQuotesBatch).mockResolvedValue([quote('^GSPC', 7000)]);
    jest.mocked(fetchStockHistory).mockRejectedValue(new Error('history down'));

    const { result } = renderHook(() => useMarketIndexData(['^GSPC', '^DJI']));

    await waitFor(() => expect(result.current['^DJI']?.status).toBe('error'));
    expect(result.current['^GSPC'].status).toBe('ready');
    expect(result.current['^GSPC'].candles).toEqual([]);
  });

  it('fails every index when both requests fail', async () => {
    jest.mocked(fetchStockQuotesBatch).mockRejectedValue(new Error('quotes down'));
    jest.mocked(fetchStockHistory).mockRejectedValue(new Error('history down'));

    const { result } = renderHook(() => useMarketIndexData(['^GSPC']));

    await waitFor(() => expect(result.current['^GSPC']?.status).toBe('error'));
  });

  it('requests nothing when no index is shown', () => {
    renderHook(() => useMarketIndexData([]));

    expect(fetchStockQuotesBatch).not.toHaveBeenCalled();
    expect(fetchStockHistory).not.toHaveBeenCalled();
  });

  it('refreshes on an interval and keeps showing the last data meanwhile', async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(fetchStockQuotesBatch).mockResolvedValue([quote('^GSPC', 7000)]);
      jest.mocked(fetchStockHistory).mockImplementation(async (ticker) => history(ticker));

      const { result, unmount } = renderHook(() => useMarketIndexData(['^GSPC']));
      await act(async () => undefined);
      expect(result.current['^GSPC'].quote?.price).toBe(7000);

      jest.mocked(fetchStockQuotesBatch).mockResolvedValue([quote('^GSPC', 7100)]);
      await act(async () => {
        jest.advanceTimersByTime(DASHBOARD_INDEX_REFRESH_INTERVAL_MS);
      });

      expect(result.current['^GSPC'].quote?.price).toBe(7100);
      unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});
