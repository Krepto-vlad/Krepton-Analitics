import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Drizzle schema mirrors PostgreSQL tables created by node-pg-migrate.
 * Migrations remain the source of truth for DDL; this file is the ORM mapping.
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
