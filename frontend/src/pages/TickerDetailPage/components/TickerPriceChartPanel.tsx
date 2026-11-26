import type { SeriesMarker, Time } from 'lightweight-charts';
import type { PortfolioTransaction } from '../../../api/portfolioApi';
import {
  CHART_TRADE_TOOLTIP_MIN_TOP_PX,
  CHART_TRADE_TOOLTIP_OFFSET_PX,
  LOADING_MESSAGES,
  type Currency,
} from '../../../constants';
import { AsyncStatePanel } from '../../../components/ui';
import { useTickerPriceChart } from '../../../hooks/useTickerPriceChart';
import { convertAmountToDisplayCurrency, formatMoney } from '../../../utils/moneyDisplay';
import { joinClassNames } from '../../../utils/classNames';
import { toCssCustomProperties } from '../../../utils/cssCustomProperties';
import type { OhlcvCandle } from '../../../types/stock.types';
import styles from '../TickerDetailPage.module.scss';

interface TickerPriceChartPanelProps {
  candles: OhlcvCandle[];
  currency: Currency;
  isLoading: boolean;
  tradeMarkers?: SeriesMarker<Time>[];
  trades?: PortfolioTransaction[];
  fxRates?: Record<Currency, number>;
  formatAsIndexLevel?: boolean;
}

function resolveTradeDateLabel(trade: PortfolioTransaction): string {
  const rawDate = trade.transactionDate ?? trade.createdAt.slice(0, 10);
  const parsed = new Date(`${rawDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Mounted only when the ticker page body is visible so createChart
 * always attaches to a live container (avoids empty-ref race).
 */
export function TickerPriceChartPanel({
  candles,
  currency,
  isLoading,
  tradeMarkers = [],
  trades = [],
  fxRates = { USD: 1, EUR: 1 },
  formatAsIndexLevel = false,
}: TickerPriceChartPanelProps) {
  const { containerRef, hoveredTrade } = useTickerPriceChart(
    candles,
    currency,
    tradeMarkers,
    trades,
    { formatAsIndexLevel }
  );

  const tradeSourceCurrency = (hoveredTrade?.trade.currency ?? currency) as Currency;
  const displayTradePrice =
    hoveredTrade != null
      ? convertAmountToDisplayCurrency(
          hoveredTrade.trade.pricePerShare,
          tradeSourceCurrency,
          currency,
          fxRates
        )
      : 0;
  const displayTradeTotal =
    hoveredTrade != null
      ? convertAmountToDisplayCurrency(
          hoveredTrade.trade.shares * hoveredTrade.trade.pricePerShare,
          tradeSourceCurrency,
          currency,
          fxRates
        )
      : 0;

  return (
    <div className={styles.chartArea}>
      {isLoading && candles.length === 0 && (
        <div className={styles.chartOverlay}>
          <AsyncStatePanel
            isLoading
            loadingPreset="chart"
            loadingMessage={LOADING_MESSAGES.TICKER_PRICE_HISTORY}
            className={styles.loadingPanel}
          />
        </div>
      )}

      {!isLoading && candles.length === 0 && (
        <div className={styles.chartOverlay}>
          <p className={styles.companyName}>No chart data for this period.</p>
        </div>
      )}

      <div
        ref={containerRef}
        className={`${styles.chartContainer} ${hoveredTrade ? styles.chartContainerHoverTrade : ''}`}
      />

      {hoveredTrade && (
        <div
          className={styles.tradeTooltip}
          style={toCssCustomProperties({
            '--tooltip-left': `${hoveredTrade.x + CHART_TRADE_TOOLTIP_OFFSET_PX}px`,
            '--tooltip-top': `${Math.max(hoveredTrade.y - CHART_TRADE_TOOLTIP_OFFSET_PX, CHART_TRADE_TOOLTIP_MIN_TOP_PX)}px`,
          })}
          role="tooltip"
        >
          <p
            className={joinClassNames(
              styles.tradeTooltipType,
              hoveredTrade.trade.transactionType === 'BUY'
                ? styles.tradeTooltipBuy
                : styles.tradeTooltipSell
            )}
          >
            {hoveredTrade.trade.transactionType === 'BUY' ? 'Buy' : 'Sell'}
          </p>
          <dl className={styles.tradeTooltipStats}>
            <div className={styles.tradeTooltipRow}>
              <dt>Date</dt>
              <dd>{resolveTradeDateLabel(hoveredTrade.trade)}</dd>
            </div>
            <div className={styles.tradeTooltipRow}>
              <dt>Shares</dt>
              <dd>{hoveredTrade.trade.shares.toLocaleString('en-US')}</dd>
            </div>
            <div className={styles.tradeTooltipRow}>
              <dt>Price</dt>
              <dd>{formatMoney(displayTradePrice, currency)}</dd>
            </div>
            <div className={styles.tradeTooltipRow}>
              <dt>Total</dt>
              <dd>{formatMoney(displayTradeTotal, currency)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
