jest.mock('../../services/quoteCacheService.js', () => ({
  getCachedStockQuotes: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../services/stockService.js', () => ({
  getStockSector: jest.fn().mockResolvedValue({ sector: 'Technology' }),
  getStockHistory: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../services/geminiClient.js', () => ({
  generateTickerChatReplyWithGemini: jest.fn().mockResolvedValue({
    reply: 'This screen shows an overview of your watchlist.',
    groundingEnabled: false,
  }),
}));

import bcrypt from 'bcrypt';
import jestOpenAPI from 'jest-openapi';
import request from 'supertest';
import { createApp } from '../../app.js';
import { API_ROUTES, HEALTH_CHECK_PATH, JWT_COOKIE_NAME } from '../../constants.js';
import { createPasswordUser, markEmailVerified } from '../../repositories/userRepository.js';
import { signAccessToken } from '../../services/authService.js';
import {
  CONTRACT_TEST_BCRYPT_ROUNDS,
  CONTRACT_TEST_PASSWORD,
  MILLISECONDS_PER_HOUR,
  TEST_COMPANY_NAME,
  TEST_USD,
} from './helpers/dbTestConstants.js';
import { findRequestBodyDrift, OPENAPI_SPEC_PATH } from './helpers/openapiContract.js';
import {
  buildUniqueEmail,
  closeTestDatabasePool,
  hashLabel,
  truncateAllTables,
} from './helpers/testDatabase.js';

jestOpenAPI(OPENAPI_SPEC_PATH);

const app = createApp();

const LOGIN_PATH = `${API_ROUTES.AUTH}/login`;
const LOGOUT_PATH = `${API_ROUTES.AUTH}/logout`;
const ME_PATH = `${API_ROUTES.AUTH}/me`;
const AI_PERSONAL_DATA_PATH = `${API_ROUTES.AUTH}/ai-personal-data`;
const TICKER_CHAT_PATH = `${API_ROUTES.PORTFOLIO}/ticker-chat`;
const PAGE_CHAT_MESSAGE = 'What does this screen show?';
const POSITIONS_PATH = API_ROUTES.PORTFOLIO;
const TRANSACTIONS_PATH = `${API_ROUTES.PORTFOLIO}/transactions`;
const INVESTMENT_SUMMARY_PATH = `${API_ROUTES.PORTFOLIO}/investment-summary`;
const WATCHLIST_PATH = `${API_ROUTES.PORTFOLIO}/watchlist`;
const UNKNOWN_ENTITY_ID = '00000000-0000-4000-8000-000000000000';
const POSITION_TICKER = 'AAPL';
const WATCHLIST_TICKER = 'MSFT';
const WATCHLIST_COMPANY_NAME = 'Microsoft Corporation';
const POSITION_SHARES = 4;
const POSITION_PRICE = 125.5;
const INVALID_SHARES = -1;
const SESSION_COOKIE_HTTP_ONLY_FLAG = 'HttpOnly';
/** Names of response fields that would leak credentials (hasPassword is a harmless boolean flag). */
const SECRET_FIELD_PATTERN = /"(password|passwordHash|password_hash|accessToken|token)"/i;
const LOGIN_REQUEST_BODY = { email: 'user@example.com', password: CONTRACT_TEST_PASSWORD };

const POSITION_REQUEST_BODY = {
  ticker: POSITION_TICKER,
  companyName: TEST_COMPANY_NAME,
  shares: POSITION_SHARES,
  avgBuyPrice: POSITION_PRICE,
  currency: TEST_USD,
};

const WATCHLIST_REQUEST_BODY = {
  ticker: WATCHLIST_TICKER,
  companyName: WATCHLIST_COMPANY_NAME,
};

async function createUnverifiedUser(email: string): Promise<string> {
  const passwordHash = await bcrypt.hash(CONTRACT_TEST_PASSWORD, CONTRACT_TEST_BCRYPT_ROUNDS);
  const user = await createPasswordUser(
    email,
    passwordHash,
    hashLabel(`verify:${email}`),
    new Date(Date.now() + MILLISECONDS_PER_HOUR)
  );
  return user.id;
}

async function createVerifiedUser(email: string): Promise<string> {
  const userId = await createUnverifiedUser(email);
  await markEmailVerified(userId);
  return userId;
}

describe('API contract (responses validated against openapi.yaml, real PostgreSQL)', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closeTestDatabasePool();
  });

  describe('public endpoints', () => {
    it('GET /health matches the documented response', async () => {
      const response = await request(app).get(HEALTH_CHECK_PATH);

      expect(response.status).toBe(200);
      expect(response).toSatisfyApiSpec();
    });

    it('rejects an unauthenticated portfolio request with the documented error envelope', async () => {
      const response = await request(app).get(POSITIONS_PATH);

      expect(response.status).toBe(401);
      expect(response).toSatisfyApiSpec();
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns the documented error for a missing body', async () => {
      const response = await request(app).post(LOGIN_PATH).send({});

      expect(response.status).toBe(400);
      expect(response).toSatisfyApiSpec();
    });

    it('returns the documented error for a wrong password', async () => {
      const email = buildUniqueEmail();
      await createVerifiedUser(email);

      const response = await request(app)
        .post(LOGIN_PATH)
        .send({ email, password: `${CONTRACT_TEST_PASSWORD}-wrong` });

      expect(response.status).toBe(401);
      expect(response).toSatisfyApiSpec();
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('refuses sign-in before the email is verified', async () => {
      const email = buildUniqueEmail();
      await createUnverifiedUser(email);

      const response = await request(app)
        .post(LOGIN_PATH)
        .send({ email, password: CONTRACT_TEST_PASSWORD });

      expect(response.status).toBe(403);
      expect(response).toSatisfyApiSpec();
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('returns the documented profile and delivers the JWT only in an HttpOnly cookie', async () => {
      const email = buildUniqueEmail();
      await createVerifiedUser(email);

      const response = await request(app)
        .post(LOGIN_PATH)
        .send({ email, password: CONTRACT_TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response).toSatisfyApiSpec();
      expect(response.body.data.email).toBe(email);

      const sessionCookie = (response.headers['set-cookie'] as unknown as string[]).find((cookie) =>
        cookie.startsWith(`${JWT_COOKIE_NAME}=`)
      );
      expect(sessionCookie).toContain(SESSION_COOKIE_HTTP_ONLY_FLAG);

      const serializedBody = JSON.stringify(response.body);
      expect(serializedBody).not.toMatch(SECRET_FIELD_PATTERN);
      expect(serializedBody).not.toContain(sessionCookie!.split(';')[0].split('=')[1]);
    });
  });

  describe('authenticated session', () => {
    /** Real login; the auth limiter allows only 10 per window, so most tests use a signed session. */
    async function loginAgent(): Promise<ReturnType<typeof request.agent>> {
      const email = buildUniqueEmail();
      await createVerifiedUser(email);
      const agent = request.agent(app);
      const loginResponse = await agent
        .post(LOGIN_PATH)
        .send({ email, password: CONTRACT_TEST_PASSWORD });
      expect(loginResponse.status).toBe(200);
      return agent;
    }

    async function signInAgent(): Promise<ReturnType<typeof request.agent>> {
      const userId = await createVerifiedUser(buildUniqueEmail());
      return request.agent(app).set('Cookie', `${JWT_COOKIE_NAME}=${signAccessToken(userId)}`);
    }

    it('serves the current user and clears the session on logout', async () => {
      const agent = await loginAgent();

      const meResponse = await agent.get(ME_PATH);
      expect(meResponse.status).toBe(200);
      expect(meResponse).toSatisfyApiSpec();

      const logoutResponse = await agent.post(LOGOUT_PATH);
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse).toSatisfyApiSpec();

      const afterLogoutResponse = await agent.get(ME_PATH);
      expect(afterLogoutResponse.status).toBe(401);
      expect(afterLogoutResponse).toSatisfyApiSpec();
    });

    it('stores the AI personal data switch on the profile', async () => {
      const agent = await signInAgent();

      const disableResponse = await agent.patch(AI_PERSONAL_DATA_PATH).send({ enabled: false });
      expect(disableResponse.status).toBe(200);
      expect(disableResponse).toSatisfyApiSpec();
      expect(disableResponse.body.data.aiPersonalDataEnabled).toBe(false);

      const meResponse = await agent.get(ME_PATH);
      expect(meResponse.body.data.aiPersonalDataEnabled).toBe(false);

      const invalidResponse = await agent.patch(AI_PERSONAL_DATA_PATH).send({ enabled: 'yes' });
      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse).toSatisfyApiSpec();

      const unauthenticatedResponse = await request(app)
        .patch(AI_PERSONAL_DATA_PATH)
        .send({ enabled: true });
      expect(unauthenticatedResponse.status).toBe(401);
      expect(unauthenticatedResponse).toSatisfyApiSpec();
    });

    it('answers a page chat without a ticker with the documented payload', async () => {
      const agent = await signInAgent();

      const chatResponse = await agent.post(TICKER_CHAT_PATH).send({ message: PAGE_CHAT_MESSAGE });
      expect(chatResponse.status).toBe(200);
      expect(chatResponse).toSatisfyApiSpec();
      expect(chatResponse.body.data.ticker).toBe('');
      expect(chatResponse.body.data.disclaimer).toBeTruthy();

      const emptyMessageResponse = await agent.post(TICKER_CHAT_PATH).send({ message: '   ' });
      expect(emptyMessageResponse.status).toBe(400);
      expect(emptyMessageResponse).toSatisfyApiSpec();
    });

    it('sends request bodies that match the documented schemas', () => {
      expect(findRequestBodyDrift(POSITIONS_PATH, 'post', POSITION_REQUEST_BODY)).toEqual({
        missingRequiredFields: [],
        undocumentedFields: [],
      });
      expect(findRequestBodyDrift(WATCHLIST_PATH, 'post', WATCHLIST_REQUEST_BODY)).toEqual({
        missingRequiredFields: [],
        undocumentedFields: [],
      });
      expect(findRequestBodyDrift(LOGIN_PATH, 'post', LOGIN_REQUEST_BODY)).toEqual({
        missingRequiredFields: [],
        undocumentedFields: [],
      });
      expect(findRequestBodyDrift(AI_PERSONAL_DATA_PATH, 'patch', { enabled: true })).toEqual({
        missingRequiredFields: [],
        undocumentedFields: [],
      });
      expect(
        findRequestBodyDrift(TICKER_CHAT_PATH, 'post', {
          message: PAGE_CHAT_MESSAGE,
          history: [],
          includeHoldingContext: true,
          screenContext: {},
        })
      ).toEqual({ missingRequiredFields: [], undocumentedFields: [] });
    });

    it('runs the portfolio lifecycle with every response matching the spec', async () => {
      const agent = await signInAgent();

      const invalidCreateResponse = await agent
        .post(POSITIONS_PATH)
        .send({ ...POSITION_REQUEST_BODY, shares: INVALID_SHARES });
      expect(invalidCreateResponse.status).toBe(400);
      expect(invalidCreateResponse).toSatisfyApiSpec();

      const createResponse = await agent.post(POSITIONS_PATH).send(POSITION_REQUEST_BODY);
      expect(createResponse.status).toBe(201);
      expect(createResponse).toSatisfyApiSpec();
      expect(createResponse.body.data).toMatchObject({
        ticker: POSITION_TICKER,
        shares: POSITION_SHARES,
        avgBuyPrice: POSITION_PRICE,
        currency: TEST_USD,
      });
      const positionId = createResponse.body.data.id as string;

      const listResponse = await agent.get(POSITIONS_PATH);
      expect(listResponse.status).toBe(200);
      expect(listResponse).toSatisfyApiSpec();
      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].id).toBe(positionId);

      const transactionsResponse = await agent.get(TRANSACTIONS_PATH);
      expect(transactionsResponse.status).toBe(200);
      expect(transactionsResponse).toSatisfyApiSpec();

      const summaryResponse = await agent.get(INVESTMENT_SUMMARY_PATH);
      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse).toSatisfyApiSpec();

      const deleteResponse = await agent.delete(`${POSITIONS_PATH}/${positionId}`);
      expect(deleteResponse.status).toBe(204);
      expect(deleteResponse).toSatisfyApiSpec();

      const repeatedDeleteResponse = await agent.delete(`${POSITIONS_PATH}/${positionId}`);
      expect(repeatedDeleteResponse.status).toBe(404);
      expect(repeatedDeleteResponse).toSatisfyApiSpec();

      const emptyListResponse = await agent.get(POSITIONS_PATH);
      expect(emptyListResponse.body.data).toHaveLength(0);
    });

    it('runs the watchlist lifecycle with every response matching the spec', async () => {
      const agent = await signInAgent();

      const createResponse = await agent.post(WATCHLIST_PATH).send(WATCHLIST_REQUEST_BODY);
      expect(createResponse.status).toBe(201);
      expect(createResponse).toSatisfyApiSpec();
      const itemId = createResponse.body.data.id as string;

      const duplicateResponse = await agent.post(WATCHLIST_PATH).send(WATCHLIST_REQUEST_BODY);
      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse).toSatisfyApiSpec();

      const invalidResponse = await agent.post(WATCHLIST_PATH).send({ ticker: WATCHLIST_TICKER });
      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse).toSatisfyApiSpec();

      const listResponse = await agent.get(WATCHLIST_PATH);
      expect(listResponse.status).toBe(200);
      expect(listResponse).toSatisfyApiSpec();
      expect(listResponse.body.data).toHaveLength(1);

      const deleteResponse = await agent.delete(`${WATCHLIST_PATH}/${itemId}`);
      expect(deleteResponse.status).toBe(204);
      expect(deleteResponse).toSatisfyApiSpec();
    });

    it("never exposes another user's portfolio", async () => {
      const firstAgent = await signInAgent();
      const secondAgent = await signInAgent();

      const createResponse = await firstAgent.post(POSITIONS_PATH).send(POSITION_REQUEST_BODY);
      const positionId = createResponse.body.data.id as string;

      const secondUserList = await secondAgent.get(POSITIONS_PATH);
      expect(secondUserList.body.data).toHaveLength(0);

      const foreignDeleteResponse = await secondAgent.delete(`${POSITIONS_PATH}/${positionId}`);
      expect(foreignDeleteResponse.status).toBe(404);

      const unknownDeleteResponse = await secondAgent.delete(
        `${POSITIONS_PATH}/${UNKNOWN_ENTITY_ID}`
      );
      expect(unknownDeleteResponse.status).toBe(404);

      const firstUserList = await firstAgent.get(POSITIONS_PATH);
      expect(firstUserList.body.data).toHaveLength(1);
    });
  });
});
