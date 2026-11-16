# Data dictionary

PostgreSQL. DDL source of truth: `backend/src/migrations/`. Drizzle in `backend/src/db/schema.ts` maps the tables that are not the HMAC portfolio. `portfolio_accounts`, `positions`, and `transactions` stay raw SQL.

Logical diagram: [logical-schema.md](logical-schema.md). Query plans: [query-plans.md](query-plans.md). Roles: [roles.md](roles.md).

Money and share counts are `numeric(18,8)`. Instants are `timestamptz`. Passwords are bcrypt hashes. Email-verify and password-reset tokens in `users` are SHA-256 hashes, never the raw token.

## users

Login identity. No legal name, phone, or broker account number.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| id | uuid | PK, default `gen_random_uuid()` |
| email | varchar(255) | UNIQUE NOT NULL |
| password_hash | varchar(255) | nullable. bcrypt when the account has a password |
| google_sub | varchar(255) | UNIQUE, nullable |
| email_verified | boolean | NOT NULL, default false |
| email_verification_token_hash | varchar(64) | nullable |
| email_verification_expires_at | timestamptz | nullable |
| password_reset_token_hash | varchar(64) | nullable |
| password_reset_expires_at | timestamptz | nullable |
| ai_personal_data_enabled | boolean | NOT NULL, default true. Profile switch for sending portfolio data to AI chat |
| created_at | timestamptz | NOT NULL, default `now()` |

CHECK: `password_hash IS NOT NULL OR google_sub IS NOT NULL`.

Indexes: UNIQUE btree `users_email_key`, plus btree `users_email_index`.

## portfolio_accounts

One portfolio per HMAC owner token. No foreign key to `users`.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| id | uuid | PK |
| owner_token | char(64) | UNIQUE NOT NULL, CHECK 64 hex characters |
| rebalancing_strategy_id | varchar(64) | NOT NULL, CHECK known strategy id |
| rebalancing_custom_allocations | jsonb | nullable. Custom target weights, not a holdings dump |
| rebalancing_custom_base_strategy_id | varchar(64) | nullable |
| created_at | timestamptz | NOT NULL |

Indexes: UNIQUE btree `portfolio_accounts_owner_token_key`, plus btree `portfolio_accounts_owner_token_index`. Every authenticated portfolio request looks up this column.

## positions

Current aggregated lot for one ticker inside one portfolio.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| id | uuid | PK |
| portfolio_id | uuid | FK → `portfolio_accounts` ON DELETE CASCADE, NOT NULL |
| ticker | varchar(10) | NOT NULL, CHECK ticker format |
| company_name | varchar(255) | NOT NULL, CHECK not blank |
| shares | numeric(18,8) | NOT NULL, CHECK `> 0` and `<= 999999999` |
| avg_buy_price | numeric(18,8) | NOT NULL, CHECK `> 0` |
| currency | varchar(3) | NOT NULL, default `USD`, CHECK `USD` or `EUR` |
| sector | varchar(100) | nullable |
| entry_date | date | nullable |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

UNIQUE `(portfolio_id, ticker)`. Index on `portfolio_id`.

## transactions

Buy and sell history. Not a replacement for `positions`.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| id | uuid | PK |
| portfolio_id | uuid | FK → `portfolio_accounts` ON DELETE CASCADE, NOT NULL |
| ticker | varchar(10) | NOT NULL, CHECK ticker format |
| company_name | varchar(255) | NOT NULL, CHECK not blank |
| shares | numeric(18,8) | NOT NULL, CHECK `> 0` |
| price_per_share | numeric(18,8) | NOT NULL, CHECK `> 0` |
| currency | varchar(3) | NOT NULL, default `USD`, CHECK `USD` or `EUR` |
| transaction_date | date | nullable |
| transaction_type | varchar(4) | NOT NULL, default `BUY`, CHECK `BUY` or `SELL` |
| source | varchar(32) | NOT NULL, default `unknown`, CHECK `unknown`, `manual`, `import`, or `snaptrade` |
| created_at | timestamptz | NOT NULL, default `now()` |

Indexes: `portfolio_id`, and `(portfolio_id, ticker)`.

## watchlist_items

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| id | uuid | PK |
| portfolio_id | uuid | FK → `portfolio_accounts` ON DELETE CASCADE, NOT NULL |
| ticker | varchar(10) | NOT NULL, CHECK ticker format |
| company_name | varchar(255) | NOT NULL, CHECK not blank |
| created_at | timestamptz | NOT NULL, default `now()` |

UNIQUE `(portfolio_id, ticker)`. Index on `portfolio_id`.

## ai_news_summaries

Cache of a daily briefing. Tied to the login user, not to the HMAC portfolio.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| id | uuid | PK |
| user_id | uuid | FK → `users` ON DELETE CASCADE, NOT NULL |
| tickers_key | varchar(255) | NOT NULL |
| summary_date | date | NOT NULL |
| tickers | jsonb | NOT NULL, CHECK JSON array |
| summary_payload | jsonb | NOT NULL. Cached briefing document |
| created_at | timestamptz | NOT NULL, default `now()` |

UNIQUE `(user_id, tickers_key, summary_date)`.

## ai_usage_events

Quota counter. One row per model call.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| id | uuid | PK |
| user_id | uuid | FK → `users` ON DELETE CASCADE, NOT NULL |
| feature | varchar(64) | NOT NULL, CHECK `news_summary`, `explain_alignment`, `import_schema`, or `ticker_chat` |
| created_at | timestamptz | NOT NULL, default `now()` |

Index `(user_id, feature, created_at)`.

## billing_customers

Paddle customer id. Card data is not stored.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| user_id | uuid | PK, FK → `users` ON DELETE CASCADE |
| paddle_customer_id | varchar(64) | UNIQUE NOT NULL |
| created_at | timestamptz | NOT NULL, default `now()` |

## billing_entitlements

Access is the Paddle period end, or an admin grant in `admin_expires_at`.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| user_id | uuid | PK, FK → `users` ON DELETE CASCADE |
| paddle_subscription_id | varchar(64) | UNIQUE, nullable |
| paddle_status | varchar(32) | nullable, CHECK `active`, `trialing`, `past_due`, `canceled`, `paused`, or NULL |
| paddle_interval | varchar(16) | nullable, CHECK `month`, `year`, or NULL |
| paddle_period_start | timestamptz | nullable |
| paddle_period_end | timestamptz | nullable |
| paddle_cancel_at_period_end | boolean | NOT NULL, default false |
| admin_expires_at | timestamptz | nullable |
| updated_at | timestamptz | NOT NULL, default `now()` |

## billing_webhook_events

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| event_id | varchar(128) | PK |
| event_type | varchar(128) | NOT NULL |
| processed_at | timestamptz | NOT NULL, default `now()` |

## snaptrade_users

Broker-link secret for the server. Never sent to the browser. This is not the user's password.

| Column | Type | Keys and constraints |
|--------|------|----------------------|
| user_id | uuid | PK, FK → `users` ON DELETE CASCADE |
| snaptrade_user_id | varchar(128) | UNIQUE NOT NULL |
| user_secret | varchar(256) | NOT NULL |
| created_at | timestamptz | NOT NULL, default `now()` |
| updated_at | timestamptz | NOT NULL, default `now()` |

## Integrity

CHECK constraints live in `1751370012000_add-data-integrity-checks.js`, plus the billing and `transactions.source` checks in their own migrations.

Multi-step portfolio writes use `BEGIN` / `COMMIT` / `ROLLBACK` in `backend/src/repositories/portfolioRepository.ts` (add position, close position, import confirm).

## Indexes

| Index | Why it exists |
|-------|----------------|
| `users.email` | Login lookup. The UNIQUE constraint already builds a btree. A second btree was added in the users migration |
| `portfolio_accounts.owner_token` | JWT user → HMAC → portfolio id on every portfolio request |
| `positions.portfolio_id` | Holdings list |
| `transactions (portfolio_id, ticker)` | Chart markers and per-lot history |
| `watchlist_items.portfolio_id` | Watchlist panel |
| `ai_usage_events (user_id, feature, created_at)` | Daily quota count |

Plans for the email and owner-token lookups: [query-plans.md](query-plans.md).
