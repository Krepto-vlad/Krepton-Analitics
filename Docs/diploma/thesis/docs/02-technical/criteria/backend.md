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

### Diagrams

See [architecture](../index.md). Layer rules match internal `Docs/ARCHITECTURE_BACKEND.md` (engineering copy; this ADR is the diploma copy).

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Modern framework | ✅ | Express |
| 2 | Database for state | ✅ | PostgreSQL |
| 3 | ORM | ⚠️ | Drizzle on users/watchlist; portfolio still raw SQL |
| 4 | Layered architecture | ✅ | routes / controllers / services / repositories |
| 5 | SOLID | ⚠️ | Documented with code pointers; no Java-style inheritance |
| 6 | API description | ⚠️ | `backend/openapi.yaml` — keep in sync |
| 7 | Global error handling | ✅ | `errorHandler.ts` |
| 8 | Structured logging | ✅ | pino + request id |
| 9 | Production deploy | ❌ | Azure D4 |
| 10 | Unit tests ≥ 70% | ⚠️ | Jest exists; threshold not enforced yet |
| 11 | JSON, Git, secrets in env, no custom JWT | ✅ | |
| 12 | `npm audit` | ⚠️ | See working note `Docs/diploma/NPM_AUDIT_BACKEND.md` |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Coverage gate | Backend min + Auto tests | Phase D3 |
| No public URL | Backend min + Cloud | Phase D4 |

## References

- `backend/src/index.ts`, `middleware/errorHandler.ts`, `utils/logger.ts`, `db/schema.ts`
- `backend/openapi.yaml`
- Working ADR: `Docs/diploma/ADR-001-drizzle-orm.md`
