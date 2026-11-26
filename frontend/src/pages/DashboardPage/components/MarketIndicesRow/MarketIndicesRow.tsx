import { useId, useState } from 'react';
import type { DragEvent } from 'react';
import { Check, ListChecks, Pencil } from 'lucide-react';
import {
  DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY,
  DASHBOARD_INDEX_CHOOSE_VISIBLE_LABEL,
  DASHBOARD_INDEX_DONE_EDITING_LABEL,
  DASHBOARD_INDEX_EDIT_MODE_LABEL,
  DASHBOARD_INDEX_SETTINGS_ICON_SIZE_PX,
} from '../../../../constants';
import {
  useMarketIndexData,
  LOADING_MARKET_INDEX_DATA,
} from '../../../../hooks/useMarketIndexData';
import { useMarketIndexVisibility } from '../../../../hooks/useMarketIndexVisibility';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { MarketIndexCard } from '../MarketIndexCard/MarketIndexCard';
import { MarketIndicesSettingsDialog } from './MarketIndicesSettingsDialog';
import styles from './MarketIndicesRow.module.scss';

export function MarketIndicesRow() {
  const { visibleIndices, isIndexVisible, setIndexVisible, moveVisibleIndex } =
    useMarketIndexVisibility();
  const dataByTicker = useMarketIndexData(visibleIndices.map((index) => index.ticker));
  const isMobileViewport = useMediaQuery(DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draggedTicker, setDraggedTicker] = useState<string | null>(null);
  const [dropTargetTicker, setDropTargetTicker] = useState<string | null>(null);
  const headingId = useId();
  const hasVisibleIndices = visibleIndices.length > 0;
  const showDesktopEditControls = !isMobileViewport;

  function openSettingsDialog(): void {
    setIsSettingsOpen(true);
  }

  function handlePencilClick(): void {
    if (isMobileViewport) {
      openSettingsDialog();
      return;
    }

    setIsEditing(true);
  }

  function handleDoneEditing(): void {
    setIsEditing(false);
    setDraggedTicker(null);
    setDropTargetTicker(null);
  }

  function handleDragStart(ticker: string, event: DragEvent<HTMLElement>): void {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', ticker);
    setDraggedTicker(ticker);
  }

  function handleDragOver(ticker: string, event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTargetTicker !== ticker) {
      setDropTargetTicker(ticker);
    }
  }

  function handleDrop(ticker: string, event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    const sourceTicker = event.dataTransfer.getData('text/plain') || draggedTicker;
    if (!sourceTicker || sourceTicker === ticker) {
      setDropTargetTicker(null);
      return;
    }

    const fromIndex = visibleIndices.findIndex((index) => index.ticker === sourceTicker);
    const toIndex = visibleIndices.findIndex((index) => index.ticker === ticker);
    moveVisibleIndex(fromIndex, toIndex);
    setDraggedTicker(null);
    setDropTargetTicker(null);
  }

  function handleDragEnd(): void {
    setDraggedTicker(null);
    setDropTargetTicker(null);
  }

  return (
    <section className={styles.row} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          MARKET INDICES
        </h2>
        {!hasVisibleIndices ? (
          <span className={styles.hint}>All index cards are hidden.</span>
        ) : null}

        <div className={styles.actions}>
          {showDesktopEditControls && isEditing ? (
            <>
              <button
                type="button"
                className={styles.settingsButton}
                aria-label={DASHBOARD_INDEX_CHOOSE_VISIBLE_LABEL}
                aria-haspopup="dialog"
                title={DASHBOARD_INDEX_CHOOSE_VISIBLE_LABEL}
                onClick={openSettingsDialog}
              >
                <ListChecks size={DASHBOARD_INDEX_SETTINGS_ICON_SIZE_PX} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.settingsButton}
                aria-label={DASHBOARD_INDEX_DONE_EDITING_LABEL}
                title={DASHBOARD_INDEX_DONE_EDITING_LABEL}
                onClick={handleDoneEditing}
              >
                <Check size={DASHBOARD_INDEX_SETTINGS_ICON_SIZE_PX} aria-hidden="true" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.settingsButton}
              aria-label={
                isMobileViewport
                  ? DASHBOARD_INDEX_CHOOSE_VISIBLE_LABEL
                  : DASHBOARD_INDEX_EDIT_MODE_LABEL
              }
              aria-haspopup={isMobileViewport ? 'dialog' : undefined}
              title={
                isMobileViewport
                  ? DASHBOARD_INDEX_CHOOSE_VISIBLE_LABEL
                  : DASHBOARD_INDEX_EDIT_MODE_LABEL
              }
              onClick={handlePencilClick}
            >
              <Pencil size={DASHBOARD_INDEX_SETTINGS_ICON_SIZE_PX} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {hasVisibleIndices ? (
        <div className={styles.grid}>
          {visibleIndices.map((index) => (
            <MarketIndexCard
              key={index.ticker}
              ticker={index.ticker}
              label={index.label}
              data={dataByTicker[index.ticker] ?? LOADING_MARKET_INDEX_DATA}
              isEditing={showDesktopEditControls && isEditing}
              onHide={() => setIndexVisible(index.ticker, false)}
              onDragStart={(event) => handleDragStart(index.ticker, event)}
              onDragOver={(event) => handleDragOver(index.ticker, event)}
              onDrop={(event) => handleDrop(index.ticker, event)}
              onDragEnd={handleDragEnd}
              isDropTarget={dropTargetTicker === index.ticker && draggedTicker !== index.ticker}
            />
          ))}
        </div>
      ) : null}

      {isSettingsOpen ? (
        <MarketIndicesSettingsDialog
          isIndexVisible={isIndexVisible}
          onIndexVisibleChange={setIndexVisible}
          onClose={() => setIsSettingsOpen(false)}
        />
      ) : null}
    </section>
  );
}
