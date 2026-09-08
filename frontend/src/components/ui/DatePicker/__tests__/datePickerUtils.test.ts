import {
  formatDisplayDate,
  getCalendarDays,
  getMonthLabel,
  isDateDisabled,
  isSameDay,
  parseIsoDate,
  toIsoDate,
} from '../datePickerUtils';

describe('datePickerUtils', () => {
  it('parses valid ISO dates and rejects impossible days', () => {
    expect(parseIsoDate('2026-09-08')?.getDate()).toBe(8);
    expect(parseIsoDate('2026-02-31')).toBeNull();
    expect(parseIsoDate('08-09-2026')).toBeNull();
  });

  it('round-trips ISO formatting and display labels', () => {
    const date = new Date(2026, 8, 8);
    expect(toIsoDate(date)).toBe('2026-09-08');
    expect(formatDisplayDate('2026-09-08')).toMatch(/2026/);
    expect(formatDisplayDate('nope')).toBe('');
    expect(getMonthLabel(2026, 8)).toBe('September 2026');
  });

  it('compares calendar days and min/max bounds', () => {
    expect(isSameDay(new Date(2026, 8, 8), new Date(2026, 8, 8, 23))).toBe(true);
    expect(isDateDisabled('2026-01-01', '2026-02-01')).toBe(true);
    expect(isDateDisabled('2026-12-31', undefined, '2026-06-01')).toBe(true);
    expect(isDateDisabled('2026-06-01', '2026-01-01', '2026-12-31')).toBe(false);
  });

  it('builds a 42-cell month grid including adjacent months', () => {
    const days = getCalendarDays(2026, 8);
    expect(days).toHaveLength(42);
    expect(days.some((day) => day.isCurrentMonth)).toBe(true);
    expect(days.some((day) => !day.isCurrentMonth)).toBe(true);
  });
});
