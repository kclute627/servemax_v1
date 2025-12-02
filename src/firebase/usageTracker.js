import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Generate document IDs for all time buckets
 */
export function getDocIds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const week = String(getWeekNumber(now)).padStart(2, '0');

  return {
    daily: `daily_${year}-${month}-${day}`,
    weekly: `weekly_${year}-W${week}`,
    monthly: `monthly_${year}-${month}`,
    yearly: `yearly_${year}`,
    allTime: 'all_time'
  };
}

/**
 * Platform Usage Tracker
 * Tracks core business operations across time-bucketed documents
 * for efficient dashboard queries with time period filtering.
 */
export const UsageTracker = {
  /**
   * Track a generic operation by incrementing counters in all time buckets
   * @param {string} operation - The operation key (e.g., 'jobs_created')
   */
  async track(operation) {
    try {
      const docIds = getDocIds();
      const updates = Object.values(docIds).map(docId =>
        setDoc(doc(db, 'platform_usage', docId), {
          [operation]: increment(1),
          last_updated: serverTimestamp()
        }, { merge: true })
      );

      // Fire and forget - don't await to avoid blocking user operations
      Promise.all(updates).catch(err =>
        console.error('[UsageTracker] Error tracking operation:', err)
      );
    } catch (err) {
      console.error('[UsageTracker] Error in track():', err);
    }
  },

  /**
   * Track a new job being created
   */
  trackJobCreated() {
    UsageTracker.track('jobs_created');
  },

  /**
   * Track an affidavit PDF being generated
   */
  trackAffidavitGenerated() {
    UsageTracker.track('affidavits_generated');
  },

  /**
   * Track a successful service (serve completed)
   */
  trackServeCompleted() {
    UsageTracker.track('serves_completed');
  },

  /**
   * Track a new user being added to the platform
   */
  trackUserAdded() {
    UsageTracker.track('users_added');
  }
};

export default UsageTracker;
