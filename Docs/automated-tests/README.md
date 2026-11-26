# Criterion: Automated Tests (70%+)

## Architecture Decision Record

### Status

**Status:** Accepted. Backend and frontend coverage gates are 80% on statements, lines, and functions; the backend also gates branches at 60%.

**Date:** 2026-08-25

### Context

Six test layers run in CI:

- Jest unit and HTTP tests for backend services, controllers, and middleware (Yahoo, Gemini, and the database are mocked).
- Property-based tests (fast-check) that check invariants over generated inputs.
- A PostgreSQL integration suite that runs the migrations and exercises every repository against a real database.
- API contract tests that check live responses against `backend/openapi.yaml`.
- A load test (autocannon) that drives the real API and PostgreSQL under concurrent traffic.
- React Testing Library for frontend components and Playwright for login against Postgres.

### Decision

**Default backend suite** (`npm run test:coverage`): Jest with ts-jest, 70 suites and 451 tests (84.9% statements, 65.5% branches). Istanbul gate in `backend/jest.config.js`: statements, lines, and functions at 80% or more, branches at 60% or more. The suites under `src/__tests__/db/` and `src/__tests__/sentinel/` are excluded from this run (database and live Yahoo respectively).

**Property tests** (`src/__tests__/property/`): fast-check generates 300 cases per property. They cover:

- ticker validation against the same pattern as the database `CHECK` constraint;
- trade fingerprint stability and case-insensitivity;
- money rounding and currency conversion round-trips;
- native investment totals;
- custom rebalancing allocation weights.

**PostgreSQL integration suite** (`src/__tests__/db/`, run by `npm run test:db` with `jest.db.config.js`, 8 suites and 120 tests, repositories at 98.2% statements and 83.2% branches):

- `jest.db.globalSetup.cjs` creates the test database if it is missing and applies all `node-pg-migrate` migrations.
- Tests run serially and truncate every table between cases. The runner refuses to start unless `TEST_DATABASE_URL` is set and the database name contains `test`.
- `schemaMigrations.db.test.ts` checks that each migration is applied once, all tables exist, `CHECK` and unique constraints reject bad rows, and the `app_read`, `app_write`, and `app_admin` roles hold the intended privileges.
- The same file asserts the anonymity model: `portfolio_accounts`, `positions`, `transactions`, and `watchlist_items` have no foreign key to `users`, while AI, billing, and SnapTrade tables reference `users` and cascade on account deletion.
- One suite per repository (`user`, `portfolio`, `watchlist`, `ai`, `billing`, `snaptrade`) covers reads, writes, upserts, constraint errors, and deletes.
- `portfolioInvariants.property.db.test.ts` compares SQL aggregates with their TypeScript counterparts: `getInvestmentTotals` against `computeNativeInvestmentTotals`, and the SQL weighted-average upsert against the closed-form average.

**API contract tests** (`apiContract.db.test.ts`): the real Express app runs against the test database with Yahoo-backed services mocked. A verified user signs in through `POST /api/auth/login`, and the session cookie drives the portfolio and watchlist lifecycles. `jest-openapi` checks every response against `backend/openapi.yaml`: status code, content type, and body schema. Further checks:

- the JWT is delivered only in an `HttpOnly` cookie and never appears in a response body;
- the keys the client sends match the request bodies documented in the spec;
- one user cannot read or delete another user's positions.

**Load test** (`backend/scripts/runLoadTest.ts`, run by `npm run load:test`): starts the real Express app on an ephemeral port and seeds 1000 synthetic anonymous portfolios (5 watchlist items and 10 transactions each) into the test database. Each virtual user gets its own signed JWT cookie, so the per-user read limiter is exercised the way production traffic would exercise it. Three scenarios run for 10 seconds each:

| Scenario            | Path                              | Load                                                 |
| ------------------- | --------------------------------- | ---------------------------------------------------- |
| `health-stress`     | `GET /health`                     | 100 connections, no rate cap                         |
| `watchlist-read`    | `GET /api/portfolio/watchlist`    | 50 connections, 400 requests/s, 1000 different users |
| `transactions-read` | `GET /api/portfolio/transactions` | 50 connections, 400 requests/s, 1000 different users |

The run fails when any response is not 2xx, a request errors or times out, or p99 latency exceeds 500 ms. Request logging is switched off (`LOG_LEVEL=silent`), so the numbers cover the API and PostgreSQL. A JSON report is written to `backend/coverage/load-test/` and uploaded as the CI artifact `backend-load-test-report`. A local run on a development laptop produced:

| Scenario            | Requests | Average ms | p99 ms | Non-2xx |
| ------------------- | -------- | ---------- | ------ | ------- |
| `health-stress`     | 107,307  | 8.7        | 13     | 0       |
| `watchlist-read`    | 4,000    | 14.2       | 93     | 0       |
| `transactions-read` | 4,000    | 12.2       | 47     | 0       |

**CI run.** The `Backend (PostgreSQL integration)` job of the CI workflow runs both on every push, against a PostgreSQL 16 service container on a GitHub-hosted runner (run #64 on `develop`):

- Integration and contract suites: 8 suites and 120 tests passed, repositories at 98.23% statements and 83.15% branches.

  ![CI log of the PostgreSQL integration suite: 8 suites passed, coverage table](./screenshots/ci-db-suite.png)

- Load test on the same runner:

  | Scenario            | Requests | Average ms | p99 ms | Non-2xx | Errors |
  | ------------------- | -------- | ---------- | ------ | ------- | ------ |
  | `health-stress`     | 34,650   | 28.5       | 41     | 0       | 0      |
  | `watchlist-read`    | 4,012    | 25.4       | 164    | 0       | 0      |
  | `transactions-read` | 4,009    | 22.8       | 92     | 0       | 0      |

  ![CI log of the load test: three scenarios passed](./screenshots/ci-load-test.png)

**Faults the suites caught**

- The contract tests found seven places where `backend/openapi.yaml` disagreed with the running API, and the specification was corrected:
  - `POST /api/portfolio` documented `price`, while the API reads `avgBuyPrice`; `companyName` and `currency` were missing from the required fields.
  - `POST /api/portfolio/watchlist` documented status 200 and an optional `companyName`; the API returns 201 and requires `companyName`.
  - `AuthUser` omitted `aiPersonalDataEnabled`, which every login and `/api/auth/me` response carries.
  - The 400, 403, 404, and 409 error responses these routes return were undocumented.
  - The `/api/auth/me` success response had no description.
  - `PATCH /api/auth/ai-personal-data` was not documented at all.
  - `POST /api/portfolio/ticker-chat` still required `ticker`, described `includeHoldingContext` as off by default, and omitted `screenContext` and the response schema, although the chat is now page-aware and the profile switch decides what the server sends.
- Seeded-fault checks: deliberately breaking `portfolioRepository.ts` made two integration tests fail. Breaking trade-fingerprint casing, orphan-sell handling, and allocation rounding made three property tests fail. Each change was reverted afterwards.

**Asset-class sentinel** (`npm run test:sentinel`, `jest.sentinel.config.js`): live Yahoo checks for a fixed list of known tickers against `getStockAssetClass`. It lives under `src/__tests__/sentinel/` and is not part of the coverage gate. The separate workflow `.github/workflows/asset-class-sentinel.yml` runs it on a nightly schedule and on `workflow_dispatch`; it does not block deploy.

**Frontend**: Jest with Testing Library and engine unit tests, gated at 80% in `frontend/jest.config.cjs` (currently 135 suites / 483 tests, 86.8% statements); Playwright e2e in `frontend/e2e/`.

Coverage HTML/lcov is a **CI artifact**, not a committed folder. Husky `pre-push` and GitHub Actions both run `test:coverage` in `backend/` and `frontend/`.

### Alternatives Considered

| Alternative              | Why not                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Only Cypress later       | Component tests use Testing Library; the login flow uses Playwright                      |
| Coverage from snapshots  | Tests have to exercise the logic, not only a stored snapshot                             |
| Mocked repositories only | SQL, constraints, and migrations are part of the logic and run against a real PostgreSQL |

## How to run

```bash
# backend — fails if statements/lines/functions < 80% or branches < 60%
cd backend && npm run test:coverage
# HTML report: backend/coverage/index.html (gitignored)

# backend — PostgreSQL integration + API contract suite
# (the database is created on first run; its name must contain "test")
cd backend && TEST_DATABASE_URL=postgresql://user:password@localhost:5432/krepton_test npm run test:db
# HTML report: backend/coverage/db-integration/index.html (gitignored)

# backend — load test (needs the same TEST_DATABASE_URL, migrations already applied by test:db)
cd backend && TEST_DATABASE_URL=postgresql://user:password@localhost:5432/krepton_test npm run load:test
# JSON report: backend/coverage/load-test/load-test-report.json (gitignored)

# frontend coverage report
cd frontend && npm run test:coverage

# backend — optional live Yahoo asset-class check (not in CI coverage)
cd backend && npm run test:sentinel
```

PowerShell: `$env:TEST_DATABASE_URL = 'postgresql://user:password@localhost:5432/krepton_test'; npm run test:db`.

## Requirements Checklist

| #   | Requirement                            | Status | Evidence                                                                                                                                                                                                                                                             |
| --- | -------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Documented strategy                    | ✅     | This ADR                                                                                                                                                                                                                                                             |
| 2   | Coverage ≥ 70% + report                | ✅     | Jest threshold **80%**; CI artifacts `backend-coverage` and `backend-db-coverage`                                                                                                                                                                                    |
| 3   | Unit tests + edge cases                | ✅     | Auth, portfolio, import, AI quota/chat, controllers; property tests for validation, fingerprints, currency math, allocations                                                                                                                                         |
| 4   | Integration (API, auth, DB)            | ✅     | Jest HTTP: `/health`, 401 portfolio, 400 search (mocked). `backend-db` CI job: all migrations, every repository, and the authenticated API contract flow against a **PostgreSQL 16 service container**. Playwright CI job: migrate + `seed:demo` + login → dashboard |
| 5   | FE component and/or e2e                | ✅     | RTL: ErrorBanner, AppErrorBoundary, RequireAuth, AsyncStatePanel, Skeleton; Playwright: `frontend/e2e/login.spec.ts` (route guard + login → dashboard smoke)                                                                                                         |
| 6   | Tests in CI logs                       | ✅     | `.github/workflows/ci.yml` — `backend`, `backend-db`, `frontend`, and `e2e` jobs; CI log screenshots in [screenshots/](./screenshots/)                                                                                                                               |
| 7   | Naming / folders                       | ✅     | `*.test.ts` / `__tests__`; DB suite in `__tests__/db`, property tests in `__tests__/property`, sentinel in `__tests__/sentinel`; e2e in `frontend/e2e/*.spec.ts`                                                                                                     |
| 8   | How to run locally                     | ✅     | Commands above (including `test:sentinel`)                                                                                                                                                                                                                           |
| 9   | Max: coverage quality gate             | ✅     | Backend and frontend: statements, lines, and functions ≥ 80%; backend branches ≥ 60%                                                                                                                                                                                 |
| 10  | Max: property-based and contract tests | ✅     | `src/__tests__/property/`, `apiContract.db.test.ts`                                                                                                                                                                                                                  |
| 11  | Max: load testing                      | ✅     | `npm run load:test`; CI log screenshot above; CI artifact `backend-load-test-report`                                                                                                                                                                                 |

## References

- `backend/jest.config.js`
- `backend/jest.db.config.js`
- `backend/jest.sentinel.config.js`
- `backend/scripts/runLoadTest.ts`
- `backend/openapi.yaml`
- `.github/workflows/asset-class-sentinel.yml`
- [cicd.md](../ci-cd/README.md)
