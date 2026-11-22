const SECTOR_COLORS = [
  '#3b82f6',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
] as const;

export interface SectorAllocationSlice {
  sector: string;
  percentage: number;
  displayPercentage: number;
  color: string;
}

/**
 * Distributes integer display percentages that always sum to 100
 * using the largest-remainder method (avoids 100% + 0% when a small sector exists).
 */
export function buildSectorAllocations(
  positions: Array<{ sector: string | null; marketValue: number }>,
  totalMarketValue: number
): SectorAllocationSlice[] {
  if (totalMarketValue === 0) return [];

  const sectorMap: Record<string, number> = {};
  positions.forEach((position) => {
    const sector = position.sector ?? 'Other';
    sectorMap[sector] = (sectorMap[sector] ?? 0) + position.marketValue;
  });

  const entries = Object.entries(sectorMap).sort(([, valueA], [, valueB]) => valueB - valueA);

  const slices = entries.map(([sector, value], index) => {
    const exactPercentage = (value / totalMarketValue) * 100;
    return {
      sector,
      percentage: exactPercentage,
      displayPercentage: Math.floor(exactPercentage),
      remainder: exactPercentage - Math.floor(exactPercentage),
      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
    };
  });

  let remainingPoints = 100 - slices.reduce((sum, slice) => sum + slice.displayPercentage, 0);
  const rankedByRemainder = [...slices].sort(
    (sliceA, sliceB) => sliceB.remainder - sliceA.remainder
  );

  for (let index = 0; index < rankedByRemainder.length && remainingPoints > 0; index += 1) {
    rankedByRemainder[index].displayPercentage += 1;
    remainingPoints -= 1;
  }

  return slices.map((slice) => ({
    sector: slice.sector,
    percentage: slice.percentage,
    displayPercentage: slice.displayPercentage,
    color: slice.color,
  }));
}
