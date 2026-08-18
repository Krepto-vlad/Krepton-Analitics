<!-- prev: api-reference.md | next: none -->

# Database Schema

| Attribute | Value |
|-----------|-------|
| **Database** | PostgreSQL |
| **DDL** | `backend/src/migrations/` (node-pg-migrate) |
| **ORM** | drizzle-orm for `users`, `watchlist_items`; HMAC portfolio still SQL |

## Entity relationship (logical)

```
users (id, email, password_hash)
   │
   │  application computes owner_token = HMAC(user.id)
   │  NO database foreign key
   ▼
portfolio_accounts (id, owner_token unique)
   │
   ├── positions (portfolio_id FK, ticker, shares, avg_buy_price, currency, …)
   ├── transactions (portfolio_id FK, trade history)
   └── watchlist_items (portfolio_id FK, ticker)

users.id
   ├── ai_news_summaries (user_id FK, cache)
   └── ai_usage_events (user_id FK, quota)
```

## Tables (dictionary draft)

### users

Anonymous identity. No legal name, phone, or account number.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, `gen_random_uuid()` |
| email | varchar(255) | UNIQUE NOT NULL |
| password_hash | varchar(255) | NOT NULL (bcrypt) |
| created_at | timestamptz | NOT NULL |

Index: `email`.

### portfolio_accounts

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| owner_token | char(64) | UNIQUE NOT NULL (HMAC hex) |
| created_at | timestamptz | NOT NULL |

### positions

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| portfolio_id | uuid | FK → portfolio_accounts ON DELETE CASCADE |
| ticker | varchar(10) | NOT NULL |
| company_name | varchar(255) | NOT NULL |
| shares | numeric(18,8) | NOT NULL |
| avg_buy_price | numeric(18,8) | NOT NULL |
| currency | varchar(3) | NOT NULL default USD |
| entry_date | date | nullable |
| created_at / updated_at | timestamptz | NOT NULL |

Unique `(portfolio_id, ticker)`.

### transactions

Immutable lots/history. Same money types as positions; FK `portfolio_id`.

### watchlist_items

FK `portfolio_id`; unique `(portfolio_id, ticker)`.

### ai_news_summaries / ai_usage_events

FK `user_id` → `users` ON DELETE CASCADE. Quota and briefing cache are tied to the login identity (email), not to HMAC rows.

## Normalization note

OLTP 3NF: users, accounts, positions, transactions are separate. Quotes are **not** persisted as a market-data warehouse (by design). JSONB on AI cache is a documented exception for a daily blob, not a substitute for the holdings model.

## Migrations

All versioned under `backend/src/migrations/`. Runtime DB user should not be superuser (roles still to add).

## Seeding

`seed:demo` is planned for the defense stand. Until then, register a user and import/add positions.
