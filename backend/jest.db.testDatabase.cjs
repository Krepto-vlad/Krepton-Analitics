/**
 * Shared guard for the real-Postgres integration suite (`npm run test:db`).
 *
 * The suite truncates every table between tests, so it must never run against
 * a development or production database. It reads TEST_DATABASE_URL only and
 * refuses any database whose name does not contain the TEST_DATABASE_NAME_MARKER.
 */

const TEST_DATABASE_URL_VARIABLE = 'TEST_DATABASE_URL';
const TEST_DATABASE_NAME_MARKER = 'test';
const ADMIN_DATABASE_NAME = 'postgres';

function readTestDatabaseUrl() {
  const databaseUrl = process.env[TEST_DATABASE_URL_VARIABLE];

  if (!databaseUrl) {
    throw new Error(
      `${TEST_DATABASE_URL_VARIABLE} is required, for example ` +
        'postgresql://postgres:postgres@localhost:5432/krepton_test'
    );
  }

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''));

  if (!databaseName.toLowerCase().includes(TEST_DATABASE_NAME_MARKER)) {
    throw new Error(
      `Refusing to run against database "${databaseName}": ` +
        `its name must contain "${TEST_DATABASE_NAME_MARKER}" because the suite truncates all tables.`
    );
  }

  return { databaseUrl, databaseName };
}

function buildAdminDatabaseUrl(databaseUrl) {
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = `/${ADMIN_DATABASE_NAME}`;
  return adminUrl.toString();
}

module.exports = {
  TEST_DATABASE_URL_VARIABLE,
  readTestDatabaseUrl,
  buildAdminDatabaseUrl,
};
