import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { env, isProduction } from '../config/env.js';
import { pool } from '../config/db.js';
import {
  BCRYPT_SALT_ROUNDS,
  EMAIL_VERIFICATION_TOKEN_BYTES,
  EMAIL_VERIFICATION_TTL_MS,
  SEED_DEMO_EMAIL,
  SEED_DEMO_PASSWORD_FALLBACK,
} from '../constants.js';
import {
  createPasswordUser,
  findUserByEmail,
  markEmailVerified,
} from '../repositories/userRepository.js';
import {
  addTransaction,
  findOrCreatePortfolioAccount,
  upsertPosition,
} from '../repositories/portfolioRepository.js';
import { insertWatchlistItem } from '../repositories/watchlistRepository.js';
import { logger } from '../utils/logger.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';

interface SeedHolding {
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  currency: 'USD';
  sector: string;
  entryDate: string;
}

const SEED_DEMO_HOLDINGS: SeedHolding[] = [
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    shares: 10,
    avgBuyPrice: 180,
    currency: 'USD',
    sector: 'Technology',
    entryDate: '2024-01-16',
  },
  {
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    shares: 5,
    avgBuyPrice: 380,
    currency: 'USD',
    sector: 'Technology',
    entryDate: '2024-03-04',
  },
];

const SEED_DEMO_WATCHLIST_TICKER = 'NVDA';
const SEED_DEMO_WATCHLIST_NAME = 'NVIDIA Corporation';

async function seedDemo(): Promise<void> {
  if (isProduction) {
    throw new Error('seed:demo is refused in production');
  }

  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required for seed:demo');
  }

  const existingUser = await findUserByEmail(SEED_DEMO_EMAIL);
  if (existingUser) {
    logger.info(
      { email: SEED_DEMO_EMAIL },
      'seed:demo skipped — demo user already exists. Sign in with that email.'
    );
    return;
  }

  const password = env.seedDemoPassword || SEED_DEMO_PASSWORD_FALLBACK;
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const verificationTokenHash = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
  const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  const user = await createPasswordUser(
    SEED_DEMO_EMAIL,
    passwordHash,
    verificationTokenHash,
    verificationExpiresAt
  );
  await markEmailVerified(user.id);

  const portfolioId = await findOrCreatePortfolioAccount(computePortfolioOwnerToken(user.id));

  for (const holding of SEED_DEMO_HOLDINGS) {
    await upsertPosition(portfolioId, holding);
    await addTransaction(portfolioId, {
      ticker: holding.ticker,
      companyName: holding.companyName,
      shares: holding.shares,
      pricePerShare: holding.avgBuyPrice,
      currency: holding.currency,
      transactionDate: holding.entryDate,
      transactionType: 'BUY',
    });
  }

  await insertWatchlistItem(portfolioId, SEED_DEMO_WATCHLIST_TICKER, SEED_DEMO_WATCHLIST_NAME);

  logger.info(
    { email: SEED_DEMO_EMAIL, holdings: SEED_DEMO_HOLDINGS.length },
    'seed:demo created a verified demo user with sample holdings. Not for production.'
  );
}

seedDemo()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'seed:demo failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
