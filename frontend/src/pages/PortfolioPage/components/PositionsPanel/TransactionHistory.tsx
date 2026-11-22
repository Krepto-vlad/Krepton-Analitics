import { Button, ContentSkeleton, TickerAvatar } from '../../../../components/ui';
import { LOADING_MESSAGES } from '../../../../constants';
import { formatTransactionDate, formatUsdDecimal } from './positionsPanelFormat';
import styles from './PositionsPanel.module.scss';

interface TransactionHistoryProps {
  isLoading: boolean;
  transactions: import('../../../../types/portfolio.types').PortfolioTransaction[];
  logoByTicker: Record<string, string | null>;
  displayCurrency: import('../../../../constants').Currency;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function TransactionHistory({
  isLoading,
  transactions,
  logoByTicker,
  displayCurrency,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: TransactionHistoryProps) {
  return (
    <div className={styles.holdingsSection}>
      <div className={styles.holdingsHeader}>
        <h2 className={styles.holdingsTitle}>History</h2>
      </div>

      {isLoading ? (
        <ContentSkeleton preset="table" label={LOADING_MESSAGES.PORTFOLIO_TRANSACTIONS} />
      ) : transactions.length === 0 ? (
        <p className={styles.emptyHistoryText}>No buy or sell transactions yet.</p>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thName}>DATE</th>
                  <th className={styles.thTicker}>TYPE</th>
                  <th className={styles.thTicker}>TICKER</th>
                  <th className={styles.thName}>NAME</th>
                  <th className={styles.thNum}>SHARES</th>
                  <th className={styles.thNum}>PRICE</th>
                  <th className={styles.thNum}>TOTAL</th>
                  <th className={styles.thNum}>CURRENCY</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const totalAmount =
                    transaction.displayTotalAmount ??
                    transaction.shares * transaction.pricePerShare;
                  const isBuy = transaction.transactionType === 'BUY';

                  return (
                    <tr key={transaction.id} className={styles.tableRow}>
                      <td className={styles.historyTd}>{formatTransactionDate(transaction)}</td>
                      <td className={styles.historyTd}>
                        <span
                          className={`${styles.typeBadge} ${isBuy ? styles.typeBadgeBuy : styles.typeBadgeSell}`}
                        >
                          {transaction.transactionType}
                        </span>
                      </td>
                      <td className={styles.historyTd}>
                        <div className={styles.historyTickerCell}>
                          <TickerAvatar
                            ticker={transaction.ticker}
                            logoUrl={logoByTicker[transaction.ticker.toUpperCase()] ?? null}
                            size="sm"
                          />
                          <span className={styles.historyTicker}>{transaction.ticker}</span>
                        </div>
                      </td>
                      <td className={styles.historyTd}>{transaction.companyName}</td>
                      <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                        {transaction.shares}
                      </td>
                      <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                        {formatUsdDecimal(transaction.pricePerShare, displayCurrency)}
                      </td>
                      <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                        {formatUsdDecimal(totalAmount, displayCurrency)}
                      </td>
                      <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                        {displayCurrency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className={styles.loadMoreRow}>
              <Button variant="outline" size="sm" loading={isLoadingMore} onClick={onLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
