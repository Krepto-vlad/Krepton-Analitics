import { useCallback, useEffect, useMemo, useState } from 'react';
import { Scale, Sparkles } from 'lucide-react';
import {
  ERROR_MESSAGES,
  LEGAL_REBALANCING_DISCLAIMER,
  LOADING_MESSAGES,
  BEGINNER_TUTORIAL_ANCHORS,
  REBALANCING_PERMANENT_STRATEGY_ID,
  type Currency,
} from '../../constants';
import {
  fetchPortfolioRebalancing,
  fetchRebalancingStrategies,
  updatePortfolioRebalancingStrategy,
} from '../../api/portfolioApi';
import { getRejectedMessage } from '../../utils/apiError';
import { useAppSelector } from '../../hooks/useAppSelector';
import { ErrorBanner, ContentSkeleton } from '../../components/ui';
import { PortfolioHealthCard } from '../../components/PortfolioHealthCard/PortfolioHealthCard';
import type {
  RebalancingAnalysisResponse,
  RebalancingPrebuiltStrategyId,
  RebalancingStrategyId,
  RebalancingStrategyOption,
  SavedCustomStrategySummary,
} from '../../types/rebalancing.types';
import { REBALANCING_CUSTOM_STRATEGY_NAME } from '../../types/rebalancing.types';
import { StrategyPanel, type StrategyPanelOption } from './components/StrategyPanel/StrategyPanel';
import { AllocationComparisonChart } from './components/AllocationComparisonChart/AllocationComparisonChart';
import { TickerMappingPanel } from './components/TickerMappingPanel/TickerMappingPanel';
import { AlignmentExplainPanel } from './components/AlignmentExplainPanel/AlignmentExplainPanel';
import {
  adjustStrategyAllocationWeight,
  areStrategyAllocationsEqual,
  buildAllocationsFromItems,
  buildAllocationsFromStrategyBuckets,
  buildCustomAllocationPayload,
  getTotalStrategyWeight,
  isStrategyAllocationValid,
  previewStrategyTargetAllocations,
  stepStrategyAllocationWeight,
  type StrategyBucketAllocation,
} from './utils/rebalancingAllocations';
import { saveRebalancingChatScreen } from '../../utils/tickerChatSession';
import styles from './RebalancingPage.module.scss';

type RebalancingTabId = 'technical' | 'ai';

function resolveBaselineAllocations(
  strategyId: RebalancingStrategyId,
  strategies: RebalancingStrategyOption[],
  savedCustomStrategy: SavedCustomStrategySummary | null
): StrategyBucketAllocation[] {
  if (strategyId === 'custom' && savedCustomStrategy) {
    return buildAllocationsFromItems(savedCustomStrategy.targetAllocations);
  }

  const prebuiltStrategy = strategies.find((strategy) => strategy.id === strategyId);
  if (prebuiltStrategy) {
    return buildAllocationsFromStrategyBuckets(prebuiltStrategy.buckets);
  }

  return [];
}

function resolveCustomBaseStrategyId(
  strategyId: RebalancingStrategyId,
  savedCustomStrategy: SavedCustomStrategySummary | null,
  analysis: RebalancingAnalysisResponse | null
): RebalancingPrebuiltStrategyId | null {
  if (strategyId === 'custom') {
    return savedCustomStrategy?.baseStrategyId ?? analysis?.customBaseStrategyId ?? null;
  }

  return strategyId;
}

export function RebalancingPage() {
  const displayCurrency = useAppSelector((state) => state.ui.currency) as Currency;
  const [strategies, setStrategies] = useState<RebalancingStrategyOption[]>([]);
  const [analysis, setAnalysis] = useState<RebalancingAnalysisResponse | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] =
    useState<RebalancingStrategyId>('ray-dalio-all-weather');
  const [draftAllocations, setDraftAllocations] = useState<StrategyBucketAllocation[]>([]);
  const [loadedForCurrency, setLoadedForCurrency] = useState<Currency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RebalancingTabId>('technical');

  const savedCustomStrategy = analysis?.savedCustomStrategy ?? null;

  const isLoading = loadedForCurrency !== displayCurrency;
  const showContent = analysis !== null && loadedForCurrency === displayCurrency;
  // Same rule as the dashboard: no score or deviations until the user has real holdings.
  const hasHoldings =
    analysis !== null && analysis.totalPortfolioValue > 0 && analysis.tickerMappings.length > 0;

  const baselineAllocations = useMemo(
    () => resolveBaselineAllocations(selectedStrategyId, strategies, savedCustomStrategy),
    [selectedStrategyId, strategies, savedCustomStrategy]
  );

  const isDirty = useMemo(
    () => !areStrategyAllocationsEqual(draftAllocations, baselineAllocations),
    [baselineAllocations, draftAllocations]
  );

  const totalWeight = useMemo(() => getTotalStrategyWeight(draftAllocations), [draftAllocations]);
  const isAllocationValid = isStrategyAllocationValid(totalWeight);

  const previewTargetAllocations = useMemo(
    () =>
      previewStrategyTargetAllocations(
        draftAllocations,
        analysis?.targetAllocations ?? [],
        isDirty,
        analysis?.includePermanentCash !== false
      ),
    [analysis?.includePermanentCash, analysis?.targetAllocations, draftAllocations, isDirty]
  );

  const strategyOptions = useMemo((): StrategyPanelOption[] => {
    const prebuiltOptions: StrategyPanelOption[] = strategies.map((strategy) => ({
      id: strategy.id,
      label: strategy.name,
      description: strategy.description,
      philosophy: strategy.philosophy,
      investmentHorizon: strategy.investmentHorizon,
    }));

    if (!savedCustomStrategy) {
      return prebuiltOptions;
    }

    return [
      ...prebuiltOptions,
      {
        id: 'custom',
        label: REBALANCING_CUSTOM_STRATEGY_NAME,
        description: `Custom allocation based on ${savedCustomStrategy.baseStrategyName}.`,
        philosophy: 'Personalized target weights derived from a pre-built strategy template.',
        investmentHorizon: 'User-defined',
        guideBaseName: savedCustomStrategy.baseStrategyName,
      },
    ];
  }, [savedCustomStrategy, strategies]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [strategyOptions, rebalancingAnalysis] = await Promise.all([
          fetchRebalancingStrategies(),
          fetchPortfolioRebalancing(displayCurrency),
        ]);

        if (cancelled) {
          return;
        }

        setStrategies(strategyOptions);
        setAnalysis(rebalancingAnalysis);
        setSelectedStrategyId(rebalancingAnalysis.strategyId);
        setDraftAllocations(
          resolveBaselineAllocations(
            rebalancingAnalysis.strategyId,
            strategyOptions,
            rebalancingAnalysis.savedCustomStrategy
          )
        );
        setLoadedForCurrency(displayCurrency);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setAnalysis(null);
          setLoadedForCurrency(displayCurrency);
          setError(getRejectedMessage(loadError, ERROR_MESSAGES.PORTFOLIO_REBALANCING_FAILED));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayCurrency]);

  useEffect(() => {
    if (!analysis) {
      return;
    }

    saveRebalancingChatScreen(displayCurrency);
  }, [analysis, displayCurrency]);

  const persistStrategySelection = useCallback(
    async (strategyId: RebalancingStrategyId) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await updatePortfolioRebalancingStrategy({ strategyId }, displayCurrency);

        setAnalysis(response);
        setSelectedStrategyId(response.strategyId);
        setDraftAllocations(
          resolveBaselineAllocations(response.strategyId, strategies, response.savedCustomStrategy)
        );
      } catch (saveError) {
        setError(getRejectedMessage(saveError, ERROR_MESSAGES.PORTFOLIO_REBALANCING_SAVE_FAILED));
      } finally {
        setIsSaving(false);
      }
    },
    [displayCurrency, strategies]
  );

  const persistIncludePermanentCash = useCallback(
    async (included: boolean) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await updatePortfolioRebalancingStrategy(
          { strategyId: selectedStrategyId, includePermanentCash: included },
          displayCurrency
        );

        setAnalysis(response);
        setSelectedStrategyId(response.strategyId);
      } catch (saveError) {
        setError(getRejectedMessage(saveError, ERROR_MESSAGES.PORTFOLIO_REBALANCING_SAVE_FAILED));
      } finally {
        setIsSaving(false);
      }
    },
    [displayCurrency, selectedStrategyId]
  );

  const persistSaveAsCustom = useCallback(async () => {
    const customBaseStrategyId = resolveCustomBaseStrategyId(
      selectedStrategyId,
      savedCustomStrategy,
      analysis
    );

    if (!customBaseStrategyId || !isAllocationValid) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await updatePortfolioRebalancingStrategy(
        {
          strategyId: 'custom',
          customBaseStrategyId,
          customAllocations: buildCustomAllocationPayload(draftAllocations),
        },
        displayCurrency
      );

      setAnalysis(response);
      setSelectedStrategyId(response.strategyId);
      setDraftAllocations(
        resolveBaselineAllocations(response.strategyId, strategies, response.savedCustomStrategy)
      );
    } catch (saveError) {
      setError(getRejectedMessage(saveError, ERROR_MESSAGES.PORTFOLIO_REBALANCING_SAVE_FAILED));
    } finally {
      setIsSaving(false);
    }
  }, [
    analysis,
    displayCurrency,
    draftAllocations,
    isAllocationValid,
    savedCustomStrategy,
    selectedStrategyId,
    strategies,
  ]);

  const showPermanentCashControls =
    selectedStrategyId === REBALANCING_PERMANENT_STRATEGY_ID ||
    (selectedStrategyId === 'custom' &&
      savedCustomStrategy?.baseStrategyId === REBALANCING_PERMANENT_STRATEGY_ID);

  function handleStrategyChange(strategyId: RebalancingStrategyId) {
    setSelectedStrategyId(strategyId);
    setDraftAllocations(resolveBaselineAllocations(strategyId, strategies, savedCustomStrategy));
    void persistStrategySelection(strategyId);
  }

  function handleAllocationChange(bucketId: string, weightPercent: number) {
    setDraftAllocations((current) =>
      adjustStrategyAllocationWeight(current, bucketId, weightPercent)
    );
  }

  function handleStepAllocation(bucketId: string, delta: number) {
    setDraftAllocations((current) => stepStrategyAllocationWeight(current, bucketId, delta));
  }

  return (
    <div className={styles.page} data-tutorial-anchor={BEGINNER_TUTORIAL_ANCHORS.rebalancing}>
      <div data-tutorial-anchor={BEGINNER_TUTORIAL_ANCHORS.rebalancingCard}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Scale size={22} className={styles.titleIcon} />
            <h2 className={styles.title}>Portfolio Rebalancing &amp; Strategy Engine</h2>
          </div>
          <p className={styles.subtitle}>
            Compare your current holdings against a target allocation strategy.
          </p>
        </header>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'technical' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('technical')}
          >
            Technical Rebalancing
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'ai' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={14} />
            AI Insights
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} className={styles.errorBanner} />}

      {isLoading && !showContent ? (
        <ContentSkeleton preset="page" label={LOADING_MESSAGES.REBALANCING_ANALYSIS} />
      ) : showContent ? (
        activeTab === 'technical' ? (
          <>
            <PortfolioHealthCard
              alignmentScore={hasHoldings ? analysis.alignmentScore : null}
              strategyId={analysis.strategyId}
              strategyName={analysis.strategyName}
              deviations={hasHoldings ? analysis.deviations : []}
              isLoading={isSaving}
              showDriftAlert={false}
              layout="wide"
            />

            <div className={styles.grid}>
              <StrategyPanel
                strategyOptions={strategyOptions}
                selectedStrategyId={selectedStrategyId}
                allocations={draftAllocations}
                isSaving={isSaving}
                isDirty={isDirty}
                totalWeight={totalWeight}
                isAllocationValid={isAllocationValid}
                onStrategyChange={handleStrategyChange}
                onAllocationChange={handleAllocationChange}
                onStepAllocation={handleStepAllocation}
                onCancelDraft={() =>
                  setDraftAllocations(baselineAllocations.map((allocation) => ({ ...allocation })))
                }
                onSaveAsCustom={() => void persistSaveAsCustom()}
                showPermanentCashControls={showPermanentCashControls}
                includePermanentCash={analysis.includePermanentCash !== false}
                onIncludePermanentCashChange={(included) =>
                  void persistIncludePermanentCash(included)
                }
              />

              <AllocationComparisonChart
                currentAllocations={analysis.currentAllocations}
                targetAllocations={previewTargetAllocations}
              />
            </div>

            <TickerMappingPanel
              mappings={analysis.tickerMappings}
              displayCurrency={displayCurrency}
            />

            <p className={styles.disclaimer}>{LEGAL_REBALANCING_DISCLAIMER}</p>
          </>
        ) : (
          <AlignmentExplainPanel
            key={`${analysis.strategyId}-${Math.round(analysis.alignmentScore)}`}
            strategyId={analysis.strategyId}
            strategyName={analysis.strategyName}
            alignmentScore={analysis.alignmentScore}
            displayCurrency={displayCurrency}
            hasHoldings={hasHoldings}
          />
        )
      ) : null}
    </div>
  );
}
