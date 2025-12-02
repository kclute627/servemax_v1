import { entities } from './database';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { getDocIds } from './usageTracker';

/**
 * Admin Statistics Manager
 * Provides platform-wide statistics for super admin users
 */
export class AdminStatsManager {
  /**
   * Get all companies across the platform
   * Filters out client companies - only returns actual platform users:
   * - Companies with a billing_tier property (actual platform users)
   * - This excludes client companies created by users (which don't have billing_tier)
   */
  static async getAllCompanies() {
    try {
      const companies = await entities.Company.list();
      // Filter to only include companies with billing_tier (actual platform users)
      // Client companies created by users don't have billing_tier
      const platformUsers = companies.filter(company =>
        company.billing_tier !== undefined && company.billing_tier !== null
      );
      return platformUsers || [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }

  /**
   * Get all users across the platform (from Firebase Auth users collection)
   */
  static async getAllUsers() {
    try {
      // Note: In production, you'd query Firebase Auth users via Admin SDK
      // For now, we'll aggregate from companies' employee lists
      const companies = await this.getAllCompanies();

      const allUserIds = new Set();
      companies.forEach(company => {
        if (company.owner_id) allUserIds.add(company.owner_id);
        if (company.company_employees && Array.isArray(company.company_employees)) {
          company.company_employees.forEach(empId => allUserIds.add(empId));
        }
      });

      return Array.from(allUserIds);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get all subscriptions across the platform
   */
  static async getAllSubscriptions() {
    try {
      const subscriptions = await entities.Subscription.list();
      return subscriptions || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  /**
   * Calculate platform-wide statistics
   */
  static async getPlatformStats() {
    try {
      const [companies, subscriptions] = await Promise.all([
        this.getAllCompanies(),
        this.getAllSubscriptions()
      ]);

      const userIds = await this.getAllUsers();

      // Count active subscriptions (not trial, not cancelled)
      const activeSubscriptions = subscriptions.filter(
        sub => sub.status === 'active' || sub.status === 'past_due'
      );

      const trialSubscriptions = subscriptions.filter(
        sub => sub.status === 'trial'
      );

      const cancelledSubscriptions = subscriptions.filter(
        sub => sub.status === 'canceled'
      );

      // Calculate MRR (Monthly Recurring Revenue)
      const mrr = activeSubscriptions.reduce((total, sub) => {
        // Assuming subscription has a price_per_month field
        return total + (sub.price_per_month || 0);
      }, 0);

      // Calculate ARR (Annual Recurring Revenue)
      const arr = mrr * 12;

      // Get recent signups (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSignups = companies.filter(company => {
        const createdAt = company.created_at ? new Date(company.created_at) : null;
        return createdAt && createdAt >= thirtyDaysAgo;
      });

      // Get growth rate (compare to previous month)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const previousMonthSignups = companies.filter(company => {
        const createdAt = company.created_at ? new Date(company.created_at) : null;
        return createdAt && createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo;
      });

      const growthRate = previousMonthSignups.length > 0
        ? ((recentSignups.length - previousMonthSignups.length) / previousMonthSignups.length) * 100
        : 0;

      return {
        totalCompanies: companies.length,
        totalUsers: userIds.length,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        trialSubscriptions: trialSubscriptions.length,
        cancelledSubscriptions: cancelledSubscriptions.length,
        mrr,
        arr,
        recentSignups: recentSignups.length,
        growthRate: Math.round(growthRate * 100) / 100,
        last_updated: new Date()
      };
    } catch (error) {
      console.error('Error calculating platform stats:', error);
      return {
        totalCompanies: 0,
        totalUsers: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        cancelledSubscriptions: 0,
        mrr: 0,
        arr: 0,
        recentSignups: 0,
        growthRate: 0,
        last_updated: new Date()
      };
    }
  }

  /**
   * Get detailed subscriber information
   */
  static async getSubscriberDetails() {
    try {
      const [companies, subscriptions] = await Promise.all([
        this.getAllCompanies(),
        this.getAllSubscriptions()
      ]);

      // Map subscriptions to companies
      const subscriberDetails = subscriptions
        .filter(sub => sub.status === 'active' || sub.status === 'past_due')
        .map(sub => {
          const company = companies.find(c => c.id === sub.company_id);
          return {
            subscription: sub,
            company: company || null,
            status: sub.status,
            plan: sub.plan_name || 'Unknown',
            mrr: sub.price_per_month || 0,
            startDate: sub.created_at,
            nextBillingDate: sub.next_billing_date
          };
        })
        .sort((a, b) => b.mrr - a.mrr); // Sort by revenue

      return subscriberDetails;
    } catch (error) {
      console.error('Error fetching subscriber details:', error);
      return [];
    }
  }

  /**
   * Get revenue breakdown by plan
   */
  static async getRevenueByPlan() {
    try {
      const subscriptions = await this.getAllSubscriptions();
      const activeSubscriptions = subscriptions.filter(
        sub => sub.status === 'active' || sub.status === 'past_due'
      );

      const planRevenue = {};
      activeSubscriptions.forEach(sub => {
        const planName = sub.plan_name || 'Unknown';
        if (!planRevenue[planName]) {
          planRevenue[planName] = {
            count: 0,
            mrr: 0,
            arr: 0
          };
        }
        planRevenue[planName].count += 1;
        planRevenue[planName].mrr += sub.price_per_month || 0;
        planRevenue[planName].arr += (sub.price_per_month || 0) * 12;
      });

      return Object.entries(planRevenue).map(([plan, data]) => ({
        plan,
        ...data
      }));
    } catch (error) {
      console.error('Error calculating revenue by plan:', error);
      return [];
    }
  }

  /**
   * Get user growth over time (last 12 months)
   */
  static async getUserGrowth() {
    try {
      const companies = await this.getAllCompanies();
      const now = new Date();
      const monthlyGrowth = [];

      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const companiesInMonth = companies.filter(company => {
          const createdAt = company.created_at ? new Date(company.created_at) : null;
          return createdAt && createdAt <= monthEnd;
        });

        monthlyGrowth.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count: companiesInMonth.length
        });
      }

      return monthlyGrowth;
    } catch (error) {
      console.error('Error calculating user growth:', error);
      return [];
    }
  }

  /**
   * Get revenue growth over time (last 12 months)
   */
  static async getRevenueGrowth() {
    try {
      const subscriptions = await this.getAllSubscriptions();
      const now = new Date();
      const monthlyRevenue = [];

      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        // Get all active subscriptions that existed during this month
        const activeInMonth = subscriptions.filter(sub => {
          const createdAt = sub.created_at ? new Date(sub.created_at) : null;
          const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;

          // Subscription must have been created before or during this month
          const wasCreated = createdAt && createdAt <= monthEnd;
          // And either not cancelled, or cancelled after this month started
          const stillActive = !cancelledAt || cancelledAt >= monthDate;

          return wasCreated && stillActive && (sub.status === 'active' || sub.status === 'past_due');
        });

        const mrr = activeInMonth.reduce((total, sub) => {
          return total + (sub.price_per_month || 0);
        }, 0);

        monthlyRevenue.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          mrr: mrr,
          arr: mrr * 12,
          subscribers: activeInMonth.length
        });
      }

      return monthlyRevenue;
    } catch (error) {
      console.error('Error calculating revenue growth:', error);
      return [];
    }
  }

  /**
   * Get recent activity (signups, cancellations, upgrades)
   */
  static async getRecentActivity(limit = 10) {
    try {
      const [companies, subscriptions] = await Promise.all([
        this.getAllCompanies(),
        this.getAllSubscriptions()
      ]);

      const activities = [];

      // Recent signups
      companies
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .forEach(company => {
          activities.push({
            type: 'signup',
            company_name: company.name,
            company_id: company.id,
            timestamp: company.created_at,
            description: `New company signup: ${company.name}`
          });
        });

      // Recent subscription changes
      subscriptions
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, limit)
        .forEach(sub => {
          const company = companies.find(c => c.id === sub.company_id);
          activities.push({
            type: sub.status === 'canceled' ? 'cancellation' : 'subscription_change',
            company_name: company?.name || 'Unknown',
            company_id: sub.company_id,
            timestamp: sub.updated_at,
            description: `Subscription ${sub.status}: ${company?.name || 'Unknown'}`
          });
        });

      // Sort all activities by timestamp
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Get system health metrics
   * Note: This is a placeholder - in production, you'd integrate with actual monitoring tools
   */
  static async getSystemHealth() {
    try {
      // Placeholder for system health metrics
      // In production, integrate with monitoring services like Datadog, New Relic, etc.
      return {
        uptime: 99.9,
        avgResponseTime: 120, // ms
        errorRate: 0.1, // percentage
        activeConnections: 0,
        databaseStatus: 'healthy',
        apiStatus: 'healthy',
        last_incident: null,
        last_updated: new Date()
      };
    } catch (error) {
      console.error('Error fetching system health:', error);
      return {
        uptime: 0,
        avgResponseTime: 0,
        errorRate: 0,
        activeConnections: 0,
        databaseStatus: 'unknown',
        apiStatus: 'unknown',
        last_incident: null,
        last_updated: new Date()
      };
    }
  }

  /**
   * Get platform usage statistics for different time periods
   * Fetches counters for: jobs_created, affidavits_generated, serves_completed, users_added
   */
  static async getUsageStats() {
    try {
      const docIds = getDocIds();

      const defaultStats = () => ({
        jobs_created: 0,
        affidavits_generated: 0,
        serves_completed: 0,
        users_added: 0
      });

      const [daily, weekly, monthly, yearly, allTime] = await Promise.all([
        getDoc(doc(db, 'platform_usage', docIds.daily)),
        getDoc(doc(db, 'platform_usage', docIds.weekly)),
        getDoc(doc(db, 'platform_usage', docIds.monthly)),
        getDoc(doc(db, 'platform_usage', docIds.yearly)),
        getDoc(doc(db, 'platform_usage', 'all_time'))
      ]);

      return {
        today: daily.exists() ? daily.data() : defaultStats(),
        thisWeek: weekly.exists() ? weekly.data() : defaultStats(),
        thisMonth: monthly.exists() ? monthly.data() : defaultStats(),
        thisYear: yearly.exists() ? yearly.data() : defaultStats(),
        allTime: allTime.exists() ? allTime.data() : defaultStats()
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      const defaultStats = () => ({
        jobs_created: 0,
        affidavits_generated: 0,
        serves_completed: 0,
        users_added: 0
      });
      return {
        today: defaultStats(),
        thisWeek: defaultStats(),
        thisMonth: defaultStats(),
        thisYear: defaultStats(),
        allTime: defaultStats()
      };
    }
  }
}
