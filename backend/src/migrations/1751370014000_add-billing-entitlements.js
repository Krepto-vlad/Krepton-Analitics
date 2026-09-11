/**
 * Paddle billing entitlements. Cards never touch this database.
 * Access is paddle period_end OR admin_expires_at (complimentary grants).
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('billing_customers', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    paddle_customer_id: {
      type: 'varchar(64)',
      notNull: true,
      unique: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createTable('billing_entitlements', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    paddle_subscription_id: {
      type: 'varchar(64)',
      unique: true,
    },
    paddle_status: {
      type: 'varchar(32)',
    },
    paddle_interval: {
      type: 'varchar(16)',
    },
    paddle_period_start: {
      type: 'timestamptz',
    },
    paddle_period_end: {
      type: 'timestamptz',
    },
    paddle_cancel_at_period_end: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    admin_expires_at: {
      type: 'timestamptz',
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('billing_entitlements', 'billing_entitlements_paddle_status_check', {
    check: `paddle_status IS NULL OR paddle_status IN (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'paused'
    )`,
  });

  pgm.addConstraint('billing_entitlements', 'billing_entitlements_paddle_interval_check', {
    check: "paddle_interval IS NULL OR paddle_interval IN ('month', 'year')",
  });

  pgm.createTable('billing_webhook_events', {
    event_id: {
      type: 'varchar(128)',
      primaryKey: true,
    },
    event_type: {
      type: 'varchar(128)',
      notNull: true,
    },
    processed_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('billing_webhook_events');
  pgm.dropTable('billing_entitlements');
  pgm.dropTable('billing_customers');
};
