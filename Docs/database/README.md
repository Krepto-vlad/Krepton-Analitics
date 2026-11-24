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

## Files in this folder

| File | |
|------|--|
| [data-dictionary.md](data-dictionary.md) | Tables, columns, types, keys, indexes |
| [logical-schema.png](logical-schema.png) | Logical schema. This picture is the ER diagram |
| [logical-schema.md](logical-schema.md) | Notes for the diagram and the 3NF table |
| [query-plans.md](query-plans.md) | `EXPLAIN` for `email` and `owner_token` |
| [roles.md](roles.md) | `app_read`, `app_write`, `app_admin`, and the `\du` screenshot |
| [draw_schema.py](draw_schema.py) | Script that draws the logical schema picture |

DDL is `backend/src/migrations/`. From `backend/`: `npm run migrate:up`. How to run the app: [README](../../README.md).

## Implementation Details

### Key Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| node-pg-migrate | Reproducible DDL |
| HMAC owner_token | Anonymity without storing userId on portfolio rows |
| CHECK constraints | Defense in depth for shares, currency, ticker, trade type |
| Three DB roles | The API connects as `app_write`, not as a superuser |
| Quotes not stored as source of truth | Live/cached API; DB is holdings + users + AI cache |

### Verified by automated tests

The suite in `backend/src/__tests__/db/` runs every migration on an empty PostgreSQL database and checks the schema directly: each migration is applied once, all tables exist, `CHECK` and unique constraints reject bad rows, the three roles hold only their intended privileges, and `portfolio_accounts`, `positions`, `transactions`, and `watchlist_items` have no foreign key to `users`. One suite per repository exercises the SQL against the real database. Details: [automated tests](../automated-tests/README.md).

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Data dictionary | ✅ | [data dictionary](data-dictionary.md) |
| 2 | Integrity + transactions | ✅ | CHECK migration + `portfolioRepository` transactions |
| 3 | Logical / ER diagram | ✅ | [logical schema](logical-schema.md) |
| 4 | DDL in Git | ✅ | `backend/src/migrations/` |
| 5 | Modern RDBMS + 3NF | ✅ | PostgreSQL; 3NF table in the logical schema |
| 6 | Keys, types, constraints | ✅ | PK/FK/UNIQUE/CHECK |
| 7 | Test / seed data | ✅ | `npm run seed:demo`; integration fixtures in `backend/src/__tests__/db/helpers/` |
| 8 | DB roles, not superuser | ✅ | [roles](roles.md); `\du` on Azure PostgreSQL Flexible Server |
| 9 | Password hashing | ✅ | bcrypt, not plaintext |
| 10 | Indexes justified | ✅ | Index table in the data dictionary |
| 11 | Max: schema migrations | ✅ | `node-pg-migrate`; applied-once check in the integration suite |
| 12 | Max: PII masking | ✅ | HMAC `owner_token`, no portfolio→users FK (asserted by tests) |
| 13 | Max: `\du` + `app_write` on staging | ✅ | [roles screenshot](roles.md) on Azure; API `DATABASE_URL` = `app_write`, `npm run migrate:up` run as the Postgres admin |
| 14 | Max: EXPLAIN appendix | ✅ | [query plans](query-plans.md) |

## References

- `backend/src/migrations/`
- `backend/src/db/schema.ts`
- [Data dictionary](data-dictionary.md)
- [Query plans](query-plans.md)
- [Roles](roles.md)
