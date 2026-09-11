import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, Sparkles } from 'lucide-react';
import {
  BILLING_CHECKOUT_STATUS_RETRY_ATTEMPTS,
  BILLING_CHECKOUT_STATUS_RETRY_MS,
  ERROR_MESSAGES,
  PADDLE_CHECKOUT_CLOSED_EVENT,
  PADDLE_CHECKOUT_COMPLETED_EVENT,
  ROUTES,
} from '../../constants';
import {
  PRICING_PLAN_DEFINITIONS,
  PRICING_VAT_FOOTNOTE,
  SUBSCRIPTION_PLAN_CALL_TO_ACTIONS,
  type PaidCheckoutInterval,
  type PricingPlanDefinition,
} from '../../constants/pricingPlans';
import { apiCreateBillingCheckout, apiCreateBillingPortal } from '../../api/billingApi';
import { ErrorBanner } from '../../components/ui';
import { fetchCurrentUserThunk } from '../../features/auth/authSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { getRejectedMessage } from '../../utils/apiError';
import { openPaddleCheckout, subscribeToPaddleCheckoutEvents } from '../../utils/paddleCheckout';
import {
  formatSubscriptionHeadline,
  formatSubscriptionPeriodEnd,
} from '../../utils/subscriptionDisplay';
import styles from './SubscriptionPage.module.scss';

function isCurrentPaidPlan(
  plan: PricingPlanDefinition,
  interval: string | null,
  isPaid: boolean
): boolean {
  if (plan.id === 'free') {
    return !isPaid;
  }

  return isPaid && plan.checkoutInterval === interval;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function SubscriptionPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const subscription = user?.subscription;
  const periodHint = subscription ? formatSubscriptionPeriodEnd(subscription) : null;

  useEffect(() => {
    let cancelled = false;

    async function refreshSubscription(retryWhileFree: boolean): Promise<void> {
      const attempts = retryWhileFree ? BILLING_CHECKOUT_STATUS_RETRY_ATTEMPTS : 1;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (cancelled) {
          return;
        }

        const result = await dispatch(fetchCurrentUserThunk());
        if (fetchCurrentUserThunk.fulfilled.match(result) && result.payload.subscription.isPaid) {
          setNotice(null);
          return;
        }

        if (attempt < attempts - 1) {
          await wait(BILLING_CHECKOUT_STATUS_RETRY_MS);
        }
      }
    }

    const unsubscribe = subscribeToPaddleCheckoutEvents((event) => {
      if (event.name === PADDLE_CHECKOUT_COMPLETED_EVENT) {
        void refreshSubscription(true);
        return;
      }

      if (event.name === PADDLE_CHECKOUT_CLOSED_EVENT) {
        void refreshSubscription(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [dispatch]);

  async function handlePaidCheckout(interval: PaidCheckoutInterval) {
    setError(null);
    setNotice(null);
    setIsBusy(true);

    try {
      const checkout = await apiCreateBillingCheckout(interval);
      await openPaddleCheckout(checkout.transactionId);
      setNotice(ERROR_MESSAGES.BILLING_CHECKOUT_OPENED);
    } catch (checkoutError) {
      setError(getRejectedMessage(checkoutError, ERROR_MESSAGES.BILLING_CHECKOUT_FAILED));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleManageBilling() {
    setError(null);
    setIsBusy(true);

    try {
      const portal = await apiCreateBillingPortal();
      window.location.assign(portal.url);
    } catch (portalError) {
      setError(getRejectedMessage(portalError, ERROR_MESSAGES.BILLING_PORTAL_FAILED));
      setIsBusy(false);
    }
  }

  function handlePlanAction(plan: PricingPlanDefinition) {
    if (!plan.checkoutInterval) {
      return;
    }

    void handlePaidCheckout(plan.checkoutInterval);
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
          Paid plans are sold by Paddle. Invoices go to your email. Access stays until the period
          end, including after cancel.
        </p>
      </header>

      <section className={styles.currentPlanCard}>
        <div className={styles.currentPlanInfo}>
          <Sparkles size={18} className={styles.currentPlanIcon} />
          <div>
            <p className={styles.currentPlanLabel}>Current plan</p>
            <p className={styles.currentPlanName}>
              {subscription ? formatSubscriptionHeadline(subscription) : 'Free — $0 / forever'}
            </p>
            {periodHint && <p className={styles.subtitle}>{periodHint}</p>}
          </div>
        </div>
        <span className={styles.activeBadge}>{subscription?.isPaid ? 'Plus' : 'Free'}</span>
      </section>

      {subscription?.source === 'paddle' && (
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.secondaryPlanButton}
            onClick={() => void handleManageBilling()}
            disabled={isBusy}
          >
            Manage billing
          </button>
        </div>
      )}

      <div className={styles.plansGrid}>
        {PRICING_PLAN_DEFINITIONS.map((plan) => {
          const isCurrent = isCurrentPaidPlan(
            plan,
            subscription?.interval ?? null,
            Boolean(subscription?.isPaid)
          );

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
                disabled={isCurrent || isBusy || plan.checkoutInterval === null}
              >
                {isCurrent ? 'Current plan' : SUBSCRIPTION_PLAN_CALL_TO_ACTIONS[plan.id]}
              </button>
            </article>
          );
        })}
      </div>

      <p className={styles.subtitle}>{PRICING_VAT_FOOTNOTE}</p>

      <div className={styles.footerAlerts}>
        {notice && (
          <p className={styles.statusNotice} role="status">
            {notice}
          </p>
        )}
        {error && (
          <ErrorBanner
            message={error}
            onDismiss={() => setError(null)}
            className={styles.errorBanner}
          />
        )}
      </div>
    </div>
  );
}
