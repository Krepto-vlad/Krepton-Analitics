# Criterion: Database

## Architecture Decision Record

### Status

**Status:** Accepted (PostgreSQL OLTP)

**Date:** 2026-08-18

### Context

Portfolio state must survive restarts. The schema must stay anonymous: `users` holds email + password hash; holdings are not joined by a conventional `user_id` FK.

### Decision

PostgreSQL, 3NF transactional model, migrations in Git. `portfolio_accounts.owner_token` is HMAC-SHA256(userId, secret). Application must not use a superuser at runtime (roles still to be added in a migration).

### Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| SQLite / JSON files | Not a diploma DBMS; no roles |
| MongoDB | Relational integrity and migrations fit OLTP better |
| `user_id` FK on positions | Would make the split-zone anonymity story weaker |

### Consequences

**Positive:** Integrity via PK/FK where it does not break anonymity; HMAC is auditable SQL.  
**Negative:** Experts must be told why there is **no** FK from portfolio → users.  
**Neutral:** No second analytical DBMS (OLAP max not claimed).

## Implementation Details

See [Database schema appendix](../../appendices/db-schema.md).

### Key Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| node-pg-migrate | Reproducible DDL |
| HMAC owner_token | Anonymity without storing userId on portfolio rows |
| Quotes not stored as source of truth | Live/cached API; DB is holdings + users + AI cache |

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Data dictionary | ⚠️ | Appendix started; complete column list still open |
| 2 | Integrity + transactions | ⚠️ | PK/FK on related tables; CHECK constraints TBD |
| 3 | Logical / ER diagram | ⚠️ | Sketch in appendix; polish in assets/diagrams |
| 4 | DDL in Git | ✅ | `backend/src/migrations/` |
| 5 | Modern RDBMS + 3NF | ✅ | PostgreSQL |
| 6 | Keys, types, constraints | ⚠️ | Exists; extra CHECKs in D0 |
| 7 | Test / seed data | ❌ | `seed:demo` planned |
| 8 | DB roles, not superuser | ❌ | Migration for app_read/write/admin |
| 9 | Password hashing | ✅ | bcrypt, not plaintext |
| 10 | Indexes justified | ⚠️ | Describe owner_token, email uniqueness |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Missing DB roles | Database min | D0.3 migration |
| No seed script | Demo friction | `npm run seed:demo` |

## References

- `backend/src/migrations/`
- `backend/src/db/schema.ts`
