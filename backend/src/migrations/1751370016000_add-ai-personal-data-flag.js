/**
 * Migration: profile switch for sending the user's own data to AI chat.
 * A boolean preference, not identity. Default on matches the previous chat behavior.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('users', {
    ai_personal_data_enabled: { type: 'boolean', notNull: true, default: true },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('users', ['ai_personal_data_enabled']);
};
