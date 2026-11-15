# Query plans

Captured **2026-11-15** on the local development database (`krepton_analytics`, PostgreSQL **17.4**, role `postgres`). The indexes are the ones the migrations create. The statements are the ones the API runs: login by email, and portfolio resolution by HMAC `owner_token`.

The `users` table held five rows (one heap page). PostgreSQL may ignore an index when a sequential scan is cheaper. The second email plan turns sequential scans off only to show that the btree is usable. The application does not set that flag.

## Indexes present

| Table | Index | Definition |
|-------|-------|------------|
| `users` | `users_email_key` | UNIQUE btree on `email` (from the column constraint) |
| `users` | `users_email_index` | btree on `email` (`createIndex` in the users migration) |
| `portfolio_accounts` | `portfolio_accounts_owner_token_key` | UNIQUE btree on `owner_token` |
| `portfolio_accounts` | `portfolio_accounts_owner_token_index` | btree on `owner_token` |

The UNIQUE constraint already builds a btree. The extra `createIndex` is a second btree on the same column. Either one can serve the lookup. The planner picked `users_email_index` and `portfolio_accounts_owner_token_index` below.

## Email lookup (login)

Source: `findUserByEmail` in `backend/src/repositories/userRepository.ts`.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM users WHERE email = $1;
```

Planner choice on five rows:

```text
Seq Scan on users  (cost=0.00..1.04 rows=1 width=16) (actual time=0.011..0.011 rows=1 loops=1)
  Filter: ((email)::text = 'demo@krepton.local'::text)
  Rows Removed by Filter: 4
  Buffers: shared hit=1
Planning Time: 2.426 ms
Execution Time: 0.021 ms
```

Cost `1.04` is one heap page. An index scan starts near cost `8`, so the sequential scan is the correct plan at this size. Same query with `enable_seqscan = off` (evidence only):

```text
Index Scan using users_email_index on users  (cost=0.13..8.15 rows=1 width=16) (actual time=0.045..0.046 rows=1 loops=1)
  Index Cond: ((email)::text = 'demo@krepton.local'::text)
  Buffers: shared hit=1 read=1
Planning Time: 0.037 ms
Execution Time: 0.054 ms
```

## Owner-token lookup (every portfolio request)

Source: `findOrCreatePortfolioAccount` in `backend/src/repositories/portfolioRepository.ts`.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM portfolio_accounts WHERE owner_token = $1;
```

The sample token is 64 `a` characters (valid hex length, no matching row). The planner uses the btree on this small table:

```text
Index Scan using portfolio_accounts_owner_token_index on portfolio_accounts  (cost=0.14..8.16 rows=1 width=16) (actual time=0.008..0.008 rows=0 loops=1)
  Index Cond: (owner_token = 'aaa…aaa'::bpchar)
  Buffers: shared hit=1
Planning Time: 1.788 ms
Execution Time: 0.015 ms
```

`bpchar` is `char(64)`, the column type from the portfolio migration.

## Scope

Azure Point-in-Time Restore is a Cloud property of PostgreSQL Flexible Server. It is not part of these plans and it is not a second DBMS. The database maximum claimed here is migrations, these indexes, and HMAC anonymization of holdings.
