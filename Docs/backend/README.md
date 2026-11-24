# Criterion: Backend

## Architecture Decision Record

### Status

**Status:** Accepted (layered Express API)

**Date:** 2026-08-18

### Context

Backend is a required criterion. The API must be a real server (not static JSON), with layers, ORM, errors, logs, tests, and a production URL. The product also needs an anonymous portfolio store and in-memory broker parsing.

### Decision

Node.js + Express + TypeScript. Routes → middleware → controllers → services → repositories. Drizzle ORM for `users`, `watchlist`, AI cache/quota; HMAC portfolio SQL stays explicit. pino JSON logs. OpenAPI file in Git. The API is live at `https://api.kreptonanalytics.com`.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| NestJS | Extra DI ceremony for a single service |
| Prisma | Hides SQL; fights HMAC owner_token |
| Raw `pg` only | Drizzle maps the typed tables |
| Frontend calling Yahoo | Leaks architecture; no key control |

## Implementation Details

### Project Structure

```
backend/src/
├── index.ts              # bootstrap, graceful shutdown
├── constants.ts
├── config/               # env, db pool, drizzle
├── db/schema.ts          # Drizzle tables
├── routes/
├── controllers/
├── services/             # business + Yahoo + Gemini
├── repositories/
├── middleware/           # auth, errors, request id, pino HTTP log
├── types/
├── utils/logger.ts       # pino
└── migrations/           # node-pg-migrate
```

### Key Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| Envelope `{ success, data \| error }` | Stable FE contract |
| `AppError` + last-middleware handler | Correct HTTP codes; no always-200 |
| Multer memory storage | Course rule: no broker files on disk |
| JWT cookie, not LocalStorage | XSS-resistant session |

### SOLID

| Principle | In this codebase |
|-----------|------------------|
| **S**ingle Responsibility | `errorHandler.ts` only maps errors to HTTP JSON. `tickerChatScope.ts` only decides allow vs soft-redirect. Broker column mapping lives in `brokerParsers/`, not in `importService.ts`. |
| **O**pen/Closed | A new statement layout is a mapper + parser module. `importService` stays “read buffer → preview → confirm”; it does not grow a `if (broker === …)` ladder. |
| **L**iskov | Functions and structural types. Any `NormalizedTrade[]` can go through `confirmImportedTrades`. |
| **I**nterface Segregation | Narrow DTOs in `types/*.ts` (`AddPositionDto` ≠ `PortfolioDataExport`). Services import the slice they need. |
| **D**ependency Inversion | Controllers depend on service functions, not `pg`. Services depend on repository functions, not `Request`/`Response`. HMAC SQL stays behind `portfolioRepository` (port), not in HTTP handlers. |

### Diagrams

See [architecture](../thesis/docs/02-technical/index.md).

## Files in this folder

| File | Contents |
|------|----------|
| [api-reference.md](./api-reference.md) | Endpoint summary; the full contract is `backend/openapi.yaml` |

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Modern framework | ✅ | Express |
| 2 | Database for state | ✅ | PostgreSQL |
| 3 | ORM | ✅ | Drizzle on users, watchlist, AI cache/quota; HMAC portfolio still raw SQL |
| 4 | Layered architecture | ✅ | routes / controllers / services / repositories |
| 5 | SOLID | ✅ | Table above; composition over inheritance |
| 6 | API description | ✅ | `backend/openapi.yaml` |
| 7 | Global error handling | ✅ | `errorHandler.ts` |
| 8 | Structured logging | ✅ | pino + request id |
| 9 | Production deploy | ✅ | `https://api.kreptonanalytics.com` (Azure Container Apps) |
| 10 | Unit tests ≥ 70% | ✅ | Jest `coverageThreshold` **80%** statements/lines/functions; HTML+lcov artifact in CI |
| 11 | JSON, Git, secrets in env, no custom JWT | ✅ | |
| 12 | `npm audit` | ✅ | CI job `audit` in `.github/workflows/ci.yml`. Critical advisories fail the pipeline. |
| 14 | Drizzle on remaining non-HMAC tables | ✅ | `ai_news_summaries`, `ai_usage_events`; portfolio rows stay SQL because of `owner_token` |
| 15 | Max: CD image → registry | ✅ | GHCR + Container Apps after green CI |
| 17 | Max: tracing | ✅ | `x-request-id` on each request |
| 19 | Max: deploy only if CI green | ✅ | `deploy.yml` waits on `ci.yml` via `workflow_run` |

## References

- `backend/src/index.ts`, `middleware/errorHandler.ts`, `utils/logger.ts`, `db/schema.ts`
- `backend/openapi.yaml`
