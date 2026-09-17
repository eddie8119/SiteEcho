import type { CalendarDate } from '@/utils/calendarUtils';

/**
 * Builds an accessible label for a calendar date button.
 */
export const getDateAria = (dateObj: CalendarDate, monthLabel: string, year: number): string =>
  `${monthLabel} ${dateObj.day}, ${year}`;
