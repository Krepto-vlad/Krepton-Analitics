import { useEffect, useRef, useState } from 'react';
import { AreaSeries, ColorType, CrosshairMode, createChart } from 'lightweight-charts';
import type { AreaData, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { DASHBOARD_INDEX_CHART_COLOR_FALLBACKS } from '../constants';
import type { OhlcvCandle } from '../types/stock.types';
import { useAppSelector } from './useAppSelector';

const FILL_ALPHA_HEX = '33';
const TRANSPARENT_FILL = 'rgba(0, 0, 0, 0)';

function readCssColor(variableName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value.length > 0 ? value : fallback;
}

function readTrendColor(isPositive: boolean): string {
  return isPositive
    ? readCssColor('--color-chart-up', DASHBOARD_INDEX_CHART_COLOR_FALLBACKS.up)
    : readCssColor('--color-chart-down', DASHBOARD_INDEX_CHART_COLOR_FALLBACKS.down);
}

function toAreaData(candles: OhlcvCandle[]): AreaData<Time>[] {
  return candles.map((candle) => ({ time: candle.time as Time, value: candle.close }));
}

/**
 * Small static area chart: no axes, grid, or crosshair, so the card can stay clickable.
 * The container must stay mounted (same pattern as the other chart hooks).
 */
export function useIndexSparkline(candles: OhlcvCandle[], isPositive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const theme = useAppSelector((state) => state.ui.theme);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Hidden },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;
    seriesRef.current = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    setIsChartReady(true);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setIsChartReady(false);
    };
  }, []);

  useEffect(() => {
    if (!isChartReady || !seriesRef.current || !chartRef.current) {
      return;
    }

    const trendColor = readTrendColor(isPositive);
    seriesRef.current.applyOptions({
      lineColor: trendColor,
      topColor: `${trendColor}${FILL_ALPHA_HEX}`,
      bottomColor: TRANSPARENT_FILL,
    });
    seriesRef.current.setData(toAreaData(candles));
    chartRef.current.timeScale().fitContent();
  }, [candles, isPositive, isChartReady, theme]);

  return { containerRef };
}
