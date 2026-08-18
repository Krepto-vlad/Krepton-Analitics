# Database roles (diploma min, thin)

Krepton has **one** API process and **one** runtime connection. Three Postgres roles do not change the product. They exist so the Node app is not a superuser, and so an expert can run `\du`.

| Role | Login in Git? | Who uses it |
|------|----------------|-------------|
| `app_read` | NOLOGIN | Unused by the API. Reserved for a future replica / `psql` report. |
| `app_write` | NOLOGIN | **Staging/prod API** after the operator adds LOGIN + password. |
| `app_admin` | NOLOGIN | Operator / migrate user conceptually. Cluster owner (`postgres`) still runs `npm run migrate:up` unless you attach LOGIN to this role. |

## Local (inner loop)

Keep `DATABASE_URL` as the database owner (`postgres`). `npm run migrate:up` and `npm run dev` share it. Roles are created; they just are not the connection you type every day.

```bash
cd backend
npm run migrate:up
npm run seed:demo
```

Demo login (not production): `demo@krepton.local` / `DemoPassw0rd!` unless `SEED_DEMO_PASSWORD` is set.

## Staging (what the rubric wants)

1. Migrate as owner (superuser or Azure admin): `DATABASE_URL` = owner, `npm run migrate:up`.
2. `ALTER ROLE app_write WITH LOGIN PASSWORD '...';` (password **not** in Git).
3. Point the App Service `DATABASE_URL` at `app_write`.
4. Leave migrate on the owner URL (`DATABASE_MIGRATE_URL` in `.env.example`).

Screenshot for the expert: `psql` → `\du` showing `app_read`, `app_write`, `app_admin`.

## What we deliberately skip

No app-level “connect as read vs write”. No second connection pool. GRANT is in `backend/src/migrations/1751370013000_add-app-database-roles.js`.
