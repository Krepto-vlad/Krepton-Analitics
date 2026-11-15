<!-- prev: db-schema.md | next: none -->

# Query plans

The captured `EXPLAIN` output is in the database pack: [query-plans.md](../../../../database/query-plans.md).

Login by `users.email` is a sequential scan on a five-row table. Portfolio lookup by `portfolio_accounts.owner_token` is an index scan. The email btree is shown in the same note with sequential scans disabled.
