import 'dotenv/config';

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  jwtSecret: optionalEnv('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  databaseUrl: optionalEnv('DATABASE_URL', ''),
} as const;

export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
