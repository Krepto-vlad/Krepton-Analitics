/**
 * Migration: extend users for Google OAuth + email verification.
 * - password_hash becomes nullable (Google-only accounts)
 * - google_sub uniquely identifies a Google account
 * - email_verified gates password login after registration
 * Existing password users are marked verified so they are not locked out.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('users', {
    google_sub: { type: 'varchar(255)', unique: true },
    email_verified: { type: 'boolean', notNull: true, default: false },
    email_verification_token_hash: { type: 'varchar(64)' },
    email_verification_expires_at: { type: 'timestamptz' },
  });

  pgm.alterColumn('users', 'password_hash', { notNull: false });

  pgm.sql(`
    UPDATE users
    SET email_verified = TRUE
    WHERE password_hash IS NOT NULL
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM users
    WHERE password_hash IS NULL
  `);

  pgm.alterColumn('users', 'password_hash', { notNull: true });
  pgm.dropColumns('users', [
    'google_sub',
    'email_verified',
    'email_verification_token_hash',
    'email_verification_expires_at',
  ]);
};
