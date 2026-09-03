/**
 * Migration: password reset tokens (separate from email verification).
 * Store only SHA-256 hash of the one-time token + expiry.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('users', {
    password_reset_token_hash: { type: 'varchar(64)' },
    password_reset_expires_at: { type: 'timestamptz' },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('users', ['password_reset_token_hash', 'password_reset_expires_at']);
};
