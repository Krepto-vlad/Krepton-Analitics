import { DASHBOARD_INDEX_LEVEL_FRACTION_DIGITS } from '../constants';
import { formatSignedPercent } from './percentDisplay';

export function formatIndexLevel(level: number): string {
  return level.toLocaleString('en-US', {
    minimumFractionDigits: DASHBOARD_INDEX_LEVEL_FRACTION_DIGITS,
    maximumFractionDigits: DASHBOARD_INDEX_LEVEL_FRACTION_DIGITS,
  });
}

/** Points move plus percent, without a currency symbol. */
export function formatSignedIndexChange(changePoints: number, changePercent: number): string {
  const pointsPrefix = changePoints >= 0 ? '+' : '';
  return `${pointsPrefix}${formatIndexLevel(changePoints)} (${formatSignedPercent(changePercent)})`;
}
