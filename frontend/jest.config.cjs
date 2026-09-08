/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/jest.polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/src/utils/fileMock.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': '<rootDir>/jest-ts-transformer.cjs',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/main.tsx',
    '!src/router/**',
    '!src/utils/fileMock.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  // No coverageThreshold: current SPA unit coverage is ~7%. Gating 70%/80% would be dishonest until more RTL tests exist.
};
