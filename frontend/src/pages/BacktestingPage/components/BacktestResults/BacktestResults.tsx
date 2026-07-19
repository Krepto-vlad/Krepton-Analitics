import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Currency } from '../../../../constants';
import { BACKTEST_BENCHMARK_LABEL } from '../../../../constants';
import type { StockBacktestResponse } from '../../../../types/stock.types';
import { fetchFxRate } from '../../../../api/fxApi';
import { getTodayIsoDate } from '../../../../utils/moneyDisplay';
import {
  BacktestComparisonChart,
  BacktestGroupedPeriodChart,
} from '../BacktestBarChart/BacktestBarChart';
import {
  BACKTEST_BENCHMARK_COLOR,
  BACKTEST_PORTFOLIO_COLOR,
  convertBacktestResponseForDisplay,
  formatBacktestMoney,
  formatBacktestPercent,
  getBacktestTickerColor,
} from '../../utils/backtestFormat';
import { formatAllocationLabel } from '../../utils/backtestAllocations';
import styles from './BacktestResults.module.scss';

interface BacktestResultsProps {
  data: StockBacktestResponse;
  displayCurrency: Currency;
}

function useBacktestDisplayData(
  data: StockBacktestResponse,
  displayCurrency: Currency
): StockBacktestResponse {
  const sourceCurrency = (data.displayCurrency as Currency) || displayCurrency;
  const [convertedData, setConvertedData] = useState<StockBacktestResponse | null>(null);

  useEffect(() => {
    if (sourceCurrency === displayCurrency) {
      return;
    }

    let cancelled = false;

    void fetchFxRate(sourceCurrency, displayCurrency, getTodayIsoDate())
      .then(({ rate }) => {
        if (!cancelled) {
          setConvertedData(convertBacktestResponseForDisplay(data, rate, displayCurrency));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConvertedData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data, displayCurrency, sourceCurrency]);

  if (sourceCurrency === displayCurrency) {
    return data;
  }

  return convertedData ?? data;
}

export function BacktestResults({ data, displayCurrency }: BacktestResultsProps) {
  const resultData = useBacktestDisplayData(data, displayCurrency);

  const allocationLabel = formatAllocationLabel(
    resultData.holdings.map((holding) => ({
      ticker: holding.ticker,
      name: holding.name,
      weightPercent: holding.weightPercent,
    }))
  );

  const isPortfolioPositive = resultData.portfolio.returnPercent >= 0;

  const comparisonItems = [
    {
      id: 'portfolio',
      label: 'Portfolio',
      value: resultData.portfolio.returnPercent,
      color: BACKTEST_PORTFOLIO_COLOR,
    },
    {
      id: resultData.benchmark.ticker,
      label: resultData.benchmark.label,
      value: resultData.benchmark.returnPercent,
      color: BACKTEST_BENCHMARK_COLOR,
    },
  ];

  const groupedPeriods = resultData.periodBreakdown.map((periodSlice) => ({
    label: periodSlice.label,
    bars: [
      {
        id: `${periodSlice.period}-portfolio`,
        label: 'Portfolio',
        value: periodSlice.portfolioReturnPercent,
        color: BACKTEST_PORTFOLIO_COLOR,
      },
      {
        id: `${periodSlice.period}-benchmark`,
        label: BACKTEST_BENCHMARK_LABEL,
        value: periodSlice.benchmarkReturnPercent,
        color: BACKTEST_BENCHMARK_COLOR,
      },
    ],
  }));

  return (
    <section className={styles.card}>
      <p className={styles.intro}>
        If you invested{' '}
        <span className={styles.introAmount}>
          {formatBacktestMoney(resultData.amount, displayCurrency)}
        </span>{' '}
        in <span className={styles.introTicker}>{allocationLabel}</span> {resultData.periodLabel}{' '}
        ago, your portfolio would be worth:
      </p>

      <div className={styles.portfolioHero}>
        <div className={styles.portfolioValueRow}>
          <span className={styles.portfolioValue}>
            {formatBacktestMoney(resultData.portfolio.finalValue, displayCurrency)}
          </span>
          <span
            className={`${styles.portfolioChange} ${isPortfolioPositive ? styles.positive : styles.negative}`}
          >
            {isPortfolioPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {formatBacktestPercent(resultData.portfolio.returnPercent)}
          </span>
        </div>
      </div>

      <div className={styles.benchmarkBadge}>
        <span>{BACKTEST_BENCHMARK_LABEL} benchmark for the same period:</span>
        <span className={styles.benchmarkValue}>
          {formatBacktestPercent(resultData.benchmark.returnPercent)} (
          {formatBacktestMoney(resultData.benchmark.finalValue, displayCurrency)})
        </span>
      </div>

      <div className={styles.holdingsSection}>
        <h3 className={styles.holdingsTitle}>Holdings breakdown</h3>
        <div className={styles.resultsGrid}>
          {resultData.holdings.map((holding, index) => {
            const isPositive = holding.returnPercent >= 0;

            return (
              <article key={holding.ticker} className={styles.resultCard}>
                <div className={styles.holdingHeader}>
                  <span
                    className={styles.resultTicker}
                    style={{ color: getBacktestTickerColor(index) }}
                  >
                    ${holding.ticker}
                  </span>
                  <span className={styles.holdingWeight}>{holding.weightPercent.toFixed(1)}%</span>
                </div>
                <span className={styles.resultName}>{holding.name}</span>
                <span className={styles.holdingAllocated}>
                  Allocated {formatBacktestMoney(holding.allocatedAmount, displayCurrency)}
                </span>
                <div className={styles.resultValueRow}>
                  <span className={styles.holdingContribution}>
                    {formatBacktestMoney(holding.contributionValue, displayCurrency)}
                  </span>
                  <span
                    className={`${styles.resultChange} ${isPositive ? styles.positive : styles.negative}`}
                  >
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {formatBacktestPercent(holding.returnPercent)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <BacktestComparisonChart title="Return vs. Benchmark" items={comparisonItems} />
        </div>
        <div className={styles.chartCard}>
          <BacktestGroupedPeriodChart
            title="Portfolio Returns by Period"
            periods={groupedPeriods}
            legend={[
              { label: 'Portfolio', color: BACKTEST_PORTFOLIO_COLOR },
              { label: BACKTEST_BENCHMARK_LABEL, color: BACKTEST_BENCHMARK_COLOR },
            ]}
          />
        </div>
      </div>

      <p className={styles.disclaimer}>
        Simulated buy-and-hold using historical closing prices and fixed allocation weights. Past
        performance does not guarantee future results. Benchmark uses SPY as an S&amp;P 500 proxy.
        Amounts are shown in {displayCurrency}.
      </p>
    </section>
  );
}
