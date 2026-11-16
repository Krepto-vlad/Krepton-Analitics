import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  REBALANCING_STRATEGY_GUIDE_CLOSE_LABEL,
  REBALANCING_STRATEGY_GUIDE_DISCLAIMER,
  REBALANCING_STRATEGY_GUIDE_KICKER,
  REBALANCING_STRATEGY_GUIDE_SOURCE_PREFIX,
  REBALANCING_STRATEGY_GUIDE_SWITCH_LABEL,
} from '../../../../constants';
import { Select } from '../../../../components/ui';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import type { RebalancingStrategyId } from '../../../../types/rebalancing.types';
import { resolveStrategyGuide } from '../../content/rebalancingStrategyGuides';
import type { StrategyPanelOption } from '../StrategyPanel/StrategyPanel';
import styles from './StrategyGuideDialog.module.scss';

interface StrategyGuideDialogProps {
  strategyOptions: StrategyPanelOption[];
  initialStrategyId: RebalancingStrategyId;
  onClose: () => void;
}

export function StrategyGuideDialog({
  strategyOptions,
  initialStrategyId,
  onClose,
}: StrategyGuideDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [activeStrategyId, setActiveStrategyId] = useState(initialStrategyId);
  const activeOption = strategyOptions.find((strategy) => strategy.id === activeStrategyId);
  const guide = resolveStrategyGuide(activeStrategyId, activeOption?.guideBaseName ?? null);

  useFocusTrap({
    containerRef: dialogRef,
    isActive: true,
    onEscape: onClose,
    lockBodyScroll: true,
  });

  useEffect(() => {
    if (articleRef.current) {
      articleRef.current.scrollTop = 0;
    }
  }, [activeStrategyId]);

  return (
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        className={styles.reader}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <p className={styles.kicker}>{REBALANCING_STRATEGY_GUIDE_KICKER}</p>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label={REBALANCING_STRATEGY_GUIDE_CLOSE_LABEL}
            >
              <X size={18} />
            </button>
          </div>
          <Select
            label={REBALANCING_STRATEGY_GUIDE_SWITCH_LABEL}
            value={activeStrategyId}
            onChange={setActiveStrategyId}
            options={strategyOptions.map((strategy) => ({
              value: strategy.id,
              label: strategy.label,
            }))}
            className={styles.switcher}
          />
        </header>

        <article ref={articleRef} className={styles.article}>
          <h2 id={titleId} className={styles.title}>
            {guide.title}
          </h2>
          <p className={styles.attribution}>{guide.attribution}</p>
          {guide.sections.map((section) => (
            <section key={section.heading} className={styles.section}>
              <h3 className={styles.sectionHeading}>{section.heading}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          {guide.sourceUrl && guide.sourceLabel && (
            <p className={styles.source}>
              {REBALANCING_STRATEGY_GUIDE_SOURCE_PREFIX}:{' '}
              <a href={guide.sourceUrl} target="_blank" rel="noreferrer">
                {guide.sourceLabel}
              </a>
            </p>
          )}
          <p className={styles.disclaimer}>{REBALANCING_STRATEGY_GUIDE_DISCLAIMER}</p>
        </article>
      </div>
    </div>
  );
}
