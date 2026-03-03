/**
 * Date Range Helper Utilities
 * Used for filtering and displaying date ranges in accounting and analytics
 */

import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays, format } from 'date-fns';

// Date range option constants
export const DATE_RANGE_OPTIONS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  CUSTOM: 'custom',
  ALL_TIME: 'all_time'
};

/**
 * Get display label for a date range option
 * @param {string|object} range - Date range constant or custom range object
 * @returns {string} Display label
 */
export function getDateRangeLabel(range) {
  if (typeof range === 'object' && range?.type === 'custom') {
    return 'Custom';
  }

  const labels = {
    [DATE_RANGE_OPTIONS.TODAY]: 'Today',
    [DATE_RANGE_OPTIONS.YESTERDAY]: 'Yesterday',
    [DATE_RANGE_OPTIONS.THIS_WEEK]: 'This Week',
    [DATE_RANGE_OPTIONS.THIS_MONTH]: 'This Month',
    [DATE_RANGE_OPTIONS.LAST_MONTH]: 'Last Month',
    [DATE_RANGE_OPTIONS.CUSTOM]: 'Custom',
    [DATE_RANGE_OPTIONS.ALL_TIME]: 'All Time'
  };

  return labels[range] || 'Unknown';
}

/**
 * Get start and end dates for a date range
 * @param {string|object} range - Date range constant or custom range object { type: 'custom', start: string, end: string }
 * @returns {{ start: Date, end: Date }} Start and end dates
 */
export function getDateRangeBounds(range) {
  // Handle custom range objects
  if (typeof range === 'object' && range?.type === 'custom') {
    return {
      start: startOfDay(new Date(range.start + 'T00:00:00')),
      end: endOfDay(new Date(range.end + 'T00:00:00'))
    };
  }

  const now = new Date();

  switch (range) {
    case DATE_RANGE_OPTIONS.TODAY:
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };

    case DATE_RANGE_OPTIONS.YESTERDAY:
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };

    case DATE_RANGE_OPTIONS.THIS_WEEK:
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }),
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
        start: new Date(0),
        end: new Date(8640000000000000)
      };

    default:
      return {
        start: new Date(0),
        end: new Date(8640000000000000)
      };
  }
}

/**
 * Check if a date falls within a specified range
 * @param {string|Date} dateToCheck - Date to check
 * @param {string|object} range - Date range constant or custom range object
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(dateToCheck, range) {
  if (!dateToCheck) return false;

  const isAllTime = range === DATE_RANGE_OPTIONS.ALL_TIME || !range;
  if (isAllTime) return true;

  const date = typeof dateToCheck === 'string' ? new Date(dateToCheck) : dateToCheck;
  if (isNaN(date.getTime())) return false;

  const { start, end } = getDateRangeBounds(range);
  return date >= start && date <= end;
}

/**
 * Format a date range for display
 * @param {string|object} range - Date range constant or custom range object
 * @returns {string} Formatted date range string
 */
export function formatDateRange(range) {
  if (typeof range === 'object' && range?.type === 'custom') {
    const s = new Date(range.start + 'T00:00:00');
    const e = new Date(range.end + 'T00:00:00');
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
  }

  const { start, end } = getDateRangeBounds(range);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };

  if (range === DATE_RANGE_OPTIONS.TODAY) {
    return start.toLocaleDateString('en-US', options);
  }

  if (range === DATE_RANGE_OPTIONS.YESTERDAY) {
    return start.toLocaleDateString('en-US', options);
  }

  if (range === DATE_RANGE_OPTIONS.ALL_TIME) {
    return 'All Time';
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}
