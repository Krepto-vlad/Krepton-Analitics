/**
 * Lab load test (not a production SLA).
 *
 * Starts the real Express app on an ephemeral port, seeds synthetic anonymous
 * portfolios into the test database, and drives three scenarios with autocannon:
 *   1. /health under 100 concurrent connections, no rate cap (stress)
 *   2. GET /api/portfolio/watchlist for many different users (database read)
 *   3. GET /api/portfolio/transactions for many different users (database read)
 *
 * The run fails (exit code 1) when a scenario returns any non-2xx response or its
 * p99 latency exceeds MAX_P99_LATENCY_MS. A JSON report is written to coverage/load-test/.
 *
 * Request logging is switched off (LOG_LEVEL=silent), so the numbers cover the API and
 * PostgreSQL, not the log sink.
 *
 * Usage (from backend/): TEST_DATABASE_URL=... npm run load:test
 * The database name must contain "test" and migrations must already be applied
 * (npm run test:db applies them).
 */

import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import autocannon from 'autocannon';
import {
  EPHEMERAL_PORT,
  LOAD_TEST_CONNECTIONS,
  LOAD_TEST_DURATION_SECONDS,
  LOAD_TEST_REQUESTS_PER_SECOND,
  LOAD_TEST_VIRTUAL_USER_COUNT,
  LOCAL_LISTEN_HOST,
  MAX_NON_SUCCESS_RESPONSES,
  MAX_P99_LATENCY_MS,
  REPORT_DIRECTORY,
  REPORT_FILENAME,
  SEED_BATCH_SIZE,
  SEED_TRANSACTIONS_PER_USER,
  SEED_TRANSACTION_COMPANY_NAME,
  SEED_TRANSACTION_CURRENCY,
  SEED_TRANSACTION_PRICE,
  SEED_TRANSACTION_SHARES,
  SEED_TRANSACTION_SOURCE,
  SEED_TRANSACTION_TICKER,
  SEED_TRANSACTION_TYPE,
  SEED_WATCHLIST_COMPANY_PREFIX,
  SEED_WATCHLIST_ITEMS_PER_USER,
  SEED_WATCHLIST_TICKER_PREFIX,
  STRESS_TEST_CONNECTIONS,
  TARGET_PATHS,
} from './loadTestConstants.js';

interface TestDatabaseSettings {
  readTestDatabaseUrl: () => { databaseUrl: string; databaseName: string };
}

interface ScenarioDefinition {
  name: string;
  path: string;
  connections: number;
  isAuthenticated: boolean;
  requestsPerSecond?: number;
}

interface ScenarioReport {
  name: string;
  path: string;
  connections: number;
  totalRequests: number;
  requestsPerSecondAverage: number;
  latencyAverageMs: number;
  latencyP50Ms: number;
  latencyP99Ms: number;
  latencyMaxMs: number;
  successfulResponses: number;
  nonSuccessResponses: number;
  errors: number;
  timeouts: number;
  passed: boolean;
}

const SCENARIOS: ScenarioDefinition[] = [
  {
    name: 'health-stress',
    path: TARGET_PATHS.HEALTH,
    connections: STRESS_TEST_CONNECTIONS,
    isAuthenticated: false,
  },
  {
    name: 'watchlist-read',
    path: TARGET_PATHS.WATCHLIST,
    connections: LOAD_TEST_CONNECTIONS,
    isAuthenticated: true,
    requestsPerSecond: LOAD_TEST_REQUESTS_PER_SECOND,
  },
  {
    name: 'transactions-read',
    path: TARGET_PATHS.TRANSACTIONS,
    connections: LOAD_TEST_CONNECTIONS,
    isAuthenticated: true,
    requestsPerSecond: LOAD_TEST_REQUESTS_PER_SECOND,
  },
];

function readTestDatabaseSettings(): TestDatabaseSettings {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../jest.db.testDatabase.cjs') as TestDatabaseSettings;
}

function buildStatusReport(
  result: autocannon.Result,
  scenario: ScenarioDefinition
): ScenarioReport {
  const nonSuccessResponses = result.non2xx;
  const passed =
    nonSuccessResponses <= MAX_NON_SUCCESS_RESPONSES &&
    result.errors === 0 &&
    result.timeouts === 0 &&
    result.latency.p99 <= MAX_P99_LATENCY_MS;

  return {
    name: scenario.name,
    path: scenario.path,
    connections: scenario.connections,
    totalRequests: result.requests.total,
    requestsPerSecondAverage: result.requests.average,
    latencyAverageMs: result.latency.average,
    latencyP50Ms: result.latency.p50,
    latencyP99Ms: result.latency.p99,
    latencyMaxMs: result.latency.max,
    successfulResponses: result['2xx'],
    nonSuccessResponses,
    errors: result.errors,
    timeouts: result.timeouts,
    passed,
  };
}

async function seedVirtualUsers(userIds: string[]): Promise<void> {
  const { pool } = await import('../src/config/db.js');
  const { findOrCreatePortfolioAccount } =
    await import('../src/repositories/portfolioRepository.js');
  const { computePortfolioOwnerToken } = await import('../src/utils/portfolioOwnerToken.js');

  await pool.query('TRUNCATE watchlist_items, transactions, positions, portfolio_accounts CASCADE');

  for (let batchStart = 0; batchStart < userIds.length; batchStart += SEED_BATCH_SIZE) {
    const batch = userIds.slice(batchStart, batchStart + SEED_BATCH_SIZE);
    await Promise.all(
      batch.map(async (userId) => {
        const portfolioId = await findOrCreatePortfolioAccount(computePortfolioOwnerToken(userId));
        await pool.query(
          `INSERT INTO watchlist_items (portfolio_id, ticker, company_name)
           SELECT $1, $2 || series.value, $3 || series.value
           FROM generate_series(1, $4::int) AS series(value)`,
          [
            portfolioId,
            SEED_WATCHLIST_TICKER_PREFIX,
            SEED_WATCHLIST_COMPANY_PREFIX,
            SEED_WATCHLIST_ITEMS_PER_USER,
          ]
        );
        await pool.query(
          `INSERT INTO transactions
             (portfolio_id, ticker, company_name, shares, price_per_share, currency,
              transaction_date, transaction_type, source)
           SELECT $1, $2, $3, $4, $5, $6, CURRENT_DATE - series.value, $7, $8
           FROM generate_series(1, $9::int) AS series(value)`,
          [
            portfolioId,
            SEED_TRANSACTION_TICKER,
            SEED_TRANSACTION_COMPANY_NAME,
            SEED_TRANSACTION_SHARES,
            SEED_TRANSACTION_PRICE,
            SEED_TRANSACTION_CURRENCY,
            SEED_TRANSACTION_TYPE,
            SEED_TRANSACTION_SOURCE,
            SEED_TRANSACTIONS_PER_USER,
          ]
        );
      })
    );
  }
}

function runScenario(
  baseUrl: string,
  scenario: ScenarioDefinition,
  sessionCookies: string[]
): Promise<autocannon.Result> {
  let nextCookieIndex = 0;

  return autocannon({
    url: `${baseUrl}${scenario.path}`,
    connections: scenario.connections,
    duration: LOAD_TEST_DURATION_SECONDS,
    overallRate: scenario.requestsPerSecond,
    requests: [
      {
        method: 'GET',
        setupRequest: (request) => {
          if (!scenario.isAuthenticated) {
            return request;
          }
          const cookie = sessionCookies[nextCookieIndex % sessionCookies.length];
          nextCookieIndex += 1;
          return { ...request, headers: { ...request.headers, cookie } };
        },
      },
    ],
  });
}

function printReport(reports: ScenarioReport[]): void {
  console.table(
    reports.map((report) => ({
      scenario: report.name,
      connections: report.connections,
      requests: report.totalRequests,
      rps: Math.round(report.requestsPerSecondAverage),
      'avg ms': report.latencyAverageMs,
      'p50 ms': report.latencyP50Ms,
      'p99 ms': report.latencyP99Ms,
      'max ms': report.latencyMaxMs,
      '2xx': report.successfulResponses,
      'non-2xx': report.nonSuccessResponses,
      errors: report.errors,
      passed: report.passed,
    }))
  );
}

function writeReport(reports: ScenarioReport[]): string {
  const reportDirectory = path.resolve(__dirname, '..', REPORT_DIRECTORY);
  mkdirSync(reportDirectory, { recursive: true });
  const reportPath = path.join(reportDirectory, REPORT_FILENAME);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        durationSecondsPerScenario: LOAD_TEST_DURATION_SECONDS,
        maxP99LatencyMs: MAX_P99_LATENCY_MS,
        scenarios: reports,
      },
      null,
      2
    )
  );
  return reportPath;
}

async function main(): Promise<void> {
  const { databaseUrl } = readTestDatabaseSettings().readTestDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;
  process.env.LOG_LEVEL = 'silent';

  const { createApp } = await import('../src/app.js');
  const { signAccessToken } = await import('../src/services/authService.js');
  const { JWT_COOKIE_NAME } = await import('../src/constants.js');
  const { pool } = await import('../src/config/db.js');

  const userIds = Array.from({ length: LOAD_TEST_VIRTUAL_USER_COUNT }, () => randomUUID());
  const sessionCookies = userIds.map((userId) => `${JWT_COOKIE_NAME}=${signAccessToken(userId)}`);
  await seedVirtualUsers(userIds);

  const server = createApp().listen(EPHEMERAL_PORT, LOCAL_LISTEN_HOST);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const baseUrl = `http://${LOCAL_LISTEN_HOST}:${(server.address() as AddressInfo).port}`;

  const reports: ScenarioReport[] = [];
  try {
    for (const scenario of SCENARIOS) {
      const result = await runScenario(baseUrl, scenario, sessionCookies);
      reports.push(buildStatusReport(result, scenario));
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }

  printReport(reports);
  console.log(`Report written to ${writeReport(reports)}`);
  process.exitCode = reports.every((report) => report.passed) ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
