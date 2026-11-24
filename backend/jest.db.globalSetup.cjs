/**
 * Runs once before the real-Postgres suite: creates the test database when it
 * is missing and applies every migration, so the tests see the production schema.
 */
const path = require('node:path');
const { Client } = require('pg');
const { runner } = require('node-pg-migrate');
const { readTestDatabaseUrl, buildAdminDatabaseUrl } = require('./jest.db.testDatabase.cjs');

const MIGRATIONS_DIRECTORY = path.join(__dirname, 'src', 'migrations');
const MIGRATIONS_TABLE = 'pgmigrations';
const MIGRATION_COUNT_ALL = Infinity;

async function createDatabaseIfMissing(databaseUrl, databaseName) {
  const adminClient = new Client({ connectionString: buildAdminDatabaseUrl(databaseUrl) });
  await adminClient.connect();

  try {
    const existing = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);

    if (existing.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
    }
  } finally {
    await adminClient.end();
  }
}

module.exports = async function globalSetup() {
  const { databaseUrl, databaseName } = readTestDatabaseUrl();

  await createDatabaseIfMissing(databaseUrl, databaseName);

  await runner({
    databaseUrl,
    dir: MIGRATIONS_DIRECTORY,
    direction: 'up',
    migrationsTable: MIGRATIONS_TABLE,
    count: MIGRATION_COUNT_ALL,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: console.warn,
      error: console.error,
    },
  });
};
