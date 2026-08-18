# ADR-001: Drizzle ORM for typed data access

**Status:** Accepted  
**Date:** 2026-08-18  
**Criterion:** Backend min (ORM)

## Context

Diploma Backend min requires an ORM (examples in the rubric: EF, Hibernate, Sequelize). The app previously used raw `pg` SQL in repositories. That is a valid data-access pattern, but it does not satisfy the named ORM requirement.

Krepton also stores `portfolio_accounts.owner_token = HMAC-SHA256(userId, PORTFOLIO_SECRET)` **without** a foreign key to `users`. That SQL must stay explicit so the anonymity design is auditable.

## Decision

Use **Drizzle ORM** (`drizzle-orm` + existing `pg` Pool) as the ORM:

- Schema lives in `backend/src/db/schema.ts` (TypeScript table mapping).
- DDL source of truth remains **`node-pg-migrate`** (no Drizzle Kit push to prod).
- First domains on Drizzle: **`users`** and **`watchlist_items`**.
- HMAC portfolio queries stay raw SQL in `portfolioRepository.ts` until that domain is mapped with the same explicit token math.

## Alternatives considered

| Alternative | Why not |
|-------------|---------|
| Prisma | Strong ORM, but hides SQL and encourages implicit joins — fights the HMAC split-zone design. Extra migrate runtime. |
| Sequelize / TypeORM | Heavier Active Record style; farther from the SQL we already wrote. |
| Keep raw `pg` only | Clean for the product, **does not close Backend min ORM**. |
| Rewrite every repository in one PR | High regression risk; YAGNI vs incremental mapping. |

## Consequences

**Positive:** Typed table schema an expert can open; CRUD without string-built SQL for users/watchlist; still one Postgres connection pool.

**Negative:** Two access styles until remaining tables are mapped. Schema in TS can drift from migrations if someone adds a column in only one place — review both.

**Neutral:** `drizzle(pool)` shares the existing Pool; no second connection library.
