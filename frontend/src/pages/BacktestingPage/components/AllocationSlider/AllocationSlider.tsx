import { useState } from 'react';
import { X } from 'lucide-react';
import { TickerAvatar } from '../../../../components/ui';
import styles from './AllocationSlider.module.scss';

interface AllocationSliderProps {
  ticker: string;
  weightPercent: number;
  onWeightChange: (weightPercent: number) => void;
  onRemove: () => void;
}

export function AllocationSlider({
  ticker,
  weightPercent,
  onWeightChange,
  onRemove,
}: AllocationSliderProps) {
  const [draftValue, setDraftValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  function commitDraftValue() {
    const parsed = Number(draftValue);
    if (!Number.isFinite(parsed)) {
      setDraftValue(weightPercent.toFixed(1));
      setIsEditing(false);
      return;
    }

    onWeightChange(parsed);
    setIsEditing(false);
  }

  function handleInputChange(rawValue: string) {
    setDraftValue(rawValue);
    setIsEditing(true);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      commitDraftValue();
    }
  }

  const sliderFillPercent = `${weightPercent}%`;
  const inputValue = isEditing ? draftValue : weightPercent.toFixed(1);

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.tickerChip}>
          <TickerAvatar ticker={ticker} size="xs" />${ticker}
        </span>
        <div className={styles.valueBlock}>
          <div className={styles.valueInputWrap}>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={styles.valueInput}
              value={inputValue}
              onChange={(event) => handleInputChange(event.target.value)}
              onFocus={() => {
                setIsEditing(true);
                setDraftValue(weightPercent.toFixed(1));
              }}
              onBlur={commitDraftValue}
              onKeyDown={handleInputKeyDown}
              aria-label={`Allocation for ${ticker}`}
            />
            <span className={styles.valueSuffix}>%</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          aria-label={`Remove ${ticker}`}
        >
          <X size={14} />
        </button>
      </div>
      <div className={styles.sliderWrap}>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          className={styles.slider}
          style={{ '--fill-percent': sliderFillPercent } as React.CSSProperties}
          value={weightPercent}
          onChange={(event) => onWeightChange(Number(event.target.value))}
          aria-label={`Allocation slider for ${ticker}`}
        />
      </div>
    </div>
  );
}
