/**
 * Points the application's own database pool at the test database before any
 * module reads DATABASE_URL.
 */
const { readTestDatabaseUrl } = require('./jest.db.testDatabase.cjs');

const { databaseUrl } = readTestDatabaseUrl();

process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'test';
