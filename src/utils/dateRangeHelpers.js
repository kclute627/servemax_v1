/**
 * Date Range Helper Utilities
 * Used for filtering and displaying date ranges in accounting and analytics
 */

import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// Date range option constants
export const DATE_RANGE_OPTIONS = {
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  ALL_TIME: 'all_time'
};

/**
 * Get display label for a date range option
 * @param {string} range - Date range constant from DATE_RANGE_OPTIONS
 * @returns {string} Display label
 */
export function getDateRangeLabel(range) {
  const labels = {
    [DATE_RANGE_OPTIONS.TODAY]: 'Today',
    [DATE_RANGE_OPTIONS.THIS_WEEK]: 'This Week',
    [DATE_RANGE_OPTIONS.THIS_MONTH]: 'This Month',
    [DATE_RANGE_OPTIONS.LAST_MONTH]: 'Last Month',
    [DATE_RANGE_OPTIONS.ALL_TIME]: 'All Time'
  };

  return labels[range] || 'Unknown';
}

/**
 * Get start and end dates for a date range
 * @param {string} range - Date range constant from DATE_RANGE_OPTIONS
 * @returns {{ start: Date, end: Date }} Start and end dates
 */
export function getDateRangeBounds(range) {
  const now = new Date();

  switch (range) {
    case DATE_RANGE_OPTIONS.TODAY:
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };

    case DATE_RANGE_OPTIONS.THIS_WEEK:
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }), // Sunday
        end: endOfWeek(now, { weekStartsOn: 0 })
      };

    case DATE_RANGE_OPTIONS.THIS_MONTH:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };

    case DATE_RANGE_OPTIONS.LAST_MONTH:
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };

    case DATE_RANGE_OPTIONS.ALL_TIME:
      return {
        start: new Date(0), // Unix epoch
        end: new Date(8640000000000000) // Max date
      };

    default:
      // Default to all time if unknown
      return {
        start: new Date(0),
        end: new Date(8640000000000000)
      };
  }
}

/**
 * Check if a date falls within a specified range
 * @param {string|Date} dateToCheck - Date to check (can be ISO string or Date object)
 * @param {string} range - Date range constant from DATE_RANGE_OPTIONS
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(dateToCheck, range) {
  if (!dateToCheck) return false;

  // If range is not provided or is 'all_time', include everything
  if (!range || range === DATE_RANGE_OPTIONS.ALL_TIME) {
    return true;
  }

  // Convert to Date object if it's a string
  const date = typeof dateToCheck === 'string' ? new Date(dateToCheck) : dateToCheck;

  // Invalid date
  if (isNaN(date.getTime())) {
    return false;
  }

  const { start, end } = getDateRangeBounds(range);

  return date >= start && date <= end;
}

/**
 * Format a date range for display
 * @param {string} range - Date range constant from DATE_RANGE_OPTIONS
 * @returns {string} Formatted date range string
 */
export function formatDateRange(range) {
  const { start, end } = getDateRangeBounds(range);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };

  if (range === DATE_RANGE_OPTIONS.TODAY) {
    return start.toLocaleDateString('en-US', options);
  }

  if (range === DATE_RANGE_OPTIONS.ALL_TIME) {
    return 'All Time';
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}
