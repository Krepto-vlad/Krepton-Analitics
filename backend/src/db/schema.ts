import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Drizzle schema mirrors PostgreSQL tables created by node-pg-migrate.
 * Migrations remain the source of truth for DDL; this file is the ORM mapping.
 *
 * HMAC portfolio (`portfolio_accounts.owner_token`, `positions`, `transactions`)
 * stays raw SQL in `portfolioRepository.ts` — no FK to `users`, token math must stay explicit.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }),
  google_sub: varchar('google_sub', { length: 255 }).unique(),
  email_verified: boolean('email_verified').notNull().default(false),
  email_verification_token_hash: varchar('email_verification_token_hash', { length: 64 }),
  email_verification_expires_at: timestamp('email_verification_expires_at', {
    withTimezone: true,
    mode: 'date',
  }),
  password_reset_token_hash: varchar('password_reset_token_hash', { length: 64 }),
  password_reset_expires_at: timestamp('password_reset_expires_at', {
    withTimezone: true,
    mode: 'date',
  }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const watchlistItems = pgTable('watchlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolio_id: uuid('portfolio_id').notNull(),
  ticker: varchar('ticker', { length: 10 }).notNull(),
  company_name: varchar('company_name', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const aiNewsSummaries = pgTable(
  'ai_news_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tickers_key: varchar('tickers_key', { length: 255 }).notNull(),
    summary_date: date('summary_date', { mode: 'string' }).notNull(),
    tickers: jsonb('tickers').$type<string[]>().notNull(),
    summary_payload: jsonb('summary_payload').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('ai_news_summaries_user_id_tickers_key_summary_date_index').on(
      table.user_id,
      table.tickers_key,
      table.summary_date
    ),
  ]
);

export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    feature: varchar('feature', { length: 64 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('ai_usage_events_user_id_feature_created_at_index').on(
      table.user_id,
      table.feature,
      table.created_at
    ),
  ]
);
