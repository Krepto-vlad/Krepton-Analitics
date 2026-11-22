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
| Raw `pg` only | Does not satisfy named ORM requirement |
| Frontend calling Yahoo | Leaks architecture; no key control |

### Consequences

**Positive:** Expert can open folders and follow one request.  
**Negative:** Two data-access styles by design: Drizzle for identity/AI/watchlist; raw SQL for HMAC `owner_token`.  
**Neutral:** Redis/Kafka/microservices/Grafana/Sonar/Alertmanager are Backend **max** and **skipped**. Defense target is a solid 5 plus honest ops: Azure CD after green CI, correlation id, coverage 80%.

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

### SOLID (how we show it on the code)

This is not a Java inheritance hierarchy. The expert gets one example per letter from this repo:

| Principle | In this codebase |
|-----------|------------------|
| **S**ingle Responsibility | `errorHandler.ts` only maps errors to HTTP JSON. `tickerChatScope.ts` only decides allow vs soft-redirect. Broker column mapping lives in `brokerParsers/`, not in `importService.ts`. |
| **O**pen/Closed | A new statement layout is a mapper + parser module. `importService` stays “read buffer → preview → confirm”; it does not grow a `if (broker === …)` ladder. |
| **L**iskov | Little class inheritance by design (TypeScript + functions). Substitutability is structural: any `NormalizedTrade[]` can go through `confirmImportedTrades`. We do not invent base classes for the letter. |
| **I**nterface Segregation | Narrow DTOs in `types/*.ts` (`AddPositionDto` ≠ `PortfolioDataExport`). Services import the slice they need. |
| **D**ependency Inversion | Controllers depend on service functions, not `pg`. Services depend on repository functions, not `Request`/`Response`. HMAC SQL stays behind `portfolioRepository` (port), not in HTTP handlers. |

`portfolioService.ts` is still a large façade. New features should open a new module rather than keep growing that file (SRP debt, not a missing layer).

### Diagrams

See [architecture](../index.md). This page is the diploma description of the layers.

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Modern framework | ✅ | Express |
| 2 | Database for state | ✅ | PostgreSQL |
| 3 | ORM | ✅ | Drizzle on users, watchlist, AI cache/quota; HMAC portfolio still raw SQL |
| 4 | Layered architecture | ✅ | routes / controllers / services / repositories |
| 5 | SOLID | ✅ | Table above; composition over inheritance |
| 6 | API description | ⚠️ | `backend/openapi.yaml` — keep in sync |
| 7 | Global error handling | ✅ | `errorHandler.ts` |
| 8 | Structured logging | ✅ | pino + request id |
| 9 | Production deploy | ✅ | `https://api.kreptonanalytics.com` (Azure Container Apps) |
| 10 | Unit tests ≥ 70% | ✅ | Jest `coverageThreshold` **80%** statements/lines/functions; HTML+lcov artifact in CI |
| 11 | JSON, Git, secrets in env, no custom JWT | ✅ | |
| 12 | `npm audit` | ✅ | CI job `audit` in `.github/workflows/ci.yml`. Critical advisories fail the pipeline. Direct `xlsx` high is accepted: no patched community release. |
| 13 | OpenAPI valid + in sync | ❌ | Spectral in CI (D2) |
| 14 | Drizzle on remaining non-HMAC tables | ✅ | `ai_news_summaries`, `ai_usage_events`; keep `owner_token` SQL (ADR) |
| 15 | Max: CD image → registry | ✅ | GHCR + Container Apps after green CI |
| 16 | Max: centralized logs | ❌ | Write-up + D4 Log stream screenshot; pino stdout already in code; not ELK |
| 17 | Max: tracing | ⚠️ | Code done (`x-request-id`); remaining work is the thesis sentence, not a new tracer |
| 18 | Max: alerting | ❌ | One Azure 5xx alert in D4 |
| 19 | Max: deploy only if CI green | ✅ | `deploy.yml` waits on `ci.yml` via `workflow_run` |
| 20 | Max skip | — | No microservices, Kafka, Redis, Grafana, ELK cluster, Sonar |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Branch coverage ~62% | Not the diploma counter (statements/lines/functions) | Optional later |
| Public URL | Closed | `https://api.kreptonanalytics.com` |
| Max list not fully claimed | Expert may ask “where is Redis?” | ADR in this file: single instance, in-process quote cache |

## References

- `backend/src/index.ts`, `middleware/errorHandler.ts`, `utils/logger.ts`, `db/schema.ts`
- `backend/openapi.yaml`
