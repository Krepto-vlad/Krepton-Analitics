import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatDisplayDate,
  getCalendarDays,
  getMonthLabel,
  isDateDisabled,
  isSameDay,
  parseIsoDate,
  toIsoDate,
} from './datePickerUtils';
import styles from './DatePicker.module.scss';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
}

function getInitialViewDate(value: string, max?: string): Date {
  const parsedValue = parseIsoDate(value);
  if (parsedValue) return parsedValue;

  const parsedMax = max ? parseIsoDate(max) : null;
  if (parsedMax) return parsedMax;

  return new Date();
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  id,
  className,
  placeholder = 'Select date',
}: DatePickerProps) {
  const generatedId = useId();
  const pickerId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);

  const initialViewDate = getInitialViewDate(value, max);
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());

  const selectedDate = parseIsoDate(value);
  const todayIsoDate = toIsoDate(new Date());
  const calendarDays = getCalendarDays(viewYear, viewMonth);
  const displayValue = value ? formatDisplayDate(value) : '';

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function openCalendar(): void {
    if (disabled) return;

    const nextViewDate = selectedDate ?? getInitialViewDate(value, max);
    setViewYear(nextViewDate.getFullYear());
    setViewMonth(nextViewDate.getMonth());
    setIsOpen(true);
  }

  function closeCalendar(): void {
    setIsOpen(false);
  }

  function handlePreviousMonth(): void {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((currentYear) => currentYear - 1);
      return;
    }

    setViewMonth((currentMonth) => currentMonth - 1);
  }

  function handleNextMonth(): void {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((currentYear) => currentYear + 1);
      return;
    }

    setViewMonth((currentMonth) => currentMonth + 1);
  }

  function handleSelectDate(isoDate: string): void {
    if (isDateDisabled(isoDate, min, max)) return;

    onChange(isoDate);
    closeCalendar();
  }

  function handleSelectToday(): void {
    if (isDateDisabled(todayIsoDate, min, max)) return;

    onChange(todayIsoDate);
    closeCalendar();
  }

  function handleClearDate(): void {
    onChange('');
    closeCalendar();
  }

  const containerClassName = [styles.fieldGroup, className ?? ''].filter(Boolean).join(' ');

  const triggerClassName = [
    styles.trigger,
    isOpen ? styles.triggerOpen : '',
    disabled ? styles.triggerDisabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName} ref={containerRef}>
      {label && (
        <label className={styles.label} htmlFor={pickerId}>
          {label}
        </label>
      )}

      <div className={styles.pickerWrap}>
        <button
          id={pickerId}
          type="button"
          className={triggerClassName}
          onClick={openCalendar}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <span className={displayValue ? styles.triggerValue : styles.triggerPlaceholder}>
            {displayValue || placeholder}
          </span>
          <CalendarDays size={15} className={styles.calendarIcon} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className={styles.popover} role="dialog" aria-label="Choose date">
            <div className={styles.popoverHeader}>
              <button
                type="button"
                className={styles.navButton}
                onClick={handlePreviousMonth}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>

              <span className={styles.monthLabel}>{getMonthLabel(viewYear, viewMonth)}</span>

              <button
                type="button"
                className={styles.navButton}
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((weekdayLabel) => (
                <span key={weekdayLabel} className={styles.weekdayLabel}>
                  {weekdayLabel}
                </span>
              ))}
            </div>

            <div className={styles.dayGrid}>
              {calendarDays.map((calendarDay, dayIndex) => {
                const isSelected = selectedDate ? isSameDay(calendarDay.date, selectedDate) : false;
                const isToday = isSameDay(calendarDay.date, new Date());
                const isDisabled = isDateDisabled(calendarDay.isoDate, min, max);

                const dayButtonClassName = [
                  styles.dayButton,
                  !calendarDay.isCurrentMonth ? styles.dayButtonOutsideMonth : '',
                  isSelected ? styles.dayButtonSelected : '',
                  isToday ? styles.dayButtonToday : '',
                  isDisabled ? styles.dayButtonDisabled : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={`${calendarDay.isoDate}-${dayIndex}`}
                    type="button"
                    className={dayButtonClassName}
                    onClick={() => handleSelectDate(calendarDay.isoDate)}
                    disabled={isDisabled}
                    aria-label={calendarDay.isoDate}
                    aria-pressed={isSelected}
                  >
                    {calendarDay.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className={styles.popoverFooter}>
              <button type="button" className={styles.footerButton} onClick={handleClearDate}>
                Clear
              </button>
              <button
                type="button"
                className={styles.footerButton}
                onClick={handleSelectToday}
                disabled={isDateDisabled(todayIsoDate, min, max)}
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
