import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchStockAssetClass } from '../../../../api/stockApi';
import {
  ASSET_CLASS_BADGE_COLORS,
  ASSET_CLASS_BADGE_FALLBACK_COLOR,
  ASSET_CLASS_BADGE_SKELETON_COUNT,
  ASSET_CLASS_BASIS_CLOSE_LABEL,
  ASSET_CLASS_BASIS_INTRO,
  ASSET_CLASS_BASIS_TITLE,
} from '../../../../constants';
import { Button, Skeleton } from '../../../../components/ui';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import type { StockAssetClassBasis, StockAssetClassBadge } from '../../../../types/stock.types';
import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import styles from './AssetClassBadges.module.scss';

interface AssetClassBadgesProps {
  ticker: string;
}

function resolveBadgeColor(assetClass: string): string {
  return (
    ASSET_CLASS_BADGE_COLORS[assetClass as keyof typeof ASSET_CLASS_BADGE_COLORS] ??
    ASSET_CLASS_BADGE_FALLBACK_COLOR
  );
}

function formatClassifiedAt(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AssetClassBadges({ ticker }: AssetClassBadgesProps) {
  const [badges, setBadges] = useState<StockAssetClassBadge[]>([]);
  const [basis, setBasis] = useState<StockAssetClassBasis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBasisOpen, setIsBasisOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    containerRef: dialogRef,
    isActive: isBasisOpen,
    onEscape: () => setIsBasisOpen(false),
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadBadges(): Promise<void> {
      setIsLoading(true);
      setBadges([]);
      setBasis(null);
      setIsBasisOpen(false);

      try {
        const response = await fetchStockAssetClass(ticker);
        if (!isCancelled) {
          setBadges(response.badges);
          setBasis(response.basis);
        }
      } catch {
        if (!isCancelled) {
          setBadges([]);
          setBasis(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBadges();
    return () => {
      isCancelled = true;
    };
  }, [ticker]);

  if (isLoading) {
    return (
      <div className={styles.row} aria-busy="true" aria-label="Loading asset class">
        {Array.from({ length: ASSET_CLASS_BADGE_SKELETON_COUNT }, (_, index) => (
          <Skeleton key={index} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.row}>
        {badges.map((badge) => (
          <button
            key={badge.assetClass}
            type="button"
            className={styles.badge}
            style={toCssCustomProperties({
              '--asset-class-badge-color': resolveBadgeColor(badge.assetClass),
            })}
            aria-haspopup="dialog"
            onClick={() => setIsBasisOpen(true)}
          >
            {badge.label}
          </button>
        ))}
      </div>

      {isBasisOpen && basis
        ? createPortal(
            <div
              className={styles.overlay}
              onClick={(event) => event.target === event.currentTarget && setIsBasisOpen(false)}
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
                  {ASSET_CLASS_BASIS_TITLE}
                </h2>
                <p id={descriptionId} className={styles.description}>
                  {ASSET_CLASS_BASIS_INTRO}
                </p>

                <dl className={styles.details}>
                  <div className={styles.detailRow}>
                    <dt>Yahoo quote type</dt>
                    <dd>{basis.quoteType ?? 'Not provided'}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Yahoo fund category</dt>
                    <dd>{basis.categoryName ?? 'Not used'}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Name signal</dt>
                    <dd>{basis.nameSignal ?? 'None'}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Classified at</dt>
                    <dd>{formatClassifiedAt(basis.classifiedAt)}</dd>
                  </div>
                </dl>

                <div className={styles.actions}>
                  <Button variant="primary" size="sm" onClick={() => setIsBasisOpen(false)}>
                    {ASSET_CLASS_BASIS_CLOSE_LABEL}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
