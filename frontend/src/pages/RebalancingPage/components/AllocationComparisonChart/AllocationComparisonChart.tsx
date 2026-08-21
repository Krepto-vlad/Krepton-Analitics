import styles from './AllocationComparisonChart.module.scss';
import {
  REBALANCING_CURRENT_BAR_COLOR,
  resolveRebalancingDisplayColor,
} from '../../../../constants';
import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import type { RebalancingAllocationItem } from '../../../../types/rebalancing.types';

interface AllocationComparisonChartProps {
  currentAllocations: RebalancingAllocationItem[];
  targetAllocations: RebalancingAllocationItem[];
}

function normalizeBarHeight(value: number, maxValue: number): number {
  if (maxValue <= 0) {
    return value > 0 ? 100 : 4;
  }
  const normalized = (Math.max(value, 0) / maxValue) * 100;
  return Math.max(normalized, value > 0 ? 8 : 4);
}

export function AllocationComparisonChart({
  currentAllocations,
  targetAllocations,
}: AllocationComparisonChartProps) {
  const bucketOrder = [
    ...new Set([
      ...targetAllocations.map((item) => item.bucketId),
      ...currentAllocations.map((item) => item.bucketId),
    ]),
  ];

  const currentMap = new Map(currentAllocations.map((item) => [item.bucketId, item]));
  const targetMap = new Map(targetAllocations.map((item) => [item.bucketId, item]));
  const maxValue = Math.max(
    ...bucketOrder.flatMap((bucketId) => [
      currentMap.get(bucketId)?.weightPercent ?? 0,
      targetMap.get(bucketId)?.weightPercent ?? 0,
    ]),
    1
  );

  return (
    <section
      className={styles.card}
      style={toCssCustomProperties({ '--current-bar-color': REBALANCING_CURRENT_BAR_COLOR })}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Current vs. Target Allocation</h2>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendSwatchCurrent}`} />
            Current
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendSwatchTarget}`} />
            Target (strategy buckets)
          </span>
        </div>
      </div>

      <div className={styles.plot}>
        {bucketOrder.map((bucketId) => {
          const currentItem = currentMap.get(bucketId);
          const targetItem = targetMap.get(bucketId);
          const label = targetItem?.label ?? currentItem?.label ?? bucketId;
          const currentValue = currentItem?.weightPercent ?? 0;
          const targetValue = targetItem?.weightPercent ?? 0;
          const targetColor = resolveRebalancingDisplayColor(
            targetItem?.color ?? currentItem?.color ?? REBALANCING_CURRENT_BAR_COLOR
          );

          return (
            <div key={bucketId} className={styles.group}>
              <div className={styles.bars}>
                <div
                  className={`${styles.bar} ${styles.barCurrent}`}
                  style={toCssCustomProperties({
                    '--bar-height': `${normalizeBarHeight(currentValue, maxValue)}%`,
                  })}
                  title={`Current: ${currentValue.toFixed(1)}%`}
                />
                <div
                  className={styles.bar}
                  style={toCssCustomProperties({
                    '--bar-height': `${normalizeBarHeight(targetValue, maxValue)}%`,
                    '--bar-color': targetColor,
                  })}
                  title={`Target: ${targetValue.toFixed(1)}%`}
                />
              </div>
              <span className={styles.labelGroup}>
                <span
                  className={styles.labelDot}
                  style={toCssCustomProperties({ '--bar-color': targetColor })}
                />
                <span className={styles.label}>{label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
