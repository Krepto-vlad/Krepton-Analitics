import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, AreaData, Time } from 'lightweight-charts';
import type { EquityDataPoint } from '../types/portfolio.types';
import { EQUITY_PERIODS } from '../constants';

export type EquityPeriod = (typeof EQUITY_PERIODS)[number]['value'];

export function filterHistoryByPeriod(
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

export function formatChartPrice(value: number, currency = 'USD'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: value >= 1_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
  }).format(value);

  return formatted;
}

export interface UseEquityChartResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedPeriod: EquityPeriod;
  setSelectedPeriod: (period: EquityPeriod) => void;
  filteredHistory: EquityDataPoint[];
  currentValue: number;
}

/**
 * Encapsulates all lightweight-charts setup and teardown for an area equity chart.
 * Returns a ref to attach to the container div, period state, and the filtered data.
 */
export function useEquityChart(
  history: EquityDataPoint[],
  defaultPeriod: EquityPeriod = '1Y',
  currency = 'USD'
): UseEquityChartResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<EquityPeriod>(defaultPeriod);

  const filteredHistory = useMemo(
    () => filterHistoryByPeriod(history, selectedPeriod),
    [history, selectedPeriod]
  );

  const currentValue = filteredHistory.at(-1)?.value ?? 0;

  // Create chart instance once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 180,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8a8a96',
        attributionLogo: false,
      },
      localization: { priceFormatter: (value: number) => formatChartPrice(value, currency) },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.05 } },
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
  }, [currency]);

  // Push new data whenever the filtered slice changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || filteredHistory.length === 0) return;

    const chartData: AreaData<Time>[] = filteredHistory.map((point) => ({
      time: point.time as Time,
      value: point.value,
    }));

    seriesRef.current.setData(chartData);
    chartRef.current.timeScale().fitContent();
  }, [filteredHistory]);

  return { containerRef, selectedPeriod, setSelectedPeriod, filteredHistory, currentValue };
}
