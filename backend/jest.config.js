/** Backend min is 70%; Backend max quality gate and this CI threshold are 80%. */
const DIPLOMA_COVERAGE_MIN_PERCENT = 80;

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
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/index.ts', '!src/scripts/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: DIPLOMA_COVERAGE_MIN_PERCENT,
      lines: DIPLOMA_COVERAGE_MIN_PERCENT,
      functions: DIPLOMA_COVERAGE_MIN_PERCENT,
    },
  },
};
