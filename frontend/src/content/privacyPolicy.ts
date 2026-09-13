import {
  LEGAL_AUTH_COOKIE_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_NOT_INVESTMENT_ADVICE,
} from './legalConstants';
import type { LegalDocumentContent } from './legal.types';

export const PRIVACY_POLICY_CONTENT: LegalDocumentContent = {
  title: 'Privacy Policy',
  intro:
    'This policy describes how Krepton Analytics processes personal data. It is an honest product description, not a lawyer-reviewed legal opinion.',
  sections: [
    {
      id: 'controller',
      title: '1. Controller and contact',
      paragraphs: [
        `The service is operated as Krepton Analytics. For privacy questions, account access, or erasure requests, contact ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: 'what-we-store',
      title: '2. What we store',
      paragraphs: [
        'We minimise identity data. We do not ask for your legal name, phone number, address, or government ID. Email is stored as your login identifier (plain text), not as a one-way hash.',
      ],
      bullets: [
        'Account: email, bcrypt password hash, optional Google subject identifier, email verification status',
        'Portfolio: positions, transactions, watchlist items, and the selected rebalancing strategy, linked to your user id (pseudonymised trade records — not names or broker account numbers)',
        'AI usage counters used to enforce daily quotas',
        'Session: a strictly necessary authentication cookie',
      ],
    },
    {
      id: 'what-we-do-not-store',
      title: '3. What we do not store',
      paragraphs: [
        'Broker statement files are parsed in server memory and are not written to disk. We do not store full names, phone numbers, IBANs, or brokerage account numbers from those files.',
      ],
    },
    {
      id: 'purposes',
      title: '4. Why we process data',
      paragraphs: [
        'We process data to create and secure your account, show portfolio analytics, convert display currencies, and run optional AI explanations. Lawful bases we rely on: performance of a contract (providing the tool you signed up for) and legitimate interests (security, abuse prevention, and product integrity).',
        LEGAL_NOT_INVESTMENT_ADVICE,
      ],
    },
    {
      id: 'cookies',
      title: '5. Cookies and session',
      paragraphs: [
        `We set one strictly necessary cookie named ${LEGAL_AUTH_COOKIE_NAME}. It holds a short-lived JWT, is HttpOnly, and is intended to be Secure with SameSite restrictions so client JavaScript cannot read it. We do not use analytics, advertising, or tracking cookies, so a consent banner is not required for this cookie.`,
      ],
    },
    {
      id: 'rights',
      title: '6. Your rights',
      paragraphs: [
        'You can export a copy of your portfolio snapshot (positions, transactions, watchlist) from Profile. You can permanently delete your account from Profile; that hard-deletes the login and linked portfolio data. You may also contact us using the email above to exercise access or erasure.',
      ],
    },
    {
      id: 'processors',
      title: '7. Processors and transfers',
      paragraphs: [
        'We use subprocessors only to run the product. We do not sell personal data.',
        'Optional AI features send prompts and truncated, anonymised samples to Google Gemini. That processing can occur in the United States. Google participates in the EU–US Data Privacy Framework; we use Gemini only for generating informational text, not to store your full broker statements.',
        'If you sign in with Google, Google Identity receives the OAuth handshake. Transactional mail (email verification, password reset) is sent through Resend. Paid subscriptions are sold by Paddle.com Market Ltd (Merchant of Record). Paddle collects payment, billing address, and tax details, emails the invoice, and remits VAT/sales tax. We store only Paddle customer/subscription ids and entitlement dates — never card numbers. Market quotes and news may be fetched from public market-data providers (for example Yahoo Finance) so the product can display prices. Those quote requests are not used to sell advertising about you.',
        'DNS and the redirect from kreptonanalytics.com to www are handled by Cloudflare. Cloudflare may process connection metadata (such as IP address) as any HTTPS reverse proxy does. The live site itself is served from Microsoft Azure, as described in Hosting.',
      ],
    },
    {
      id: 'hosting',
      title: '8. Hosting',
      paragraphs: [
        'Production personal data (accounts, portfolio rows, AI quota/cache) is stored in Azure Database for PostgreSQL Flexible Server in North Europe (Ireland, EEA). The API runs on Azure Container Apps in the same region.',
        'The public website (HTML, CSS, JavaScript, and legal PDFs) is hosted on Azure Static Web Apps. That free-tier region is East US 2. The SPA bundle does not contain your email or holdings; those stay in the EU database and are loaded only after you sign in via the EU API.',
        'Container images for the API are stored in GitHub Container Registry. Image storage is not a copy of user accounts.',
      ],
    },
    {
      id: 'retention',
      title: '9. Retention',
      paragraphs: [
        'We keep account and portfolio data while the account exists. After you delete the account, records are hard-deleted rather than soft-deactivated. Authentication cookies expire with the JWT lifetime.',
      ],
    },
  ],
};
