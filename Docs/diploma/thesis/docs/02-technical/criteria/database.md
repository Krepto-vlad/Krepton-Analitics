# Criterion: Database

## Architecture Decision Record

### Status

**Status:** Accepted (PostgreSQL OLTP, deployed and role-verified on Azure)

**Date:** 2026-08-18 (design) → 2026-09-02 (staging roles confirmed)

### Context

Portfolio state must survive restarts. The schema must stay anonymous: `users` holds email + password hash; holdings are not joined by a conventional `user_id` FK.

### Decision

PostgreSQL, 3NF transactional model, migrations in Git. `portfolio_accounts.owner_token` is HMAC-SHA256(userId, secret). Staging API should connect as `app_write`, not a superuser (roles created NOLOGIN in a migration; operator attaches LOGIN).

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| SQLite / JSON files | No roles and no managed server |
| MongoDB | Relational integrity and migrations fit OLTP better |
| `user_id` FK on positions | Would make the split-zone anonymity story weaker |

## Implementation Details

See the database pack: [logical schema](../../../../../database/logical-schema.md), [data dictionary](../../../../../database/data-dictionary.md).

### Key Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| node-pg-migrate | Reproducible DDL |
| HMAC owner_token | Anonymity without storing userId on portfolio rows |
| CHECK constraints | Defense in depth for shares, currency, ticker, trade type |
| Three DB roles | The API connects as `app_write`, not as a superuser |
| Quotes not stored as source of truth | Live/cached API; DB is holdings + users + AI cache |

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Data dictionary | ✅ | [data dictionary](../../../../../database/data-dictionary.md) |
| 2 | Integrity + transactions | ✅ | CHECK migration + `portfolioRepository` transactions |
| 3 | Logical / ER diagram | ✅ | [logical schema](../../../../../database/logical-schema.md) |
| 4 | DDL in Git | ✅ | `backend/src/migrations/` |
| 5 | Modern RDBMS + 3NF | ✅ | PostgreSQL; 3NF table in the logical schema |
| 6 | Keys, types, constraints | ✅ | PK/FK/UNIQUE/CHECK |
| 7 | Test / seed data | ✅ | `npm run seed:demo` |
| 8 | DB roles, not superuser | ✅ | [roles](../../../../../database/roles.md); `\du` on Azure PostgreSQL Flexible Server |
| 9 | Password hashing | ✅ | bcrypt, not plaintext |
| 10 | Indexes justified | ✅ | Index table in the data dictionary |
| 11 | Max: schema migrations | ✅ | `node-pg-migrate` |
| 12 | Max: PII masking | ✅ | HMAC `owner_token`, no portfolio→users FK |
| 13 | Max: `\du` + `app_write` on staging | ✅ | [roles screenshot](../../../../../database/roles.md) on Azure; API `DATABASE_URL` = `app_write`, `npm run migrate:up` run as the Postgres admin |
| 14 | Max: EXPLAIN appendix | ✅ | [query plans](../../../../../database/query-plans.md) |

## References

- `backend/src/migrations/`
- `backend/src/db/schema.ts`
- [Data dictionary](../../../../../database/data-dictionary.md)
- [Query plans](../../../../../database/query-plans.md)
- [Roles](../../../../../database/roles.md)
