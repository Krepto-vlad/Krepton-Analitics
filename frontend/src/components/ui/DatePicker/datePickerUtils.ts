const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(isoDate: string): Date | null {
  if (!ISO_DATE_PATTERN.test(isoDate)) return null;

  const [year, month, day] = isoDate.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoDate: string): string {
  const parsedDate = parseIsoDate(isoDate);
  if (!parsedDate) return '';

  return parsedDate
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/ /g, '-');
}

export function isSameDay(firstDate: Date, secondDate: Date): boolean {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export function isDateDisabled(isoDate: string, minDate?: string, maxDate?: string): boolean {
  if (minDate && isoDate < minDate) return true;
  if (maxDate && isoDate > maxDate) return true;
  return false;
}

export interface CalendarDayCell {
  date: Date;
  isoDate: string;
  isCurrentMonth: boolean;
}

export function getCalendarDays(viewYear: number, viewMonth: number): CalendarDayCell[] {
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const leadingEmptyDays = firstDayOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPreviousMonth = new Date(viewYear, viewMonth, 0).getDate();
  const calendarDays: CalendarDayCell[] = [];

  for (let index = leadingEmptyDays - 1; index >= 0; index -= 1) {
    const dayNumber = daysInPreviousMonth - index;
    const date = new Date(viewYear, viewMonth - 1, dayNumber);
    calendarDays.push({
      date,
      isoDate: toIsoDate(date),
      isCurrentMonth: false,
    });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(viewYear, viewMonth, dayNumber);
    calendarDays.push({
      date,
      isoDate: toIsoDate(date),
      isCurrentMonth: true,
    });
  }

  let nextMonthDay = 1;
  while (calendarDays.length % 7 !== 0 || calendarDays.length < 42) {
    const date = new Date(viewYear, viewMonth + 1, nextMonthDay);
    calendarDays.push({
      date,
      isoDate: toIsoDate(date),
      isCurrentMonth: false,
    });
    nextMonthDay += 1;
  }

  return calendarDays;
}

export function getMonthLabel(viewYear: number, viewMonth: number): string {
  return new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}
