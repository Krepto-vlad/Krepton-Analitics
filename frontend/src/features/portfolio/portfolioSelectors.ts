import type { RootState } from '../../store';
import type { PortfolioStats, SectorAllocation } from '../../types/portfolio.types';
import { resolveInvestmentSummaryForDisplay } from '../../utils/moneyDisplay';

const SECTOR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

function buildSectorAllocations(
  positions: Array<{ sector: string | null; shares: number; currentPrice: number }>
): SectorAllocation[] {
  const totalMarketValue = positions.reduce(
    (sum, position) => sum + position.shares * position.currentPrice,
    0
  );

  if (totalMarketValue === 0) return [];

  const sectorMap: Record<string, number> = {};
  positions.forEach((position) => {
    const sector = position.sector ?? 'Other';
    sectorMap[sector] = (sectorMap[sector] ?? 0) + position.shares * position.currentPrice;
  });

  return Object.entries(sectorMap)
    .sort(([, valueA], [, valueB]) => valueB - valueA)
    .map(([sector, value], index) => ({
      sector,
      percentage: Math.round((value / totalMarketValue) * 1000) / 10,
      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
    }));
}

export function selectPortfolioStats(state: RootState): PortfolioStats {
  const { summaryPositions, investmentSummary } = state.portfolio;
  const displayCurrency = state.ui.currency;

  const costBasisOpen = summaryPositions.reduce(
    (sum, position) => sum + position.shares * position.avgBuyPrice,
    0
  );
  const totalMarketValue = summaryPositions.reduce(
    (sum, position) => sum + position.shares * position.currentPrice,
    0
  );

  const { totalInvested, totalWithdrawn } = resolveInvestmentSummaryForDisplay(
    investmentSummary,
    displayCurrency
  );
  const effectiveInvested = totalInvested > 0 ? totalInvested : costBasisOpen;

  const unrealizedPnl = totalMarketValue - costBasisOpen;
  const totalPnl = totalMarketValue + totalWithdrawn - effectiveInvested;
  const totalPnlPercent = effectiveInvested > 0 ? (totalPnl / effectiveInvested) * 100 : 0;

  const dayPnl = 0;
  const dayPnlPercent = 0;

  return {
    totalValue: totalMarketValue,
    totalPnl,
    unrealizedPnl,
    realizedPnl: totalWithdrawn,
    dayPnl,
    totalPnlPercent,
    dayPnlPercent,
  };
}

export function selectSectorAllocations(state: RootState): SectorAllocation[] {
  return buildSectorAllocations(state.portfolio.summaryPositions);
}
