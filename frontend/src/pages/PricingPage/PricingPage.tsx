import { useNavigate } from 'react-router-dom';
import { Star, Check, Shield, Lock, Globe, ChevronRight } from 'lucide-react';
import { ROUTES } from '../../constants';
import {
  MARKETING_PLAN_CALL_TO_ACTIONS,
  PRICING_PLAN_DEFINITIONS,
} from '../../constants/pricingPlans';
import { Navbar, Footer } from '../../components/layout';
import styles from './PricingPage.module.scss';

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

      <main className={styles.content}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Star size={12} color="#F59E0B" />
            Pricing
          </div>
          <h1 className={styles.title}>Transparent, no-surprise pricing</h1>
        </div>

        <div className={styles.plansGrid}>
          {PRICING_PLAN_DEFINITIONS.map((plan) => (
            <div
              key={plan.id}
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
                    <Check size={13} className={styles.planFeatureIcon} />
                    {feature}
                  </div>
                ))}
              </div>

              <button
                onClick={handleRegister}
                className={plan.highlighted ? styles.btnPlanHighlighted : styles.btnPlanDefault}
              >
                {MARKETING_PLAN_CALL_TO_ACTIONS[plan.id]}
              </button>
            </div>
          ))}
        </div>

        <div className={styles.privacyCard}>
          <div className={styles.privacyGlow} />
          <div className={styles.privacyIconWrap}>
            <Shield size={26} />
          </div>
          <div className={styles.privacyBody}>
            <div className={styles.privacyTitleRow}>
              <h2 className={styles.privacyTitle}>Zero Personal Data Tracked</h2>
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
                  <Icon size={12} className={styles.accentIcon} />
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
