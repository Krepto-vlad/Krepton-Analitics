# Criterion: Backend

## Architecture Decision Record

### Status

**Status:** Accepted (layered Express API)

**Date:** 2026-08-18

### Context

Backend is a required criterion. The API must be a real server (not static JSON), with layers, ORM, errors, logs, tests, and a production URL. The product also needs an anonymous portfolio store and in-memory broker parsing.

### Decision

Node.js + Express + TypeScript. Routes → middleware → controllers → services → repositories. Drizzle ORM for `users` and `watchlist`; HMAC portfolio SQL stays explicit. pino JSON logs. OpenAPI file in Git. Deploy to Azure in phase D4.

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| NestJS | Extra DI ceremony for a single service |
| Prisma | Hides SQL; fights HMAC owner_token |
| Raw `pg` only | Does not satisfy named ORM requirement |
| Frontend calling Yahoo | Leaks architecture; no key control |

### Consequences

**Positive:** Expert can open folders and follow one request.  
**Negative:** Two data-access styles until remaining tables are on Drizzle.  
**Neutral:** Redis/Kafka/microservices are Backend **max** and not claimed.

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

See [architecture](../index.md). Layer rules match internal `Docs/ARCHITECTURE_BACKEND.md` (engineering copy; this ADR is the diploma copy).

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Modern framework | ✅ | Express |
| 2 | Database for state | ✅ | PostgreSQL |
| 3 | ORM | ⚠️ | Drizzle on users/watchlist; portfolio still raw SQL |
| 4 | Layered architecture | ✅ | routes / controllers / services / repositories |
| 5 | SOLID | ✅ | Table above; composition over inheritance |
| 6 | API description | ⚠️ | `backend/openapi.yaml` — keep in sync |
| 7 | Global error handling | ✅ | `errorHandler.ts` |
| 8 | Structured logging | ✅ | pino + request id |
| 9 | Production deploy | ❌ | Azure D4 |
| 10 | Unit tests ≥ 70% | ✅ | Jest `coverageThreshold` 70% statements/lines/functions; HTML+lcov artifact in CI |
| 11 | JSON, Git, secrets in env, no custom JWT | ✅ | |
| 12 | `npm audit` | ✅ | CI job + `Docs/diploma/NPM_AUDIT_BACKEND.md` (xlsx high accepted) |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Branch coverage ~50% | Not the diploma counter (statements/lines) | Optional later |
| No public URL | Backend min + Cloud | Phase D4 |

## References

- `backend/src/index.ts`, `middleware/errorHandler.ts`, `utils/logger.ts`, `db/schema.ts`
- `backend/openapi.yaml`
- Working ADR: `Docs/diploma/ADR-001-drizzle-orm.md`
