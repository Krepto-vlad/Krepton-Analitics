import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './Select.module.scss';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  iconUrl?: string;
}

interface SelectProps<T extends string> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[] | readonly T[];
  disabled?: boolean;
  id?: string;
  className?: string;
}

function SelectOptionIcon({ src }: { src?: string }) {
  const [hasFailed, setHasFailed] = useState(false);

  if (!src || hasFailed) {
    return null;
  }

  return <img src={src} alt="" className={styles.optionIcon} onError={() => setHasFailed(true)} />;
}

function normalizeOptions<T extends string>(
  options: readonly SelectOption<T>[] | readonly T[]
): SelectOption<T>[] {
  if (options.length === 0) return [];

  const firstOption = options[0];
  if (typeof firstOption === 'string') {
    return (options as readonly T[]).map((optionValue) => ({
      value: optionValue,
      label: optionValue,
    }));
  }

  return options as SelectOption<T>[];
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled = false,
  id,
  className,
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const normalizedOptions = normalizeOptions(options);
  const selectedOption =
    normalizedOptions.find((option) => option.value === value) ?? normalizedOptions[0];

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function closeDropdown() {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function openDropdown() {
    const selectedIndex = normalizedOptions.findIndex((option) => option.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }

  function handleToggle() {
    if (disabled) return;
    if (isOpen) {
      closeDropdown();
      return;
    }
    openDropdown();
  }

  function handleSelect(optionValue: T) {
    onChange(optionValue);
    closeDropdown();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }

      setHighlightedIndex((prev) => (prev < normalizedOptions.length - 1 ? prev + 1 : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }

      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : normalizedOptions.length - 1));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen && highlightedIndex >= 0) {
        handleSelect(normalizedOptions[highlightedIndex].value);
        return;
      }
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }
  }

  const rootClassName = [styles.fieldGroup, className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={rootClassName} ref={containerRef}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
      )}

      <div className={`${styles.selectWrap} ${isOpen ? styles.selectWrapOpen : ''}`}>
        <button
          id={selectId}
          type="button"
          className={styles.trigger}
          onClick={handleToggle}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={styles.triggerValue}>
            <SelectOptionIcon
              key={selectedOption?.iconUrl ?? 'none'}
              src={selectedOption?.iconUrl}
            />
            {selectedOption?.label ?? ''}
          </span>
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          />
        </button>

        {isOpen && (
          <ul className={styles.dropdown} role="listbox" aria-label={label ?? 'Select option'}>
            {normalizedOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${isHighlighted ? styles.optionHighlighted : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className={styles.optionLabel}>
                      <SelectOptionIcon key={option.iconUrl ?? option.value} src={option.iconUrl} />
                      {option.label}
                    </span>
                    {isSelected && <Check size={14} className={styles.checkIcon} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
