import { Minus, Plus } from 'lucide-react';
import { Select } from '../../../../components/ui';
import type { RebalancingStrategyId } from '../../../../types/rebalancing.types';
import type { StrategyBucketAllocation } from '../../utils/rebalancingAllocations';
import styles from './StrategyPanel.module.scss';

export interface StrategyPanelOption {
  id: RebalancingStrategyId;
  label: string;
  description: string;
  philosophy: string;
  investmentHorizon: string;
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
  onSaveAsCustom: () => void;
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
  onSaveAsCustom,
}: StrategyPanelProps) {
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
        </>
      )}

      <div className={styles.allocations}>
        {allocations.map((allocation) => {
          const fillPercent = `${allocation.weightPercent}%`;

          return (
            <div
              key={allocation.bucketId}
              className={styles.row}
              style={{ '--asset-color': allocation.color } as React.CSSProperties}
            >
              <div className={styles.rowHeader}>
                <div className={styles.assetLabelGroup}>
                  <span className={styles.assetDot} aria-hidden="true" />
                  <span className={styles.assetLabel}>{allocation.label}</span>
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
                style={{ '--fill-percent': fillPercent } as React.CSSProperties}
                value={allocation.weightPercent}
                disabled={isSaving}
                onChange={(event) =>
                  onAllocationChange(allocation.bucketId, Number(event.target.value))
                }
                aria-label={`${allocation.label} allocation`}
              />
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
          <button
            type="button"
            className={styles.applyButton}
            disabled={!isAllocationValid || isSaving}
            onClick={onSaveAsCustom}
          >
            {isSaving ? 'Saving…' : 'Save as Custom'}
          </button>
        </div>
      )}
    </section>
  );
}
