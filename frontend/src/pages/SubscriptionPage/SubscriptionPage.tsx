import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, Sparkles } from 'lucide-react';
import { ROUTES } from '../../constants';
import {
  CURRENT_DEMO_PLAN_ID,
  PRICING_PLAN_DEFINITIONS,
  SUBSCRIPTION_PLAN_CALL_TO_ACTIONS,
  type PricingPlanDefinition,
} from '../../constants/pricingPlans';
import styles from './SubscriptionPage.module.scss';

export function SubscriptionPage() {
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  function handlePlanAction(plan: PricingPlanDefinition) {
    if (plan.id === CURRENT_DEMO_PLAN_ID) {
      return;
    }

    setDemoNotice(
      `${plan.name} checkout is a demo preview only. Billing is not enabled in this POC — you stay on Free.`
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={ROUTES.PROFILE} className={styles.backLink}>
          <ArrowLeft size={14} />
          Back to profile
        </Link>
        <div className={styles.titleRow}>
          <CreditCard size={22} className={styles.titleIcon} />
          <h2 className={styles.title}>Subscription</h2>
        </div>
        <p className={styles.subtitle}>
          Choose a plan for your portfolio workspace. Payments are not processed in this demo.
        </p>
      </header>

      <section className={styles.currentPlanCard}>
        <div className={styles.currentPlanInfo}>
          <Sparkles size={18} className={styles.currentPlanIcon} />
          <div>
            <p className={styles.currentPlanLabel}>Current plan</p>
            <p className={styles.currentPlanName}>Free — $0 / forever</p>
          </div>
        </div>
        <span className={styles.activeBadge}>Active</span>
      </section>

      {demoNotice && (
        <p className={styles.demoNotice} role="status">
          {demoNotice}
        </p>
      )}

      <div className={styles.plansGrid}>
        {PRICING_PLAN_DEFINITIONS.map((plan) => {
          const isCurrent = plan.id === CURRENT_DEMO_PLAN_ID;

          return (
            <article
              key={plan.id}
              className={`${styles.planCard} ${plan.highlighted ? styles.planCardHighlighted : ''}`}
            >
              {plan.badge && <span className={styles.planBadge}>{plan.badge}</span>}

              <div>
                <p className={styles.planName}>{plan.name}</p>
                <div className={styles.planPriceRow}>
                  <span className={styles.planPrice}>{plan.price}</span>
                  <span className={styles.planPeriod}>{plan.period}</span>
                </div>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              <ul className={styles.featureList}>
                {plan.features.map((feature) => (
                  <li key={feature} className={styles.featureItem}>
                    <Check size={13} className={styles.featureCheck} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={plan.highlighted ? styles.primaryPlanButton : styles.secondaryPlanButton}
                onClick={() => handlePlanAction(plan)}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current plan' : SUBSCRIPTION_PLAN_CALL_TO_ACTIONS[plan.id]}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
