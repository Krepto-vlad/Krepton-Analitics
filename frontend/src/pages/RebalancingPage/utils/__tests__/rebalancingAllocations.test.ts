import {
  getTotalStrategyWeight,
  isStrategyAllocationValid,
  stepStrategyAllocationWeight,
} from '../rebalancingAllocations';
import type { StrategyBucketAllocation } from '../rebalancingAllocations';

const allocations: StrategyBucketAllocation[] = [
  { bucketId: 'equities', label: 'Equities', color: '#10b981', weightPercent: 60 },
  { bucketId: 'bonds', label: 'Bonds', color: '#3b82f6', weightPercent: 40 },
];

describe('rebalancingAllocations', () => {
  it('treats weights that sum to 100 percent as a valid strategy', () => {
    const totalWeight = getTotalStrategyWeight(allocations);

    expect(totalWeight).toBe(100);
    expect(isStrategyAllocationValid(totalWeight)).toBe(true);
    expect(isStrategyAllocationValid(90)).toBe(false);
  });

  it('steps a bucket weight without dropping below zero', () => {
    const nextAllocations = stepStrategyAllocationWeight(allocations, 'bonds', -15);

    expect(nextAllocations.find((item) => item.bucketId === 'bonds')?.weightPercent).toBe(25);
    expect(stepStrategyAllocationWeight(allocations, 'bonds', -80)[1].weightPercent).toBe(0);
  });
});
