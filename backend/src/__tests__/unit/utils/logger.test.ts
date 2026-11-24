const ORIGINAL_ENVIRONMENT = { ...process.env };

function loadLoggerOutsideJestWorker(overrides: Record<string, string | undefined>): {
  level: string;
} {
  jest.resetModules();
  delete process.env.JEST_WORKER_ID;
  delete process.env.LOG_LEVEL;
  Object.assign(process.env, { NODE_ENV: 'production' }, overrides);

  let loadedLogger: { level: string } | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loadedLogger = require('../../../utils/logger.js').logger as { level: string };
  });
  return loadedLogger as { level: string };
}

describe('logger level resolution', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENVIRONMENT };
  });

  it('is silent inside a Jest worker', () => {
    process.env.LOG_LEVEL = 'debug';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { logger } = require('../../../utils/logger.js') as { logger: { level: string } };
      expect(logger.level).toBe('silent');
    });
  });

  it('defaults to info in production', () => {
    expect(loadLoggerOutsideJestWorker({}).level).toBe('info');
  });

  it('honours a valid LOG_LEVEL override', () => {
    expect(loadLoggerOutsideJestWorker({ LOG_LEVEL: 'warn' }).level).toBe('warn');
    expect(loadLoggerOutsideJestWorker({ LOG_LEVEL: 'silent' }).level).toBe('silent');
  });

  it('ignores an unknown LOG_LEVEL value', () => {
    expect(loadLoggerOutsideJestWorker({ LOG_LEVEL: 'verbose-please' }).level).toBe('info');
  });
});
