import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Database,
  Key,
  Server,
  FileX,
  UserX,
  Fingerprint,
  ArrowRight,
  Check,
} from 'lucide-react';
import { ROUTES } from '../../constants';
import { PAGE_SEO_METADATA } from '../../constants/seo';
import { Navbar, Footer } from '../../components/layout';
import { joinClassNames } from '../../utils/classNames';
import { usePageSeo } from '../../hooks/usePageSeo';
import styles from './SecurityPage.module.scss';

type SecurityAccentTone = 'primary' | 'indigo' | 'warning' | 'danger' | 'pink';

interface Pillar {
  icon: React.ElementType;
  accent: SecurityAccentTone;
  title: string;
  description: string;
  points: string[];
}

const PILLARS: Pillar[] = [
  {
    icon: UserX,
    accent: 'primary',
    title: 'Zero-Identity by Design',
    description:
      'Your financial data is completely decoupled from your personal identity. We never ask for your real name, phone number, address, or government-issued ID.',
    points: [
      'No real name, phone, or address required',
      'No KYC process, ever',
      'Portfolio data is never linked to your email',
      'No link between portfolio and identity',
    ],
  },
  {
    icon: Lock,
    accent: 'indigo',
    title: 'Encrypted & Hardened by Default',
    description:
      'Every connection to our servers is encrypted. Passwords are hashed with bcrypt and are never stored — or recoverable — in plain text. Sessions run on short-lived tokens that renew automatically while you\u2019re active and expire quickly when you\u2019re not.',
    points: [
      'Encrypted connections end to end',
      'bcrypt password hashing, never reversible',
      'Short-lived, self-renewing session tokens',
      'HttpOnly cookies — invisible to JavaScript',
    ],
  },
  {
    icon: Server,
    accent: 'warning',
    title: 'Minimal Data Storage',
    description:
      'We store only what is strictly necessary: your email, a hashed password, and anonymised trade records. No browser fingerprints, no IP logs, no analytics cookies.',
    points: [
      'No IP address logging',
      'No tracking cookies',
      'No browser fingerprinting',
      'Uploaded broker files never touch disk',
    ],
  },
];

interface TechCard {
  icon: React.ElementType;
  accent: SecurityAccentTone;
  title: string;
  body: string;
  tags: string[];
}

const TECH_CARDS: TechCard[] = [
  {
    icon: Key,
    accent: 'primary',
    title: 'Authentication & Sessions',
    body: 'Authentication uses short-lived JWTs, transmitted exclusively via HttpOnly, Secure, SameSite=Strict cookies — inaccessible to JavaScript and immune to token theft via XSS. Sessions renew automatically while you\u2019re active and expire quickly when you\u2019re not. Login and registration are rate-limited against brute-force attempts.',
    tags: ['JWT', 'HttpOnly Cookie', 'SameSite=Strict', 'Rate-Limited'],
  },
  {
    icon: FileX,
    accent: 'danger',
    title: 'Broker Report Processing',
    body: 'Uploaded CSV and XLSX broker reports are parsed entirely in-memory using a streaming reader. The raw file bytes never touch the server disk and are garbage-collected immediately after parsing. Only the extracted trade records (ticker, quantity, price, date) are persisted.',
    tags: ['In-memory parsing', 'No disk write', 'Immediate GC', 'Field-only storage'],
  },
  {
    icon: Database,
    accent: 'indigo',
    title: 'Database Architecture',
    body: 'Your login (email + password hash) and your portfolio (positions, transactions, watchlist) live in separate tables with no direct foreign key between them. Portfolio records are addressed by a one-way cryptographic token derived from your account — not your email — so the two halves can\u2019t be casually joined, even with full database access.',
    tags: ['Cryptographic linkage', 'No direct FK', 'No real names in DB', 'PostgreSQL'],
  },
  {
    icon: Eye,
    accent: 'warning',
    title: 'No Telemetry, No Ads',
    body: 'Krepton Analytics does not embed Google Analytics, Meta Pixel, Hotjar, or any advertising SDK. The only third-party script we load is Google\u2019s own sign-in button, used strictly for authentication. Everything else is blocked by a strict Content Security Policy.',
    tags: ['No Google Analytics', 'No Meta Pixel', 'Strict CSP', 'No ad SDKs'],
  },
  {
    icon: EyeOff,
    accent: 'primary',
    title: 'AI Feature Privacy',
    body: 'AI-powered insights use only anonymised, aggregated portfolio metrics — ticker symbols, weights, and basic statistics. No raw transaction history or personal identifiers are ever sent to the AI provider. Every AI feature is capped by a daily usage limit per account.',
    tags: ['Anonymised metrics only', 'No raw transactions', 'Rate limited', 'No PII to AI'],
  },
  {
    icon: Fingerprint,
    accent: 'pink',
    title: 'Account Deletion',
    body: 'Deleting your account permanently removes your login and your entire portfolio — positions, transactions, watchlist — immediately. There\u2019s no grace period and no lingering copy: only anonymised, aggregate statistics for platform health monitoring survive, and those can\u2019t be traced back to you.',
    tags: ['Instant deletion', 'Fully irreversible', 'No backup of PII', 'Aggregate only'],
  },
];

const SECURITY_ACCENT_CLASS_NAME: Record<SecurityAccentTone, string> = {
  primary: styles.accentPrimary,
  indigo: styles.accentIndigo,
  warning: styles.accentWarning,
  danger: styles.accentDanger,
  pink: styles.accentPink,
};

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Can Krepton employees see my portfolio?',
    answer:
      'No one can casually browse your holdings. Your portfolio is addressed by a one-way cryptographic token derived from your account, not by your email or a readable ID — so it can\u2019t be traced back to a login without deriving that token, and access to production systems is restricted and audited.',
  },
  {
    question: 'What happens to my data if I delete my account?',
    answer:
      'Everything is hard-deleted immediately and permanently — your login and your entire portfolio. Only anonymous, aggregated platform statistics (e.g., total active users) are retained for monitoring — no per-user data is archived.',
  },
  {
    question: 'Is my broker login stored anywhere?',
    answer:
      'Never. Krepton uses CSV/XLSX import — we never ask for your broker credentials, API keys, or account numbers. Import is a one-time file upload, fully in-memory.',
  },
  {
    question: 'Where is the data hosted?',
    answer:
      'On managed cloud infrastructure in the EU, with encrypted connections and strict access controls throughout. We don\u2019t publish exact vendor names or internal topology — keeping that footprint private is itself part of our security posture.',
  },
  {
    question: 'How are AI portfolio insights generated?',
    answer:
      'The AI module receives only anonymised portfolio metrics: ticker symbols, allocation weights, and summary statistics. No transaction history, timestamps, or any identifier leaves the platform.',
  },
  {
    question: 'Do you comply with GDPR?',
    answer:
      'We built the platform to minimise personal data from day one — no real names, no phone numbers, no bank connections, ever. Email and a hashed password are the only identifying information we hold. Full account and data erasure is available on request and takes effect immediately.',
  },
];

export function SecurityPage() {
  const navigate = useNavigate();

  usePageSeo(PAGE_SEO_METADATA[ROUTES.SECURITY]);

  const handleRegister = () => navigate(ROUTES.REGISTER);
  const handlePricing = () => navigate(ROUTES.PRICING);

  return (
    <div className={styles.page}>
      <Navbar activeRoute="security" />

      <main className={styles.body}>
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroGrid} />
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>
              <Shield size={12} />
              Security & Privacy
            </div>
            <h1 className={styles.heroTitle}>
              Your finances. <span>Your secrets.</span> Always.
            </h1>
            <p className={styles.heroSubtitle}>
              Krepton was built with privacy as a core constraint, not an afterthought. No real
              names. No bank connections. No identity linking. We designed the architecture so that
              your trades can never be traced back to who you are.
            </p>
            <button className={styles.heroCta} onClick={handleRegister}>
              Start Anonymously
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* ── Three pillars ── */}
        <section className={styles.pillars}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionBadge}>
                <Lock size={12} className={styles.accentIcon} />
                Core Principles
              </div>
              <h2 className={styles.sectionTitle}>
                Three pillars of <span>zero-identity architecture</span>
              </h2>
            </div>

            <div className={styles.pillarsGrid}>
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className={styles.pillarCard}>
                    <div
                      className={joinClassNames(
                        styles.pillarIconWrap,
                        SECURITY_ACCENT_CLASS_NAME[pillar.accent]
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                      <p className={styles.pillarDesc}>{pillar.description}</p>
                    </div>
                    <div className={styles.pillarPoints}>
                      {pillar.points.map((point) => (
                        <div key={point} className={styles.pillarPoint}>
                          <Check size={13} className={styles.pillarPointIcon} />
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Technical details ── */}
        <section className={styles.techSection}>
          <div className={styles.techSectionGrid} aria-hidden="true" />
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionBadge}>
                <Key size={12} className={styles.accentIcon} />
                Technical Implementation
              </div>
              <h2 className={styles.sectionTitle}>
                How we protect <span>every layer</span>
              </h2>
            </div>

            <div className={styles.techGrid}>
              {TECH_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className={styles.techCard}>
                    <div className={styles.techCardHeader}>
                      <div
                        className={joinClassNames(
                          styles.techCardIcon,
                          SECURITY_ACCENT_CLASS_NAME[card.accent]
                        )}
                      >
                        <Icon size={17} />
                      </div>
                      <h3 className={styles.techCardTitle}>{card.title}</h3>
                    </div>
                    <p className={styles.techCardBody}>{card.body}</p>
                    <div className={styles.techTags}>
                      {card.tags.map((tag) => (
                        <span key={tag} className={styles.techTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className={styles.faq}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionBadge}>
                <Shield size={12} className={styles.accentIcon} />
                Frequently Asked
              </div>
              <h2 className={styles.sectionTitle}>
                Security <span>questions answered</span>
              </h2>
            </div>

            <div className={styles.faqGrid}>
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className={styles.faqCard}>
                  <h3 className={styles.faqQuestion}>{item.question}</h3>
                  <p className={styles.faqAnswer}>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={styles.ctaBanner}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaGlow} />
            <h2 className={styles.ctaTitle}>Privacy-first investing starts here.</h2>
            <p className={styles.ctaSubtitle}>
              Join investors who demand institutional-grade analytics without sacrificing their
              identity. No real names. No bank connections. Just pure, anonymous math.
            </p>
            <div className={styles.ctaButtons}>
              <button className={styles.btnCtaPrimary} onClick={handleRegister}>
                Start Anonymously
                <ArrowRight size={16} />
              </button>
              <button className={styles.btnCtaOutline} onClick={handlePricing}>
                View Pricing
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
