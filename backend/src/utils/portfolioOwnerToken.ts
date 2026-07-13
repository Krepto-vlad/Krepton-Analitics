import { createHmac } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Derives a portfolio owner token from the user's UUID.
 * Same HMAC used for positions, transactions, and watchlist.
 */
export function computePortfolioOwnerToken(userId: string): string {
  return createHmac('sha256', env.portfolioSecret).update(userId).digest('hex');
}
