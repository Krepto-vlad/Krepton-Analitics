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
  seedDemoPassword: optionalEnv('SEED_DEMO_PASSWORD', ''),
  // Used to compute HMAC(userId) stored as owner_token in portfolio_accounts.
  // Without this secret an attacker who dumps the DB cannot link positions to users.
  portfolioSecret: optionalEnv('PORTFOLIO_SECRET', 'change-me-in-production-portfolio'),
  geminiApiKey: optionalEnv('GEMINI_API_KEY', ''),
  geminiGroundingEnabled: parseBooleanEnv('GEMINI_GROUNDING_ENABLED', false),
  googleClientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
  smtpHost: optionalEnv('SMTP_HOST', ''),
  smtpPort: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
  smtpUser: optionalEnv('SMTP_USER', ''),
  smtpPassword: optionalEnv('SMTP_PASSWORD', ''),
  smtpFrom: optionalEnv('SMTP_FROM', 'Krepton Analytics <noreply@krepton.local>'),
} as const;

export const isGoogleAuthConfigured = env.googleClientId.length > 0;
export const isSmtpConfigured =
  env.smtpHost.length > 0 && env.smtpUser.length > 0 && env.smtpPassword.length > 0;

export const isGeminiConfigured = env.geminiApiKey.length > 0;
export const isGeminiGroundingEnabled = env.geminiGroundingEnabled && isGeminiConfigured;

export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
