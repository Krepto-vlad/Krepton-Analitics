import {
  REBALANCING_ALLOCATION_TOLERANCE,
  REBALANCING_ALLOCATION_TOTAL_PERCENT,
} from '../../../constants';
import type {
  RebalancingAllocationItem,
  RebalancingStrategyBucketOption,
} from '../../../types/rebalancing.types';
import { adjustAllocationWeight } from '../../BacktestingPage/utils/backtestAllocations';

export interface StrategyBucketAllocation {
  bucketId: string;
  label: string;
  color: string;
  weightPercent: number;
}

export function buildAllocationsFromItems(
  items: RebalancingAllocationItem[]
): StrategyBucketAllocation[] {
  return items.map((item) => ({
    bucketId: item.bucketId,
    label: item.label,
    color: item.color,
    weightPercent: item.weightPercent,
  }));
}

export function buildAllocationsFromStrategyBuckets(
  buckets: RebalancingStrategyBucketOption[]
): StrategyBucketAllocation[] {
  return buckets.map((bucket) => ({
    bucketId: bucket.id,
    label: bucket.label,
    color: bucket.color,
    weightPercent: bucket.targetPercent,
  }));
}

export function buildCustomAllocationPayload(
  allocations: StrategyBucketAllocation[]
): Record<string, number> {
  return allocations.reduce<Record<string, number>>((accumulator, allocation) => {
    accumulator[allocation.bucketId] = allocation.weightPercent;
    return accumulator;
  }, {});
}

export function getTotalStrategyWeight(allocations: StrategyBucketAllocation[]): number {
  return allocations.reduce((sum, allocation) => sum + allocation.weightPercent, 0);
}

export function isStrategyAllocationValid(totalWeight: number): boolean {
  return (
    Math.abs(totalWeight - REBALANCING_ALLOCATION_TOTAL_PERCENT) <= REBALANCING_ALLOCATION_TOLERANCE
  );
}

export function adjustStrategyAllocationWeight(
  allocations: StrategyBucketAllocation[],
  bucketId: string,
  nextWeight: number
): StrategyBucketAllocation[] {
  const normalized = allocations.map((allocation) => ({
    ...allocation,
    weightPercent: allocation.bucketId === bucketId ? nextWeight : allocation.weightPercent,
  }));

  const adjusted = adjustAllocationWeight(
    normalized.map((allocation) => ({
      ticker: allocation.bucketId,
      name: allocation.label,
      weightPercent: allocation.weightPercent,
    })),
    bucketId,
    nextWeight
  );

  return normalized.map((allocation) => ({
    ...allocation,
    weightPercent:
      adjusted.find((item) => item.ticker === allocation.bucketId)?.weightPercent ??
      allocation.weightPercent,
  }));
}

export function stepStrategyAllocationWeight(
  allocations: StrategyBucketAllocation[],
  bucketId: string,
  delta: number
): StrategyBucketAllocation[] {
  const current = allocations.find((allocation) => allocation.bucketId === bucketId);
  const nextWeight = Math.max(0, Math.min(100, (current?.weightPercent ?? 0) + delta));
  return adjustStrategyAllocationWeight(allocations, bucketId, nextWeight);
}

export function areStrategyAllocationsEqual(
  left: StrategyBucketAllocation[],
  right: StrategyBucketAllocation[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((allocation) => {
    const counterpart = right.find((item) => item.bucketId === allocation.bucketId);
    if (!counterpart) {
      return false;
    }

    return (
      Math.abs(allocation.weightPercent - counterpart.weightPercent) <=
      REBALANCING_ALLOCATION_TOLERANCE
    );
  });
}

export function allocationsToTargetItems(
  allocations: StrategyBucketAllocation[]
): RebalancingAllocationItem[] {
  return allocations.map((allocation) => ({
    bucketId: allocation.bucketId,
    label: allocation.label,
    color: allocation.color,
    weightPercent: allocation.weightPercent,
  }));
}
