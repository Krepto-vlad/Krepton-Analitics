import type { SeriesMarker, Time } from 'lightweight-charts';
import { CHART_COLORS, CHART_TRADE_MARKER_SIZE } from '../constants';
import type { PortfolioTransaction } from '../api/portfolioApi';
import type { OhlcvCandle } from '../types/stock.types';

/** Allow Fri↔Mon / holiday gaps when matching trade dates to daily candles. */
const MAX_TRADE_CANDLE_SNAP_SECONDS = 3 * 24 * 60 * 60;

function isoDateToUnixSeconds(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
}

function resolveTransactionIsoDate(transaction: PortfolioTransaction): string | null {
  if (transaction.transactionDate) {
    return transaction.transactionDate.slice(0, 10);
  }

  if (transaction.createdAt) {
    return transaction.createdAt.slice(0, 10);
  }

  return null;
}

/**
 * Find the candle closest to the trade date (within a short weekend/holiday gap).
 */
function findNearestCandle(tradeUnixSeconds: number, candles: OhlcvCandle[]): OhlcvCandle | null {
  if (candles.length === 0) {
    return null;
  }

  let nearestCandle: OhlcvCandle | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candle of candles) {
    const distance = Math.abs(candle.time - tradeUnixSeconds);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCandle = candle;
    }
  }

  if (nearestCandle == null || nearestDistance > MAX_TRADE_CANDLE_SNAP_SECONDS) {
    return null;
  }

  return nearestCandle;
}

/**
 * Builds lightweight-charts markers for user BUY/SELL trades within the visible candle range.
 * Markers are pinned to candle close via atPriceMiddle so they sit on the price line.
 */
export function buildTradeChartMarkers(
  transactions: PortfolioTransaction[],
  candles: OhlcvCandle[]
): SeriesMarker<Time>[] {
  const sortedCandles = [...candles].sort((left, right) => left.time - right.time);
  const markers: SeriesMarker<Time>[] = [];

  for (const transaction of transactions) {
    const isoDate = resolveTransactionIsoDate(transaction);
    if (!isoDate) {
      continue;
    }

    const tradeUnixSeconds = isoDateToUnixSeconds(isoDate);
    if (tradeUnixSeconds == null) {
      continue;
    }

    const candle = findNearestCandle(tradeUnixSeconds, sortedCandles);
    if (!candle) {
      continue;
    }

    const isBuy = transaction.transactionType === 'BUY';
    markers.push({
      time: candle.time as Time,
      position: 'atPriceMiddle',
      shape: 'circle',
      color: isBuy ? CHART_COLORS.TRADE_BUY : CHART_COLORS.TRADE_SELL,
      size: CHART_TRADE_MARKER_SIZE,
      id: transaction.id,
      price: candle.close,
    });
  }

  return markers.sort((left, right) => {
    const leftTime = typeof left.time === 'number' ? left.time : 0;
    const rightTime = typeof right.time === 'number' ? right.time : 0;
    return leftTime - rightTime;
  });
}
