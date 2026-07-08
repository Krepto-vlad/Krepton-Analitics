import { useEffect, useRef, useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, AreaData, Time } from 'lightweight-charts';
import type { PortfolioStats, EquityDataPoint } from '../../../../types/portfolio.types';
import { EQUITY_PERIODS } from '../../../../constants';
import styles from './PortfolioEquityCard.module.scss';

interface PortfolioEquityCardProps {
  stats: PortfolioStats;
  equityHistory: EquityDataPoint[];
  currency: string;
}

type EquityPeriod = (typeof EQUITY_PERIODS)[number]['value'];

function filterHistoryByPeriod(
  history: EquityDataPoint[],
  period: EquityPeriod
): EquityDataPoint[] {
  if (period === 'ALL') return history;

  const cutoff = new Date();
  if (period === '1W') cutoff.setDate(cutoff.getDate() - 7);
  else if (period === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
  else if (period === '3M') cutoff.setMonth(cutoff.getMonth() - 3);
  else if (period === '6M') cutoff.setMonth(cutoff.getMonth() - 6);
  else if (period === '1Y') cutoff.setFullYear(cutoff.getFullYear() - 1);

  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return history.filter((point) => point.time >= cutoffStr);
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPnl(value: number, currency: string): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatCurrency(value, currency)}`;
}

function formatChartPrice(value: number): string {
  const symbol = '$';
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${symbol}${Math.round(value / 1_000)}K`;
  return `${symbol}${Math.round(value)}`;
}

export function PortfolioEquityCard({ stats, equityHistory, currency }: PortfolioEquityCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<EquityPeriod>('1Y');

  const filteredHistory = useMemo(
    () => filterHistoryByPeriod(equityHistory, selectedPeriod),
    [equityHistory, selectedPeriod]
  );

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 200,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8a8a96',
      },
      localization: {
        priceFormatter: formatChartPrice,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      crosshair: { mode: 1 },
      handleScroll: false,
      handleScale: false,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.22)',
      bottomColor: 'rgba(16, 185, 129, 0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update data when period changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || filteredHistory.length === 0) return;

    const chartData: AreaData<Time>[] = filteredHistory.map((point) => ({
      time: point.time as Time,
      value: point.value,
    }));

    seriesRef.current.setData(chartData);
    chartRef.current.timeScale().fitContent();
  }, [filteredHistory]);

  const isPnlPositive = stats.totalPnl >= 0;
  const isDayPnlPositive = stats.dayPnl >= 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLabelRow}>
          <TrendingUp size={13} className={styles.cardLabelIcon} />
          <span className={styles.cardLabel}>PORTFOLIO EQUITY</span>
        </div>
        <div className={styles.periodSelector}>
          {EQUITY_PERIODS.map((period) => (
            <button
              key={period.value}
              className={`${styles.periodButton} ${selectedPeriod === period.value ? styles.activePeriod : ''}`}
              onClick={() => setSelectedPeriod(period.value as EquityPeriod)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.valueRow}>
        <span className={styles.totalValue}>{formatCurrency(stats.totalValue, currency)}</span>
        <span
          className={`${styles.totalPnlPercent} ${isPnlPositive ? styles.positive : styles.negative}`}
        >
          {isPnlPositive ? '+' : ''}
          {stats.totalPnlPercent.toFixed(1)}% YoY
        </span>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total P&L</span>
          <span
            className={`${styles.statValue} ${isPnlPositive ? styles.positive : styles.negative}`}
          >
            {formatPnl(stats.totalPnl, currency)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Unrealized</span>
          <span
            className={`${styles.statValue} ${stats.unrealizedPnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatPnl(stats.unrealizedPnl, currency)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Realized</span>
          <span
            className={`${styles.statValue} ${stats.realizedPnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatPnl(stats.realizedPnl, currency)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Day P&L</span>
          <span
            className={`${styles.statValue} ${isDayPnlPositive ? styles.positive : styles.negative}`}
          >
            {formatPnl(stats.dayPnl, currency)}
          </span>
        </div>
      </div>

      <div ref={containerRef} className={styles.chartContainer} />
    </div>
  );
}
