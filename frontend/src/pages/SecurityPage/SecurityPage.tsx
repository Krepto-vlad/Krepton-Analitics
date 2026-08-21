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
import { Navbar, Footer } from '../../components/layout';
import { joinClassNames } from '../../utils/classNames';
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
      'Nickname-only registration',
      'No KYC process, ever',
      'Email stored as a one-way hash',
      'No link between portfolio and identity',
    ],
  },
  {
    icon: Lock,
    accent: 'indigo',
    title: 'End-to-End Encryption',
    description:
      'All data in transit is encrypted via TLS 1.3. Sensitive fields at rest are encrypted with AES-256. Passwords are hashed using bcrypt with a per-user salt.',
    points: [
      'TLS 1.3 in transit',
      'AES-256 at rest for sensitive fields',
      'bcrypt with cost factor ≥ 12',
      'Per-user cryptographic salt',
    ],
  },
  {
    icon: Server,
    accent: 'warning',
    title: 'Minimal Data Storage',
    description:
      'We store only what is strictly necessary: email hash, password hash, and anonymised trade records. No browser fingerprints, no IP logs, no analytics cookies.',
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
    body: 'Authentication is based on JWT tokens with a short expiry window. Tokens are transmitted exclusively via HttpOnly, Secure, SameSite=Strict cookies — making them inaccessible to JavaScript and immune to XSS attacks. Refresh tokens are rotated on every use.',
    tags: ['JWT', 'HttpOnly Cookie', 'SameSite=Strict', 'Token Rotation'],
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
    body: 'The PostgreSQL schema is split into two isolated logical zones: an auth zone (email hash + password hash) and a portfolio zone (userId foreign key + trade data). These zones share no columns containing personal identifiers, making re-identification technically unfeasible.',
    tags: ['Split-zone schema', 'FK without PII', 'No real names in DB', 'PostgreSQL'],
  },
  {
    icon: Eye,
    accent: 'warning',
    title: 'No Telemetry, No Ads',
    body: 'Krepton Analytics does not embed Google Analytics, Meta Pixel, Hotjar, or any third-party tracking script. There are no advertising SDKs. The only external calls the frontend makes are to our own backend API — everything else is blocked by a strict Content Security Policy.',
    tags: ['No Google Analytics', 'No Meta Pixel', 'Strict CSP', 'No ad SDKs'],
  },
  {
    icon: EyeOff,
    accent: 'primary',
    title: 'AI Feature Privacy',
    body: 'AI-powered insights use only anonymised, aggregated portfolio metrics — ticker symbols, weights, and basic statistics. No raw transaction details or personal identifiers are ever sent to an external model. All AI calls are rate-limited per account.',
    tags: ['Anonymised metrics only', 'No raw transactions', 'Rate limited', 'No PII to AI'],
  },
  {
    icon: Fingerprint,
    accent: 'pink',
    title: 'Account Deletion',
    body: 'A full account deletion request removes all records from both the auth and portfolio zones within 24 hours. Deletion is irreversible. No backup retention of personal data after deletion — only anonymised aggregate statistics for platform health monitoring are retained.',
    tags: ['< 24h deletion', 'Fully irreversible', 'No backup of PII', 'Aggregate only'],
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
      'No. Portfolio data is stored against an internal userId with no link to a real-world identity. Without access to both the auth and portfolio zones simultaneously, individual data is meaningless — and access to production is audited.',
  },
  {
    question: 'What happens to my data if I delete my account?',
    answer:
      'All records in the auth and portfolio zones are hard-deleted within 24 hours. Only anonymous, aggregated platform statistics (e.g., total active users) are retained for monitoring — no per-user data is archived.',
  },
  {
    question: 'Is my broker login stored anywhere?',
    answer:
      'Never. Krepton uses CSV/XLSX import — we never ask for your broker credentials, API keys, or account numbers. Import is a one-time file upload, fully in-memory.',
  },
  {
    question: 'Where is the data hosted?',
    answer:
      'The backend runs on Render.com and the database on Neon.tech — both EU/US SOC 2 compliant providers. Data in transit is encrypted with TLS 1.3 and data at rest with AES-256.',
  },
  {
    question: 'How are AI portfolio insights generated?',
    answer:
      'The AI module receives only anonymised portfolio metrics: ticker symbols, allocation weights, and summary statistics. No transaction history, timestamps, or any identifier leaves the platform.',
  },
  {
    question: 'Do you comply with GDPR?',
    answer:
      'By design, we minimise personal data to the point where GDPR obligations are minimal. Email is stored as a one-way hash and is not considered personal data in our schema. Full erasure on request is supported in under 24 hours.',
  },
];

export function SecurityPage() {
  const navigate = useNavigate();

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
              Krepton was built with privacy as a core constraint, not an afterthought. Zero
              personal data collected. No bank connections. No identity linking. We designed the
              architecture so that a security breach of our servers exposes no meaningful personal
              information.
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
