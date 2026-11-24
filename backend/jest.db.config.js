/**
 * Integration suite against a real PostgreSQL instance (repositories, schema,
 * constraints, migrations). Run with `npm run test:db` and TEST_DATABASE_URL set.
 * The default `npm test` skips these files; see testPathIgnorePatterns in jest.config.js.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  testMatch: ['**/__tests__/db/**/*.test.ts'],
  globalSetup: '<rootDir>/jest.db.globalSetup.cjs',
  setupFiles: ['<rootDir>/jest.db.setupEnv.cjs'],
  maxWorkers: 1,
  collectCoverageFrom: ['src/repositories/**/*.ts', 'src/config/db.ts'],
  coverageDirectory: 'coverage/db-integration',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
};
