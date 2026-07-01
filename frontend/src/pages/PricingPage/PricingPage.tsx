import { useNavigate } from 'react-router-dom';
import { Star, Check, Shield, Lock, Globe, ChevronRight } from 'lucide-react';
import { ROUTES } from '../../constants';
import { Navbar, Footer } from '../../components/layout';
import styles from './PricingPage.module.scss';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    description: 'For individual investors getting started',
    features: [
      'Up to 15 positions',
      '1 broker import/month',
      'Basic P&L tracking',
      'Dividend calendar',
      'Community support',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For active portfolio managers',
    features: [
      'Unlimited positions',
      'Unlimited broker imports',
      'Gemini AI Insights (50/mo)',
      'Advanced backtesting',
      'Stock screener',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Institutional',
    price: '$49',
    period: '/month',
    description: 'For advisors managing multiple portfolios',
    features: [
      'Everything in Pro',
      'Unlimited AI requests',
      'Multi-portfolio management',
      'API access',
      'White-label reports',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const PRIVACY_FEATURES = [
  { icon: Lock, label: 'End-to-End Encrypted' },
  { icon: Globe, label: 'No IP Logging' },
  { icon: Shield, label: 'No KYC Required' },
];

export function PricingPage() {
  const navigate = useNavigate();

  const handleRegister = () => navigate(ROUTES.REGISTER);

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <Navbar activeRoute="pricing" />

      {/* ── Content ── */}
      <main className={styles.content}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Star size={12} color="#F59E0B" />
            Pricing
          </div>
          <h1 className={styles.title}>Transparent, no-surprise pricing</h1>
        </div>

        {/* ── Plans ── */}
        <div className={styles.plansGrid}>
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.planCard} ${plan.highlighted ? styles.highlighted : ''}`}
            >
              {plan.badge && <div className={styles.planBadge}>{plan.badge}</div>}

              <div>
                <div className={styles.planNameLabel}>{plan.name}</div>
                <div className={styles.planPriceRow}>
                  <span className={styles.planPrice}>{plan.price}</span>
                  <span className={styles.planPeriod}>{plan.period}</span>
                </div>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              <div className={styles.planFeatures}>
                {plan.features.map((feature) => (
                  <div key={feature} className={styles.planFeatureItem}>
                    <Check size={13} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                    {feature}
                  </div>
                ))}
              </div>

              <button
                onClick={handleRegister}
                className={plan.highlighted ? styles.btnPlanHighlighted : styles.btnPlanDefault}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* ── Privacy banner ── */}
        <div className={styles.privacyCard}>
          <div className={styles.privacyGlow} />
          <div className={styles.privacyIconWrap}>
            <Shield size={26} color="#10B981" />
          </div>
          <div className={styles.privacyBody}>
            <div className={styles.privacyTitleRow}>
              <h3 className={styles.privacyTitle}>Zero Personal Data Tracked</h3>
              <span className={styles.privacyCertBadge}>CERTIFIED</span>
            </div>
            <p className={styles.privacyText}>
              We separate your financial records from your identity using cryptographic
              architecture. No real names, no phone numbers, no bank connections.{' '}
              <strong>Your assets remain your business.</strong>
            </p>
            <div className={styles.privacyFeatures}>
              {PRIVACY_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className={styles.privacyFeatureItem}>
                  <Icon size={12} color="#10B981" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <button className={styles.btnCta} onClick={handleRegister}>
            Start Anonymously
            <ChevronRight size={14} />
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
