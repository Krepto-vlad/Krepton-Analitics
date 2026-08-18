# Criterion: Database

## Architecture Decision Record

### Status

**Status:** Accepted (PostgreSQL OLTP)

**Date:** 2026-08-18

### Context

Portfolio state must survive restarts. The schema must stay anonymous: `users` holds email + password hash; holdings are not joined by a conventional `user_id` FK.

### Decision

PostgreSQL, 3NF transactional model, migrations in Git. `portfolio_accounts.owner_token` is HMAC-SHA256(userId, secret). Staging API should connect as `app_write`, not a superuser (roles created NOLOGIN in a migration; operator attaches LOGIN).

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
| CHECK constraints | Defense in depth for shares, currency, ticker, trade type |
| Three DB roles, thin | Rubric + non-superuser API; one pool, no UX change |
| Quotes not stored as source of truth | Live/cached API; DB is holdings + users + AI cache |

## Requirements Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Data dictionary | ✅ | [db-schema appendix](../../appendices/db-schema.md) |
| 2 | Integrity + transactions | ✅ | CHECK migration + `portfolioRepository` transactions |
| 3 | Logical / ER diagram | ✅ | mermaid ER in the appendix |
| 4 | DDL in Git | ✅ | `backend/src/migrations/` |
| 5 | Modern RDBMS + 3NF | ✅ | PostgreSQL; 3NF table in appendix |
| 6 | Keys, types, constraints | ✅ | PK/FK/UNIQUE/CHECK |
| 7 | Test / seed data | ✅ | `npm run seed:demo` |
| 8 | DB roles, not superuser | ✅ | `app_read` / `app_write` / `app_admin`; `\du` screenshot on the stand |
| 9 | Password hashing | ✅ | bcrypt, not plaintext |
| 10 | Indexes justified | ✅ | appendix “Indexes (why)” |

## Known Limitations

| Limitation | Impact | Plan |
|------------|--------|------|
| Local still uses owner URL | Fine for inner loop | Staging `DATABASE_URL` = `app_write` |
| `\du` screenshot not in zip yet | Expert evidence | Capture on the defense DB |

## References

- `backend/src/migrations/`
- `backend/src/db/schema.ts`
- `Docs/diploma/DATABASE_ROLES.md` (working note, not in the final zip)
