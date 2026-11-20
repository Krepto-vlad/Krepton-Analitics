import { useId, useState } from 'react';
import { BookOpen, CircleHelp, Minus, Plus } from 'lucide-react';
import { Select } from '../../../../components/ui';
import {
  REBALANCING_ALLOCATION_CANCEL_LABEL,
  REBALANCING_CASH_SLEEVE_HELP_LABEL,
  REBALANCING_CASH_SLEEVE_HELP_TEXT,
  REBALANCING_CASH_SLEEVE_INCLUDE_LABEL,
  REBALANCING_PERMANENT_CASH_BUCKET_ID,
  REBALANCING_STRATEGY_GUIDE_OPEN_LABEL,
  resolveRebalancingDisplayColor,
} from '../../../../constants';
import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import type { RebalancingStrategyId } from '../../../../types/rebalancing.types';
import type { StrategyBucketAllocation } from '../../utils/rebalancingAllocations';
import { StrategyGuideDialog } from '../StrategyGuideDialog/StrategyGuideDialog';
import styles from './StrategyPanel.module.scss';

export interface StrategyPanelOption {
  id: RebalancingStrategyId;
  label: string;
  description: string;
  philosophy: string;
  investmentHorizon: string;
  guideBaseName?: string;
}

interface StrategyPanelProps {
  strategyOptions: StrategyPanelOption[];
  selectedStrategyId: RebalancingStrategyId;
  allocations: StrategyBucketAllocation[];
  isSaving: boolean;
  isDirty: boolean;
  totalWeight: number;
  isAllocationValid: boolean;
  onStrategyChange: (strategyId: RebalancingStrategyId) => void;
  onAllocationChange: (bucketId: string, weightPercent: number) => void;
  onStepAllocation: (bucketId: string, delta: number) => void;
  onCancelDraft: () => void;
  onSaveAsCustom: () => void;
  showPermanentCashControls?: boolean;
  includePermanentCash?: boolean;
  onIncludePermanentCashChange?: (included: boolean) => void;
}

export function StrategyPanel({
  strategyOptions,
  selectedStrategyId,
  allocations,
  isSaving,
  isDirty,
  totalWeight,
  isAllocationValid,
  onStrategyChange,
  onAllocationChange,
  onStepAllocation,
  onCancelDraft,
  onSaveAsCustom,
  showPermanentCashControls = false,
  includePermanentCash = true,
  onIncludePermanentCashChange,
}: StrategyPanelProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const cashHelpId = useId();
  const selectedStrategy = strategyOptions.find((strategy) => strategy.id === selectedStrategyId);
  const selectOptions = strategyOptions.map((strategy) => ({
    value: strategy.id,
    label: strategy.label,
  }));

  return (
    <section className={styles.card}>
      <div className={styles.strategyField}>
        <span className={styles.sectionLabel}>Pre-built Strategies</span>
        <Select
          value={selectedStrategyId}
          onChange={onStrategyChange}
          options={selectOptions}
          disabled={isSaving || selectOptions.length === 0}
          className={styles.strategySelect}
        />
      </div>
      {selectedStrategy && (
        <>
          <p className={styles.description}>{selectedStrategy.description}</p>
          <p className={styles.meta}>
            {selectedStrategy.philosophy} · Horizon: {selectedStrategy.investmentHorizon}
          </p>
          <button type="button" className={styles.guideButton} onClick={() => setIsGuideOpen(true)}>
            <BookOpen size={16} />
            {REBALANCING_STRATEGY_GUIDE_OPEN_LABEL}
          </button>
        </>
      )}
      {isGuideOpen && selectedStrategy && (
        <StrategyGuideDialog
          strategyOptions={strategyOptions}
          initialStrategyId={selectedStrategyId}
          onClose={() => setIsGuideOpen(false)}
        />
      )}

      <div className={styles.allocations}>
        {allocations.map((allocation) => {
          const fillPercent = `${allocation.weightPercent}%`;
          const isPermanentCashRow =
            showPermanentCashControls &&
            allocation.bucketId === REBALANCING_PERMANENT_CASH_BUCKET_ID;

          return (
            <div
              key={allocation.bucketId}
              className={styles.row}
              style={toCssCustomProperties({
                '--asset-color': resolveRebalancingDisplayColor(allocation.color),
              })}
            >
              <div className={styles.rowHeader}>
                <div className={styles.assetLabelGroup}>
                  <span className={styles.assetDot} aria-hidden="true" />
                  <span className={styles.assetLabel}>{allocation.label}</span>
                  {isPermanentCashRow && (
                    <span className={styles.helpAnchor}>
                      <button
                        type="button"
                        className={styles.helpButton}
                        aria-describedby={cashHelpId}
                        aria-label={REBALANCING_CASH_SLEEVE_HELP_LABEL}
                      >
                        <CircleHelp size={14} />
                      </button>
                      <p id={cashHelpId} role="tooltip" className={styles.helpText}>
                        {REBALANCING_CASH_SLEEVE_HELP_TEXT}
                      </p>
                    </span>
                  )}
                </div>
                <div className={styles.controls}>
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onStepAllocation(allocation.bucketId, -1)}
                    disabled={isSaving}
                    aria-label={`Decrease ${allocation.label}`}
                  >
                    <Minus size={12} />
                  </button>
                  <span className={styles.weightValue}>{allocation.weightPercent.toFixed(1)}%</span>
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onStepAllocation(allocation.bucketId, 1)}
                    disabled={isSaving}
                    aria-label={`Increase ${allocation.label}`}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                className={styles.slider}
                style={toCssCustomProperties({ '--fill-percent': fillPercent })}
                value={allocation.weightPercent}
                disabled={isSaving}
                onChange={(event) =>
                  onAllocationChange(allocation.bucketId, Number(event.target.value))
                }
                aria-label={`${allocation.label} allocation`}
              />
              {isPermanentCashRow && (
                <label className={styles.includeToggle}>
                  <input
                    type="checkbox"
                    checked={includePermanentCash}
                    disabled={isSaving}
                    onChange={(event) => onIncludePermanentCashChange?.(event.target.checked)}
                  />
                  {REBALANCING_CASH_SLEEVE_INCLUDE_LABEL}
                </label>
              )}
            </div>
          );
        })}
      </div>

      {isDirty && (
        <div className={styles.footer}>
          <span
            className={`${styles.totalHint} ${isAllocationValid ? styles.totalValid : styles.totalInvalid}`}
          >
            Total: {totalWeight.toFixed(1)}% {isAllocationValid ? '' : '(must equal 100%)'}
          </span>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={isSaving}
              onClick={onCancelDraft}
            >
              {REBALANCING_ALLOCATION_CANCEL_LABEL}
            </button>
            <button
              type="button"
              className={styles.applyButton}
              disabled={!isAllocationValid || isSaving}
              onClick={onSaveAsCustom}
            >
              {isSaving ? 'Saving…' : 'Save as Custom'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
