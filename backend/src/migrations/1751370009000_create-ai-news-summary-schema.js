/**
 * Migration: AI news summary cache + usage tracking for quota enforcement.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('ai_news_summaries', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    tickers_key: {
      type: 'varchar(255)',
      notNull: true,
    },
    summary_date: {
      type: 'date',
      notNull: true,
    },
    tickers: {
      type: 'jsonb',
      notNull: true,
    },
    summary_payload: {
      type: 'jsonb',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('ai_news_summaries', ['user_id', 'tickers_key', 'summary_date'], {
    unique: true,
  });

  pgm.createTable('ai_usage_events', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    feature: {
      type: 'varchar(64)',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('ai_usage_events', ['user_id', 'feature', 'created_at']);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('ai_usage_events');
  pgm.dropTable('ai_news_summaries');
};
