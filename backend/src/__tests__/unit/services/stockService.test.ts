import { getStockQuote, searchStocks } from '../../../services/stockService.js';

jest.mock('axios');

describe('stockService', () => {
  describe('getStockQuote', () => {
    it('should return a valid StockQuote shape', async () => {
      // TODO: mock axios and assert response shape
      expect(true).toBe(true);
    });

    it('should throw when ticker is invalid', async () => {
      // TODO: mock axios 404 response and assert AppError thrown
      expect(true).toBe(true);
    });
  });

  describe('searchStocks', () => {
    it('should return an array of StockSearchResult', async () => {
      // TODO: mock axios search response
      expect(true).toBe(true);
    });
  });
});
