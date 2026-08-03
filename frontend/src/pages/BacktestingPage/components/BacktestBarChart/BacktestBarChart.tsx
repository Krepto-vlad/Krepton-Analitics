import styles from './BacktestBarChart.module.scss';

export interface BacktestBarChartItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface BacktestComparisonChartProps {
  title: string;
  items: BacktestBarChartItem[];
}

interface BacktestGroupedChartProps {
  title: string;
  periods: Array<{
    label: string;
    bars: BacktestBarChartItem[];
  }>;
  legend: Array<{ label: string; color: string }>;
}

function normalizeBarHeight(value: number, maxValue: number): number {
  if (maxValue <= 0) {
    return value > 0 ? 100 : 4;
  }
  const normalized = (Math.max(value, 0) / maxValue) * 100;
  return Math.max(normalized, value > 0 ? 8 : 4);
}

export function BacktestComparisonChart({ title, items }: BacktestComparisonChartProps) {
  const maxValue = Math.max(...items.map((item) => Math.max(item.value, 0)), 1);
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={styles.chart}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.plotWrapper}>
        <div className={styles.gridLines}>
          {gridSteps.map((step) => (
            <div key={step} className={styles.gridLine} />
          ))}
        </div>
        <div className={styles.plot}>
          {items.map((item) => (
            <div key={item.id} className={styles.barGroup}>
              <span className={styles.barValue}>
                {item.value >= 0 ? '+' : ''}
                {item.value.toFixed(1)}%
              </span>
              <div className={styles.barTrack}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${normalizeBarHeight(item.value, maxValue)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className={styles.barLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BacktestGroupedPeriodChart({ title, periods, legend }: BacktestGroupedChartProps) {
  const maxValue = Math.max(
    ...periods.flatMap((period) => period.bars.map((bar) => Math.max(bar.value, 0))),
    1
  );

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={styles.chart}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.plotWrapper}>
        <div className={styles.gridLines}>
          {gridSteps.map((step) => (
            <div key={step} className={styles.gridLine} />
          ))}
        </div>
        <div className={styles.groupedPlot}>
          {periods.map((period) => (
            <div key={period.label} className={styles.periodGroup}>
              <div className={styles.periodBars}>
                {period.bars.map((bar) => (
                  <div
                    key={bar.id}
                    className={styles.periodBar}
                    style={{
                      height: `${normalizeBarHeight(bar.value, maxValue)}%`,
                      backgroundColor: bar.color,
                    }}
                    title={`${bar.label}: ${bar.value.toFixed(1)}%`}
                  />
                ))}
              </div>
              <span className={styles.periodLabel}>{period.label}</span>
            </div>
          ))}
        </div>
      </div>
      {legend.length > 1 && (
        <div className={styles.legend}>
          {legend.map((entry) => (
            <span key={entry.label} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ backgroundColor: entry.color }} />
              {entry.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
