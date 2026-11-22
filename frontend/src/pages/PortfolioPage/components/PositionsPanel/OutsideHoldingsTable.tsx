import { Link } from 'react-router-dom';
import { TickerAvatar } from '../../../../components/ui';
import {
  buildTickerDetailPath,
  OUTSIDE_ANALYSIS_HOLDINGS_NOTE,
  OUTSIDE_ANALYSIS_HOLDINGS_TITLE,
} from '../../../../constants';
import { formatMoneyWhole } from '../../../../utils/moneyDisplay';
import { formatUsdDecimal } from './positionsPanelFormat';
import styles from './PositionsPanel.module.scss';

interface OutsideHoldingsTableProps {
  positions: Array<{
    id: string;
    ticker: string;
    companyName: string;
    shares: number;
    currentPrice: number;
    marketValue: number;
    logoUrl?: string | null;
  }>;
  logoByTicker: Record<string, string | null>;
  displayCurrency: import('../../../../constants').Currency;
}

export function OutsideHoldingsTable({
  positions,
  logoByTicker,
  displayCurrency,
}: OutsideHoldingsTableProps) {
  if (positions.length === 0) {
    return null;
  }

  return (
    <div className={styles.holdingsSection}>
      <div className={styles.holdingsHeader}>
        <h2 className={styles.holdingsTitle}>{OUTSIDE_ANALYSIS_HOLDINGS_TITLE}</h2>
      </div>
      <p className={styles.outsideNote}>{OUTSIDE_ANALYSIS_HOLDINGS_NOTE}</p>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thTicker}>TICKER</th>
              <th className={styles.thName}>NAME</th>
              <th className={styles.thNum}>SHARES</th>
              <th className={styles.thNum}>PRICE</th>
              <th className={styles.thNum}>MARKET VALUE</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id} className={styles.tableRow}>
                <td className={styles.tdTicker}>
                  <Link
                    to={buildTickerDetailPath(position.ticker.toUpperCase())}
                    className={styles.tickerLink}
                  >
                    <TickerAvatar
                      ticker={position.ticker}
                      logoUrl={
                        position.logoUrl ?? logoByTicker[position.ticker.toUpperCase()] ?? null
                      }
                      size="sm"
                    />
                    <span className={styles.tickerSymbol}>{position.ticker}</span>
                  </Link>
                </td>
                <td>{position.companyName}</td>
                <td className={styles.tdNum}>{position.shares}</td>
                <td className={styles.tdNum}>
                  {formatUsdDecimal(position.currentPrice, displayCurrency)}
                </td>
                <td className={styles.tdNum}>
                  {formatMoneyWhole(position.marketValue, displayCurrency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
