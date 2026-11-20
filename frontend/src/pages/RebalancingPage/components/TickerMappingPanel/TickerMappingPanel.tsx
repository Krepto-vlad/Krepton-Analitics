import { formatMoneyWhole } from '../../../../utils/moneyDisplay';
import { REBALANCING_MAPPING_EXCLUDED_LABEL, type Currency } from '../../../../constants';
import type { RebalancingTickerMappingItem } from '../../../../types/rebalancing.types';
import styles from './TickerMappingPanel.module.scss';

interface TickerMappingPanelProps {
  mappings: RebalancingTickerMappingItem[];
  displayCurrency: Currency;
}

function formatMappingSource(source: RebalancingTickerMappingItem['mappingSource']): string {
  if (source === 'ticker') return 'Ticker rule';
  if (source === 'asset_class') return 'Asset class rule';
  if (source === 'sector') return 'Sector inference';
  if (source === 'unmapped') return 'Unmapped';
  if (source === 'excluded') return REBALANCING_MAPPING_EXCLUDED_LABEL;
  return 'Default (Equities)';
}

export function TickerMappingPanel({ mappings, displayCurrency }: TickerMappingPanelProps) {
  if (mappings.length === 0) {
    return null;
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Holdings → Strategy Bucket Mapping</h2>
        <p className={styles.subtitle}>
          Each position is classified into the selected strategy&apos;s buckets using ticker rules,
          inferred asset classes, and sector fallbacks.
        </p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Sector</th>
              <th>Strategy Bucket</th>
              <th>Inferred Class</th>
              <th>Mapping</th>
              <th className={styles.valueColumn}>Value</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr key={mapping.ticker}>
                <td>{mapping.ticker}</td>
                <td>{mapping.sector ?? '—'}</td>
                <td>{mapping.bucketLabel}</td>
                <td>{mapping.inferredAssetClass.replaceAll('_', ' ')}</td>
                <td>{formatMappingSource(mapping.mappingSource)}</td>
                <td className={styles.valueColumn}>
                  {formatMoneyWhole(mapping.marketValue, displayCurrency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
