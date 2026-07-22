import 'dotenv/config';

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function parseBooleanEnv(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }

  return value === 'true' || value === '1';
}

export const env = {
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  jwtSecret: optionalEnv('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  databaseUrl: optionalEnv('DATABASE_URL', ''),
  // Used to compute HMAC(userId) stored as owner_token in portfolio_accounts.
  // Without this secret an attacker who dumps the DB cannot link positions to users.
  portfolioSecret: optionalEnv('PORTFOLIO_SECRET', 'change-me-in-production-portfolio'),
  geminiApiKey: optionalEnv('GEMINI_API_KEY', ''),
  geminiGroundingEnabled: parseBooleanEnv('GEMINI_GROUNDING_ENABLED', false),
} as const;

export const isGeminiConfigured = env.geminiApiKey.length > 0;
export const isGeminiGroundingEnabled = env.geminiGroundingEnabled && isGeminiConfigured;

export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
