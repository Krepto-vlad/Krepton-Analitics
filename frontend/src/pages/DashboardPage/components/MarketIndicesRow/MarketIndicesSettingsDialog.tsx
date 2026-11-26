import { useId, useRef } from 'react';
import { DASHBOARD_MARKET_INDICES } from '../../../../constants';
import { Button } from '../../../../components/ui';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import styles from './MarketIndicesSettingsDialog.module.scss';

interface MarketIndicesSettingsDialogProps {
  isIndexVisible: (ticker: string) => boolean;
  onIndexVisibleChange: (ticker: string, isVisible: boolean) => void;
  onClose: () => void;
}

export function MarketIndicesSettingsDialog({
  isIndexVisible,
  onIndexVisibleChange,
  onClose,
}: MarketIndicesSettingsDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap({ containerRef: dialogRef, isActive: true, onEscape: onClose });

  return (
    <div
      className={styles.overlay}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <h2 id={titleId} className={styles.title}>
          Market indices
        </h2>
        <p id={descriptionId} className={styles.description}>
          Choose which index cards appear on the dashboard. Visibility and order stay in this
          browser after refresh and re-login on this device.
        </p>

        <ul className={styles.list}>
          {DASHBOARD_MARKET_INDICES.map((index) => (
            <li key={index.ticker}>
              <label className={styles.option}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isIndexVisible(index.ticker)}
                  onChange={(event) => onIndexVisibleChange(index.ticker, event.target.checked)}
                />
                <span className={styles.optionLabel}>{index.label}</span>
                <span className={styles.optionTicker}>{index.ticker}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
