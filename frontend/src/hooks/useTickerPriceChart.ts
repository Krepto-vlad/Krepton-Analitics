import { useEffect, useRef, useState } from 'react';
import { AreaSeries, ColorType, createChart, createSeriesMarkers } from 'lightweight-charts';
import type {
  AreaData,
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  MouseEventParams,
  SeriesMarker,
  Time,
} from 'lightweight-charts';
import type { PortfolioTransaction } from '../api/portfolioApi';
import { CHART_COLORS } from '../constants';
import { useAppSelector } from './useAppSelector';
import { formatChartPrice } from './useEquityChart';
import type { OhlcvCandle } from '../types/stock.types';

const CHART_FALLBACK_HEIGHT_PX = 360;

function readCssColor(variableName: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value.length > 0 ? value : fallback;
}

function getThemeChartColors(): { text: string; grid: string; line: string; areaTop: string } {
  return {
    text: readCssColor('--color-foreground-muted', CHART_COLORS.TEXT),
    grid: readCssColor('--color-chart-grid', CHART_COLORS.GRID),
    line: readCssColor('--color-primary', '#10b981'),
    areaTop: readCssColor('--color-primary-muted', 'rgba(16, 185, 129, 0.22)'),
  };
}

function toAreaData(candles: OhlcvCandle[]): AreaData<Time>[] {
  return candles.map((candle) => ({
    time: candle.time as Time,
    value: candle.close,
  }));
}

export interface TradeMarkerHoverState {
  trade: PortfolioTransaction;
  x: number;
  y: number;
}

export interface UseTickerPriceChartResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  hoveredTrade: TradeMarkerHoverState | null;
}

/**
 * Area chart for ticker OHLCV closes.
 * Container must stay mounted (same pattern as useEquityChart) so createChart
 * does not race against conditional render of the chart div.
 */
export function useTickerPriceChart(
  candles: OhlcvCandle[],
  currency: string,
  tradeMarkers: SeriesMarker<Time>[] = [],
  trades: PortfolioTransaction[] = []
): UseTickerPriceChartResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [hoveredTrade, setHoveredTrade] = useState<TradeMarkerHoverState | null>(null);
  const theme = useAppSelector((state) => state.ui.theme);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const themeColors = getThemeChartColors();
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || CHART_FALLBACK_HEIGHT_PX,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: themeColors.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: themeColors.grid },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: { mode: 1 },
      localization: {
        priceFormatter: (value: number) => formatChartPrice(value, currency),
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: themeColors.line,
      topColor: themeColors.areaTop,
      bottomColor: 'rgba(16, 185, 129, 0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;
    markersPluginRef.current = createSeriesMarkers(areaSeries, []);
    setIsChartReady(true);

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) {
        return;
      }
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || CHART_FALLBACK_HEIGHT_PX,
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markersPluginRef.current?.detach();
      markersPluginRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setIsChartReady(false);
    };
    // Mount-only: currency/theme updates go through applyOptions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chart must not remount on currency
  }, []);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) {
      return;
    }

    const themeColors = getThemeChartColors();

    chartRef.current.applyOptions({
      localization: {
        priceFormatter: (value: number) => formatChartPrice(value, currency),
      },
      layout: {
        textColor: themeColors.text,
      },
      grid: {
        horzLines: { color: themeColors.grid },
      },
    });

    seriesRef.current.applyOptions({
      lineColor: themeColors.line,
      topColor: themeColors.areaTop,
    });
  }, [currency, theme]);

  useEffect(() => {
    if (!isChartReady || !seriesRef.current || !chartRef.current) {
      return;
    }

    if (candles.length === 0) {
      seriesRef.current.setData([]);
      return;
    }

    seriesRef.current.setData(toAreaData(candles));
    chartRef.current.timeScale().fitContent();
  }, [candles, isChartReady]);

  useEffect(() => {
    if (!isChartReady || !markersPluginRef.current) {
      return;
    }

    markersPluginRef.current.setMarkers(tradeMarkers);
  }, [isChartReady, tradeMarkers]);

  useEffect(() => {
    if (!isChartReady || !chartRef.current) {
      return;
    }

    const chart = chartRef.current;
    const tradesById = new Map(trades.map((trade) => [trade.id, trade]));

    const handleCrosshairMove = (param: MouseEventParams<Time>): void => {
      if (!param.point || param.hoveredInfo?.objectKind !== 'series-marker') {
        setHoveredTrade(null);
        return;
      }

      const objectId = param.hoveredInfo.objectId;
      if (typeof objectId !== 'string') {
        setHoveredTrade(null);
        return;
      }

      const trade = tradesById.get(objectId);
      if (!trade) {
        setHoveredTrade(null);
        return;
      }

      setHoveredTrade({
        trade,
        x: param.point.x,
        y: param.point.y,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [isChartReady, trades]);

  const activeHoveredTrade = candles.length > 0 ? hoveredTrade : null;

  return { containerRef, hoveredTrade: activeHoveredTrade };
}
