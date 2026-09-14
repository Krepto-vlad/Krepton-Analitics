import { ROUTES } from '../constants';

export const SITE_NAME = 'Krepton Analytics';

/**
 * Production origin (used only for JSON-LD `url`/`logo` — canonical links are derived
 * from `window.location`). Must be `www` — the apex domain (no `www`) has no DNS record
 * pointing at Azure Static Web Apps and does not resolve; see `robots.txt` / `sitemap.xml`.
 */
export const SITE_URL = 'https://www.kreptonanalytics.com';

/** Kept at or under 160 characters so it renders in full in search results. */
export const SITE_DEFAULT_DESCRIPTION =
  'Krepton Analytics is an anonymous portfolio workspace for live quotes, strategy alignment, rebalancing, and backtesting. Educational, not investment advice.';
export const SITE_DEFAULT_TITLE = `${SITE_NAME} — Anonymous Portfolio Analytics`;

export interface PageSeoMetadata {
  title: string;
  description: string;
  /** Set on transactional/utility pages that must not be indexed (still crawlable, just excluded from results). */
  noIndex?: boolean;
}

/** Per-route <title>/description for public, crawlable pages. Keyed by the static ROUTES paths. */
export const PAGE_SEO_METADATA: Record<string, PageSeoMetadata> = {
  [ROUTES.HOME]: {
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
  },
  [ROUTES.LOGIN]: {
    title: `Sign In — ${SITE_NAME}`,
    description:
      'Sign in to your Krepton Analytics workspace to track positions, dividends, and portfolio alignment.',
  },
  [ROUTES.REGISTER]: {
    title: `Sign Up — ${SITE_NAME}`,
    description:
      'Create a free, anonymous Krepton Analytics account — no KYC, no real names — and start tracking your portfolio in minutes.',
  },
  [ROUTES.PRICING]: {
    title: `Pricing — ${SITE_NAME}`,
    description:
      'Compare Free (file import) and Plus (read-only brokerage import plus higher AI limits) for Krepton Analytics. Educational, not investment advice.',
  },
  [ROUTES.SECURITY]: {
    title: `Security & Privacy — ${SITE_NAME}`,
    description:
      'How Krepton Analytics protects your data: bcrypt password hashing, HttpOnly JWT cookies, and a fully anonymous database model.',
  },
  [ROUTES.LEGAL]: {
    title: `Legal Documents — ${SITE_NAME}`,
    description: 'Privacy Policy and Terms of Service for Krepton Analytics.',
  },
  [ROUTES.FORGOT_PASSWORD]: {
    title: `Forgot Password — ${SITE_NAME}`,
    description: 'Request a password reset link for your Krepton Analytics account.',
    noIndex: true,
  },
  [ROUTES.RESET_PASSWORD]: {
    title: `Reset Password — ${SITE_NAME}`,
    description: 'Set a new password for your Krepton Analytics account.',
    noIndex: true,
  },
  [ROUTES.VERIFY_EMAIL]: {
    title: `Verify Email — ${SITE_NAME}`,
    description: 'Confirm your email address to activate your Krepton Analytics account.',
    noIndex: true,
  },
};

export const NOT_FOUND_SEO_METADATA: PageSeoMetadata = {
  title: `Page Not Found — ${SITE_NAME}`,
  description: 'The page you are looking for does not exist or has moved.',
  noIndex: true,
};

/** Landing page JSON-LD — Organization + SoftwareApplication, combined in one document via @graph. */
export const LANDING_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description: SITE_DEFAULT_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ],
} as const;
