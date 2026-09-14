import request from 'supertest';
import { createApp } from '../../../app.js';
import { pool } from '../../../config/db.js';
import {
  API_ROUTES,
  HEALTH_CHECK_PATH,
  JWT_COOKIE_NAME,
  REQUEST_ID_HEADER_NAME,
} from '../../../constants.js';

const app = createApp();

afterAll(async () => {
  await pool.end();
});

describe('HTTP API integration', () => {
  it('GET /health returns ok without hitting the database', async () => {
    const response = await request(app).get(HEALTH_CHECK_PATH).expect(200);

    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
    expect(response.headers[REQUEST_ID_HEADER_NAME]).toEqual(expect.any(String));
  });

  it('GET /api/portfolio without a cookie returns 401 JSON', async () => {
    const response = await request(app).get(API_ROUTES.PORTFOLIO).expect(401);

    expect(response.body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('GET /api/portfolio with a garbage JWT cookie returns 401', async () => {
    const response = await request(app)
      .get(API_ROUTES.PORTFOLIO)
      .set('Cookie', `${JWT_COOKIE_NAME}=not-a-jwt`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(typeof response.body.error).toBe('string');
  });

  it('GET /api/stocks/search without q returns 400 without calling Yahoo', async () => {
    const response = await request(app).get(`${API_ROUTES.STOCKS}/search`).expect(400);

    expect(response.body).toEqual({
      success: false,
      error: 'Query parameter "q" is required',
    });
  });

  it('GET /api/portfolio/broker-sync/connections without a cookie returns 401', async () => {
    const response = await request(app)
      .get(`${API_ROUTES.PORTFOLIO}/broker-sync/connections`)
      .expect(401);

    expect(response.body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('POST /api/portfolio/broker-sync/connect without a cookie returns 401', async () => {
    const response = await request(app)
      .post(`${API_ROUTES.PORTFOLIO}/broker-sync/connect`)
      .send({ broker: 'TRADING212' })
      .expect(401);

    expect(response.body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('POST /api/billing/webhook without a signature returns 400', async () => {
    const response = await request(app)
      .post(`${API_ROUTES.BILLING}/webhook`)
      .set('Content-Type', 'application/json')
      .send({ event_type: 'subscription.updated' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
