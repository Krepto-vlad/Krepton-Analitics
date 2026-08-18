import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { ERROR_MESSAGES, type Currency } from '../../../../constants';
import {
  fetchAlignmentExplanationQuota,
  generateAlignmentExplanation,
} from '../../../../api/portfolioApi';
import type {
  AiQuotaStatus,
  AlignmentExplanationResponse,
  FalseDiversificationRiskLevel,
} from '../../../../types/ai.types';
import { getRejectedMessage } from '../../../../utils/apiError';
import { AiGeneratedNotice } from '../../../../components/ui';
import {
  clearPersistedAlignmentExplanation,
  loadPersistedAlignmentExplanation,
  savePersistedAlignmentExplanation,
} from '../../../../utils/alignmentExplainStorage';
import styles from './AlignmentExplainPanel.module.scss';

interface AlignmentExplainPanelProps {
  strategyId: string;
  strategyName: string;
  alignmentScore: number;
  displayCurrency: Currency;
  hasHoldings: boolean;
}

function formatQuotaReset(resetsAt: string): string {
  const resetDate = new Date(resetsAt);
  if (Number.isNaN(resetDate.getTime())) {
    return 'midnight UTC';
  }

  return resetDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

const FALSE_DIVERSIFICATION_RISK_LABELS: Record<FalseDiversificationRiskLevel, string> = {
  none: 'No signal',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

const FALSE_DIVERSIFICATION_RISK_BADGE_CLASS: Record<FalseDiversificationRiskLevel, string> = {
  none: styles.riskNone,
  low: styles.riskLow,
  moderate: styles.riskModerate,
  high: styles.riskHigh,
};

export function AlignmentExplainPanel({
  strategyId,
  strategyName,
  alignmentScore,
  displayCurrency,
  hasHoldings,
}: AlignmentExplainPanelProps) {
  const roundedScore = Math.round(alignmentScore);

  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [explanation, setExplanation] = useState<AlignmentExplanationResponse | null>(() =>
    loadPersistedAlignmentExplanation(strategyId, roundedScore)
  );
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadQuota() {
      setIsLoadingQuota(true);
      try {
        const nextQuota = await fetchAlignmentExplanationQuota();
        if (!isCancelled) {
          setQuota(nextQuota);
        }
      } catch (quotaError) {
        if (!isCancelled) {
          setError(
            getRejectedMessage(quotaError, ERROR_MESSAGES.AI_ALIGNMENT_EXPLAIN_QUOTA_FAILED)
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingQuota(false);
        }
      }
    }

    void loadQuota();

    return () => {
      isCancelled = true;
    };
  }, [strategyId]);

  async function handleGenerate() {
    if (!hasHoldings) {
      setError('Add portfolio holdings before generating an alignment explanation.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateAlignmentExplanation(displayCurrency);
      setExplanation(response);
      setQuota(response.quota);
      savePersistedAlignmentExplanation(strategyId, roundedScore, response);
    } catch (generateError) {
      setExplanation(null);
      clearPersistedAlignmentExplanation();
      setError(getRejectedMessage(generateError, ERROR_MESSAGES.AI_ALIGNMENT_EXPLAIN_FAILED));
      try {
        const nextQuota = await fetchAlignmentExplanationQuota();
        setQuota(nextQuota);
      } catch {
        // Keep existing quota display if refresh fails.
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const canGenerate = hasHoldings && !isGenerating && (quota === null || quota.remaining > 0);

  if (!hasHoldings) {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <Sparkles size={18} className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>Explain my alignment</h2>
            <p className={styles.subtitle}>
              Add portfolio holdings to get a plain-English explanation of how your portfolio fits
              the selected strategy.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <Sparkles size={18} className={styles.headerIcon} />
        <div className={styles.headerText}>
          <h2 className={styles.title}>Explain my alignment</h2>
          <p className={styles.subtitle}>
            Gemini explains your current fit vs {strategyName} — drifts, strengths, false
            diversification risk, and what it means. No buy/sell trade sizes.
          </p>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.scoreBadge}>Score {roundedScore}/100</span>
          {quota && (
            <span className={styles.quotaBadge}>
              {quota.remaining} of {quota.limit} left today
            </span>
          )}
          {isLoadingQuota && !quota && <span className={styles.quotaBadge}>Loading quota…</span>}
        </div>
      </div>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={() => void handleGenerate()}
          disabled={!canGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className={styles.spinner} />
              Generating explanation…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Explain my alignment
            </>
          )}
        </button>

        {quota && quota.remaining === 0 && (
          <p className={styles.limitHint}>
            Daily limit reached. Resets around {formatQuotaReset(quota.resetsAt)}.
          </p>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {explanation && (
        <div className={styles.resultBlock}>
          <div className={styles.resultMeta}>
            <span>
              {explanation.strategyName} · {explanation.explanationDate}
            </span>
            {explanation.fromCache && <span className={styles.cacheBadge}>Cached today</span>}
          </div>

          <p className={styles.overview}>{explanation.overview}</p>

          {explanation.keyDrifts.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Key drifts &amp; strengths</h3>
              <div className={styles.driftsList}>
                {explanation.keyDrifts.map((drift) => (
                  <article key={drift.title} className={styles.driftCard}>
                    <h4 className={styles.driftTitle}>{drift.title}</h4>
                    <p className={styles.driftText}>{drift.explanation}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {explanation.falseDiversification && (
            <section className={styles.section}>
              <div className={styles.falseDiversificationHeader}>
                <h3 className={styles.sectionTitle}>
                  {explanation.falseDiversification.title || 'False diversification'}
                </h3>
                <span
                  className={`${styles.riskBadge} ${FALSE_DIVERSIFICATION_RISK_BADGE_CLASS[explanation.falseDiversification.riskLevel]}`}
                >
                  {FALSE_DIVERSIFICATION_RISK_LABELS[explanation.falseDiversification.riskLevel]}
                </span>
              </div>
              <p className={styles.falseDiversificationText}>
                {explanation.falseDiversification.explanation}
              </p>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>What it means</h3>
            <p className={styles.whatItMeans}>{explanation.whatItMeans}</p>
          </section>

          <AiGeneratedNotice />
          <p className={styles.disclaimer}>{explanation.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
