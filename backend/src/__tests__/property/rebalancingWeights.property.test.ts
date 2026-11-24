import fc from 'fast-check';
import {
  REBALANCING_ALLOCATION_TOLERANCE,
  REBALANCING_ALLOCATION_TOTAL_PERCENT,
  REBALANCING_PREBUILT_STRATEGIES,
  REBALANCING_PREBUILT_STRATEGY_IDS,
  getPrebuiltStrategyDefinitionById,
  type RebalancingPrebuiltStrategyId,
} from '../../constants/rebalancing.constants.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  resolveTargetBucketWeights,
  validateUpdateRebalancingStrategyDto,
} from '../../services/rebalancingService.js';
import { PROPERTY_RUN_COUNT } from './propertyConstants.js';

const MAX_RAW_WEIGHT = 1_000;
const BAD_REQUEST_STATUS = 400;
const OVERSHOOT_FACTORS = [1.02, 1.5, 2, 3] as const;
const UNDERSHOOT_FACTORS = [0.97, 0.5, 0.1] as const;
const SUM_PRECISION_DIGITS = 6;

const assertOptions = { numRuns: PROPERTY_RUN_COUNT };

const prebuiltStrategyIdArbitrary = fc.constantFrom(...REBALANCING_PREBUILT_STRATEGY_IDS);

function bucketIdsOf(strategyId: RebalancingPrebuiltStrategyId): string[] {
  return getPrebuiltStrategyDefinitionById(strategyId).buckets.map((bucket) => bucket.id);
}

function sumOf(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Positive raw weights for every bucket of a strategy; at least one is non-zero. */
function rawWeightsArbitrary(strategyId: RebalancingPrebuiltStrategyId): fc.Arbitrary<number[]> {
  const bucketCount = bucketIdsOf(strategyId).length;

  return fc
    .array(fc.integer({ min: 0, max: MAX_RAW_WEIGHT }), {
      minLength: bucketCount,
      maxLength: bucketCount,
    })
    .filter((weights) => sumOf(weights) > 0);
}

function scaleToTotal(rawWeights: number[], targetTotal: number): number[] {
  const rawTotal = sumOf(rawWeights);
  return rawWeights.map((weight) => (weight * targetTotal) / rawTotal);
}

function toAllocations(
  strategyId: RebalancingPrebuiltStrategyId,
  weights: number[]
): Record<string, number> {
  return Object.fromEntries(
    bucketIdsOf(strategyId).map((bucketId, index) => [bucketId, weights[index]])
  );
}

const validCustomStrategyArbitrary = prebuiltStrategyIdArbitrary.chain((strategyId) =>
  rawWeightsArbitrary(strategyId).map((rawWeights) => ({
    strategyId,
    allocations: toAllocations(
      strategyId,
      scaleToTotal(rawWeights, REBALANCING_ALLOCATION_TOTAL_PERCENT)
    ),
  }))
);

describe('prebuilt strategy weights', () => {
  it.each(REBALANCING_PREBUILT_STRATEGIES.map((strategy) => [strategy.id]))(
    '%s targets add up to 100 percent with no negative bucket',
    (strategyId) => {
      const weights = resolveTargetBucketWeights({
        strategyId: strategyId as RebalancingPrebuiltStrategyId,
        customBaseStrategyId: null,
        customAllocations: null,
      });

      const values = Object.values(weights);
      expect(sumOf(values)).toBeCloseTo(REBALANCING_ALLOCATION_TOTAL_PERCENT, SUM_PRECISION_DIGITS);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    }
  );
});

describe('custom allocation properties', () => {
  it('accepts any non-negative split that totals 100 percent and returns it unchanged', () => {
    fc.assert(
      fc.property(validCustomStrategyArbitrary, ({ strategyId, allocations }) => {
        const resolved = resolveTargetBucketWeights({
          strategyId: 'custom',
          customBaseStrategyId: strategyId,
          customAllocations: allocations,
        });

        expect(resolved).toEqual(allocations);
        expect(sumOf(Object.values(resolved))).toBeCloseTo(
          REBALANCING_ALLOCATION_TOTAL_PERCENT,
          SUM_PRECISION_DIGITS
        );
      }),
      assertOptions
    );
  });

  it('lets the request validator and the resolver agree on a valid split', () => {
    fc.assert(
      fc.property(validCustomStrategyArbitrary, ({ strategyId, allocations }) => {
        expect(() =>
          validateUpdateRebalancingStrategyDto({
            strategyId: 'custom',
            customBaseStrategyId: strategyId,
            customAllocations: allocations,
          })
        ).not.toThrow();
      }),
      assertOptions
    );
  });

  it('rejects a split that overshoots 100 percent, in the validator and the resolver', () => {
    fc.assert(
      fc.property(
        prebuiltStrategyIdArbitrary.chain((strategyId) =>
          fc.tuple(
            fc.constant(strategyId),
            rawWeightsArbitrary(strategyId),
            fc.constantFrom(...OVERSHOOT_FACTORS)
          )
        ),
        ([strategyId, rawWeights, factor]) => {
          const allocations = toAllocations(
            strategyId,
            scaleToTotal(rawWeights, REBALANCING_ALLOCATION_TOTAL_PERCENT * factor)
          );

          expectBadRequest(() =>
            resolveTargetBucketWeights({
              strategyId: 'custom',
              customBaseStrategyId: strategyId,
              customAllocations: allocations,
            })
          );
          expectBadRequest(() =>
            validateUpdateRebalancingStrategyDto({
              strategyId: 'custom',
              customBaseStrategyId: strategyId,
              customAllocations: allocations,
            })
          );
        }
      ),
      assertOptions
    );
  });

  it('rejects a split that falls short of 100 percent', () => {
    fc.assert(
      fc.property(
        prebuiltStrategyIdArbitrary.chain((strategyId) =>
          fc.tuple(
            fc.constant(strategyId),
            rawWeightsArbitrary(strategyId),
            fc.constantFrom(...UNDERSHOOT_FACTORS)
          )
        ),
        ([strategyId, rawWeights, factor]) => {
          const allocations = toAllocations(
            strategyId,
            scaleToTotal(rawWeights, REBALANCING_ALLOCATION_TOTAL_PERCENT * factor)
          );

          expectBadRequest(() =>
            resolveTargetBucketWeights({
              strategyId: 'custom',
              customBaseStrategyId: strategyId,
              customAllocations: allocations,
            })
          );
        }
      ),
      assertOptions
    );
  });

  it('tolerates a total off by less than the configured tolerance', () => {
    fc.assert(
      fc.property(
        validCustomStrategyArbitrary,
        fc.double({
          min: -REBALANCING_ALLOCATION_TOLERANCE / 2,
          max: REBALANCING_ALLOCATION_TOLERANCE / 2,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        ({ strategyId, allocations }, drift) => {
          const [firstBucketId] = Object.keys(allocations);
          const nudged = { ...allocations, [firstBucketId]: allocations[firstBucketId] + drift };
          fc.pre(nudged[firstBucketId] >= 0);

          expect(() =>
            resolveTargetBucketWeights({
              strategyId: 'custom',
              customBaseStrategyId: strategyId,
              customAllocations: nudged,
            })
          ).not.toThrow();
        }
      ),
      assertOptions
    );
  });

  it('never returns a negative weight, because negative input is clamped to zero', () => {
    fc.assert(
      fc.property(
        validCustomStrategyArbitrary,
        fc.integer({ min: 1, max: MAX_RAW_WEIGHT }),
        ({ strategyId, allocations }, negativeWeight) => {
          const bucketIds = Object.keys(allocations);
          const withNegativeBucket = {
            ...allocations,
            [bucketIds[bucketIds.length - 1]]: -negativeWeight,
          };

          const outcome = tryResolve(strategyId, withNegativeBucket);

          if (outcome !== null) {
            expect(Math.min(...Object.values(outcome))).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      assertOptions
    );
  });

  it('ignores bucket ids that do not belong to the base strategy', () => {
    fc.assert(
      fc.property(
        validCustomStrategyArbitrary,
        fc.string({ minLength: 1, maxLength: 12 }),
        ({ strategyId, allocations }, foreignKey) => {
          fc.pre(!bucketIdsOf(strategyId).includes(foreignKey));

          const resolved = resolveTargetBucketWeights({
            strategyId: 'custom',
            customBaseStrategyId: strategyId,
            customAllocations: { ...allocations, [foreignKey]: MAX_RAW_WEIGHT },
          });

          expect(resolved).toEqual(allocations);
        }
      ),
      assertOptions
    );
  });
});

function expectBadRequest(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(BAD_REQUEST_STATUS);
    return;
  }

  throw new Error('Expected a 400 AppError, but nothing was thrown');
}

function tryResolve(
  strategyId: RebalancingPrebuiltStrategyId,
  allocations: Record<string, number>
): Record<string, number> | null {
  try {
    return resolveTargetBucketWeights({
      strategyId: 'custom',
      customBaseStrategyId: strategyId,
      customAllocations: allocations,
    });
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return null;
  }
}
