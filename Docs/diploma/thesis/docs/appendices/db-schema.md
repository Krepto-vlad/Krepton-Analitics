<!-- prev: ai-lab-latency.md | next: db-explain.md -->

# Database schema

The review pack for the database lives in `Docs/database/`. This page is the pointer used by the thesis site.

| Document | Path |
|----------|------|
| Data dictionary | [data-dictionary.md](../../../../database/data-dictionary.md) |
| Logical schema (ER) | [logical-schema.md](../../../../database/logical-schema.md) |
| Query plans | [query-plans.md](../../../../database/query-plans.md) |
| Roles | [roles.md](../../../../database/roles.md) |
| DDL | `backend/src/migrations/` |

PostgreSQL, third normal form, migrations in Git. Holdings are linked to a user by HMAC `owner_token`, not by a foreign key from `portfolio_accounts` to `users`.
