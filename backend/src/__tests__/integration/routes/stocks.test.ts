// Integration tests — install supertest first: npm install -D supertest @types/supertest
// import request from 'supertest';
// import { app } from '../../../index.js';

jest.mock('../../../services/stockService.js');

describe('GET /health', () => {
  it('placeholder — replace with supertest when installed', () => {
    expect(true).toBe(true);
  });
});

describe('GET /api/stocks/search', () => {
  it('should return 400 when q is missing — TODO', () => {
    expect(true).toBe(true);
  });
});
