import { db } from './config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  writeBatch,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';

/**
 * StatsManager - Handles all statistics tracking for companies, clients, and servers
 * Uses time-based document partitioning for optimal Firestore performance
 */
export class StatsManager {

  // Helper function to get current year and month
  static getCurrentPeriod() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1 // JavaScript months are 0-based
    };
  }

  // Helper function to get previous month for comparisons
  static getPreviousPeriod(year, month) {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }

  // Generate document IDs for different stat types
  static getDocumentIds(companyId, year, month, clientId = null, serverId = null) {
    const baseId = `${companyId}_${year}_${month}`;

    return {
      company: baseId,
      client: clientId ? `${companyId}_${clientId}_${year}_${month}` : null,
      server: serverId ? `${companyId}_${serverId}_${year}_${month}` : null
    };
  }

  /**
   * Initialize stats documents for a new time period
   */
  static async initializeStatsDocuments(companyId, year, month, clientId = null, serverId = null) {
    const batch = writeBatch(db);
    const docIds = this.getDocumentIds(companyId, year, month, clientId, serverId);

    // Initialize company stats document
    const companyStatsRef = doc(db, 'company_stats', docIds.company);
    const companyStatsDoc = await getDoc(companyStatsRef);

    if (!companyStatsDoc.exists()) {
      batch.set(companyStatsRef, {
        company_id: companyId,
        year,
        month,
        jobs: {
          total: 0,
          completed: 0,
          in_progress: 0,
          cancelled: 0
        },
        financial: {
          total_billed: 0,
          total_collected: 0,
          outstanding: 0
        },
        performance: {
          billing_change_mom: 0,
          billing_change_yoy: 0,
          volume_change_mom: 0,
          volume_change_yoy: 0
        },
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }

    // Initialize client stats document if clientId provided
    if (clientId && docIds.client) {
      const clientStatsRef = doc(db, 'client_stats', docIds.client);
      const clientStatsDoc = await getDoc(clientStatsRef);

      if (!clientStatsDoc.exists()) {
        batch.set(clientStatsRef, {
          company_id: companyId,
          client_id: clientId,
          year,
          month,
          metrics: {
            jobs_sent: 0,
            jobs_completed: 0,
            total_billed: 0,
            total_collected: 0,
            outstanding: 0,
            average_job_value: 0
          },
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
    }

    // Initialize server stats document if serverId provided
    if (serverId && docIds.server) {
      const serverStatsRef = doc(db, 'server_stats', docIds.server);
      const serverStatsDoc = await getDoc(serverStatsRef);

      if (!serverStatsDoc.exists()) {
        batch.set(serverStatsRef, {
          company_id: companyId,
          server_id: serverId,
          year,
          month,
          performance: {
            jobs_assigned: 0,
            jobs_completed: 0,
            jobs_successful: 0,
            success_rate: 0,
            avg_completion_days: 0
          },
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
    }

    await batch.commit();
  }

  /**
   * Record when a new job is created
   */
  static async recordJobCreated(companyId, clientId, serverId = null) {
    try {
      const { year, month } = this.getCurrentPeriod();

      // Ensure stats documents exist
      await this.initializeStatsDocuments(companyId, year, month, clientId, serverId);

      const batch = writeBatch(db);
      const docIds = this.getDocumentIds(companyId, year, month, clientId, serverId);

      // Update company stats
      const companyRef = doc(db, 'company_stats', docIds.company);
      batch.update(companyRef, {
        'jobs.total': increment(1),
        'jobs.in_progress': increment(1),
        updated_at: serverTimestamp()
      });

      // Update client stats
      if (docIds.client) {
        const clientRef = doc(db, 'client_stats', docIds.client);
        batch.update(clientRef, {
          'metrics.jobs_sent': increment(1),
          updated_at: serverTimestamp()
        });
      }

      // Update server stats if server assigned
      if (serverId && docIds.server) {
        const serverRef = doc(db, 'server_stats', docIds.server);
        batch.update(serverRef, {
          'performance.jobs_assigned': increment(1),
          updated_at: serverTimestamp()
        });
      }

      await batch.commit();
      console.log('Job creation stats recorded successfully');
    } catch (error) {
      console.error('Error recording job creation stats:', error);
      throw error;
    }
  }

  /**
   * Record when a job is completed
   */
  static async recordJobCompleted(companyId, clientId, serverId, wasSuccessful = true, completionDays = null) {
    try {
      const { year, month } = this.getCurrentPeriod();

      // Ensure stats documents exist
      await this.initializeStatsDocuments(companyId, year, month, clientId, serverId);

      const batch = writeBatch(db);
      const docIds = this.getDocumentIds(companyId, year, month, clientId, serverId);

      // Update company stats
      const companyRef = doc(db, 'company_stats', docIds.company);
      batch.update(companyRef, {
        'jobs.completed': increment(1),
        'jobs.in_progress': increment(-1),
        updated_at: serverTimestamp()
      });

      // Update client stats
      if (docIds.client) {
        const clientRef = doc(db, 'client_stats', docIds.client);
        batch.update(clientRef, {
          'metrics.jobs_completed': increment(1),
          updated_at: serverTimestamp()
        });
      }

      // Update server stats
      if (serverId && docIds.server) {
        const serverRef = doc(db, 'server_stats', docIds.server);
        const updates = {
          'performance.jobs_completed': increment(1),
          updated_at: serverTimestamp()
        };

        if (wasSuccessful) {
          updates['performance.jobs_successful'] = increment(1);
        }

        batch.update(serverRef, updates);

        // Update success rate and average completion days (requires read-then-write)
        // This will be handled in a separate transaction after the batch
      }

      await batch.commit();

      // Update calculated fields for server performance
      if (serverId && docIds.server) {
        await this.updateServerCalculatedFields(companyId, serverId, year, month, completionDays);
      }

      console.log('Job completion stats recorded successfully');
    } catch (error) {
      console.error('Error recording job completion stats:', error);
      throw error;
    }
  }

  /**
   * Record when a job is cancelled
   */
  static async recordJobCancelled(companyId, clientId, serverId = null) {
    try {
      const { year, month } = this.getCurrentPeriod();

      const batch = writeBatch(db);
      const docIds = this.getDocumentIds(companyId, year, month, clientId, serverId);

      // Update company stats
      const companyRef = doc(db, 'company_stats', docIds.company);
      batch.update(companyRef, {
        'jobs.cancelled': increment(1),
        'jobs.in_progress': increment(-1),
        updated_at: serverTimestamp()
      });

      await batch.commit();
      console.log('Job cancellation stats recorded successfully');
    } catch (error) {
      console.error('Error recording job cancellation stats:', error);
      throw error;
    }
  }

  /**
   * Record when an invoice is created/sent
   */
  static async recordInvoiceCreated(companyId, clientId, amount) {
    try {
      const { year, month } = this.getCurrentPeriod();

      // Ensure stats documents exist
      await this.initializeStatsDocuments(companyId, year, month, clientId);

      const batch = writeBatch(db);
      const docIds = this.getDocumentIds(companyId, year, month, clientId);

      // Update company stats
      const companyRef = doc(db, 'company_stats', docIds.company);
      batch.update(companyRef, {
        'financial.total_billed': increment(amount),
        'financial.outstanding': increment(amount),
        updated_at: serverTimestamp()
      });

      // Update client stats
      if (docIds.client) {
        const clientRef = doc(db, 'client_stats', docIds.client);
        batch.update(clientRef, {
          'metrics.total_billed': increment(amount),
          'metrics.outstanding': increment(amount),
          updated_at: serverTimestamp()
        });
      }

      await batch.commit();

      // Update calculated fields
      if (clientId) {
        await this.updateClientCalculatedFields(companyId, clientId, year, month);
      }

      console.log('Invoice creation stats recorded successfully');
    } catch (error) {
      console.error('Error recording invoice creation stats:', error);
      throw error;
    }
  }

  /**
   * Record when a payment is received
   */
  static async recordPaymentReceived(companyId, clientId, amount) {
    try {
      const { year, month } = this.getCurrentPeriod();

      const batch = writeBatch(db);
      const docIds = this.getDocumentIds(companyId, year, month, clientId);

      // Update company stats
      const companyRef = doc(db, 'company_stats', docIds.company);
      batch.update(companyRef, {
        'financial.total_collected': increment(amount),
        'financial.outstanding': increment(-amount),
        updated_at: serverTimestamp()
      });

      // Update client stats
      if (docIds.client) {
        const clientRef = doc(db, 'client_stats', docIds.client);
        batch.update(clientRef, {
          'metrics.total_collected': increment(amount),
          'metrics.outstanding': increment(-amount),
          updated_at: serverTimestamp()
        });
      }

      await batch.commit();
      console.log('Payment stats recorded successfully');
    } catch (error) {
      console.error('Error recording payment stats:', error);
      throw error;
    }
  }

  /**
   * Update calculated fields for server performance
   */
  static async updateServerCalculatedFields(companyId, serverId, year, month, completionDays = null) {
    try {
      const docId = `${companyId}_${serverId}_${year}_${month}`;
      const serverRef = doc(db, 'server_stats', docId);
      const serverDoc = await getDoc(serverRef);

      if (serverDoc.exists()) {
        const data = serverDoc.data();
        const perf = data.performance;

        // Calculate success rate
        const successRate = perf.jobs_completed > 0 ?
          perf.jobs_successful / perf.jobs_completed : 0;

        const updates = {
          'performance.success_rate': successRate,
          updated_at: serverTimestamp()
        };

        // Update average completion days if provided
        if (completionDays !== null) {
          // This is a simplified average - in production you might want to track total days
          const currentAvg = perf.avg_completion_days || 0;
          const jobCount = perf.jobs_completed;
          const newAvg = jobCount > 1 ?
            ((currentAvg * (jobCount - 1)) + completionDays) / jobCount :
            completionDays;

          updates['performance.avg_completion_days'] = newAvg;
        }

        await updateDoc(serverRef, updates);
      }
    } catch (error) {
      console.error('Error updating server calculated fields:', error);
    }
  }

  /**
   * Update calculated fields for client metrics
   */
  static async updateClientCalculatedFields(companyId, clientId, year, month) {
    try {
      const docId = `${companyId}_${clientId}_${year}_${month}`;
      const clientRef = doc(db, 'client_stats', docId);
      const clientDoc = await getDoc(clientRef);

      if (clientDoc.exists()) {
        const data = clientDoc.data();
        const metrics = data.metrics;

        // Calculate average job value
        const avgJobValue = metrics.jobs_completed > 0 ?
          metrics.total_billed / metrics.jobs_completed : 0;

        await updateDoc(clientRef, {
          'metrics.average_job_value': avgJobValue,
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating client calculated fields:', error);
    }
  }

  /**
   * Get current month stats for a company
   */
  static async getCurrentMonthStats(companyId) {
    try {
      const { year, month } = this.getCurrentPeriod();
      return await this.getStatsForPeriod(companyId, year, month);
    } catch (error) {
      console.error('Error getting current month stats:', error);
      throw error;
    }
  }

  /**
   * Get stats for a specific time period
   */
  static async getStatsForPeriod(companyId, year, month = null) {
    try {
      if (month) {
        // Get specific month stats
        const docId = `${companyId}_${year}_${month}`;
        const docRef = doc(db, 'company_stats', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return docSnap.data();
        }

        // Return default structure if no data yet
        return {
          company_id: companyId,
          year,
          month,
          jobs: { total: 0, completed: 0, in_progress: 0, cancelled: 0 },
          financial: { total_billed: 0, total_collected: 0, outstanding: 0 },
          performance: { billing_change_mom: 0, volume_change_mom: 0 }
        };
      } else {
        // Get aggregated year stats by querying all months
        return await this.getAggregatedYearStats(companyId, year);
      }
    } catch (error) {
      console.error('Error getting stats for period:', error);
      throw error;
    }
  }

  /**
   * Get aggregated stats for an entire year
   */
  static async getAggregatedYearStats(companyId, year) {
    try {
      const statsRef = collection(db, 'company_stats');
      const q = query(
        statsRef,
        where('company_id', '==', companyId),
        where('year', '==', year)
      );

      const querySnapshot = await getDocs(q);

      // Aggregate all months for the year
      const aggregated = {
        company_id: companyId,
        year,
        jobs: { total: 0, completed: 0, in_progress: 0, cancelled: 0 },
        financial: { total_billed: 0, total_collected: 0, outstanding: 0 },
        performance: { billing_change_mom: 0, volume_change_mom: 0 }
      };

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        aggregated.jobs.total += data.jobs?.total || 0;
        aggregated.jobs.completed += data.jobs?.completed || 0;
        aggregated.jobs.in_progress += data.jobs?.in_progress || 0;
        aggregated.jobs.cancelled += data.jobs?.cancelled || 0;

        aggregated.financial.total_billed += data.financial?.total_billed || 0;
        aggregated.financial.total_collected += data.financial?.total_collected || 0;
        aggregated.financial.outstanding += data.financial?.outstanding || 0;
      });

      return aggregated;
    } catch (error) {
      console.error('Error getting aggregated year stats:', error);
      throw error;
    }
  }

  /**
   * Get stats for flexible time periods (today, yesterday, etc.)
   */
  static async getStatsForTimePeriod(companyId, period) {
    try {
      const now = new Date();
      let year, month;

      switch (period) {
        case 'today':
        case 'yesterday':
          // For daily periods, use current month stats (daily granularity not implemented)
          year = now.getFullYear();
          month = now.getMonth() + 1;
          break;
        case 'this_month':
          year = now.getFullYear();
          month = now.getMonth() + 1;
          break;
        case 'last_month': {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          year = lastMonth.getFullYear();
          month = lastMonth.getMonth() + 1;
          break;
        }
        case 'this_year':
          year = now.getFullYear();
          month = null; // Aggregate all months
          break;
        case 'last_year':
          year = now.getFullYear() - 1;
          month = null; // Aggregate all months
          break;
        case 'all_time':
          return await this.getAllTimeStats(companyId);
        default:
          // Default to current month
          year = now.getFullYear();
          month = now.getMonth() + 1;
      }

      return await this.getStatsForPeriod(companyId, year, month);
    } catch (error) {
      console.error('Error getting stats for time period:', error);
      throw error;
    }
  }

  /**
   * Get all-time aggregated stats
   */
  static async getAllTimeStats(companyId) {
    try {
      const statsRef = collection(db, 'company_stats');
      const q = query(statsRef, where('company_id', '==', companyId));

      const querySnapshot = await getDocs(q);

      // Aggregate all time periods
      const aggregated = {
        company_id: companyId,
        jobs: { total: 0, completed: 0, in_progress: 0, cancelled: 0 },
        financial: { total_billed: 0, total_collected: 0, outstanding: 0 },
        performance: { billing_change_mom: 0, volume_change_mom: 0 }
      };

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        aggregated.jobs.total += data.jobs?.total || 0;
        aggregated.jobs.completed += data.jobs?.completed || 0;
        aggregated.jobs.in_progress += data.jobs?.in_progress || 0;
        aggregated.jobs.cancelled += data.jobs?.cancelled || 0;

        aggregated.financial.total_billed += data.financial?.total_billed || 0;
        aggregated.financial.total_collected += data.financial?.total_collected || 0;
        aggregated.financial.outstanding += data.financial?.outstanding || 0;
      });

      return aggregated;
    } catch (error) {
      console.error('Error getting all-time stats:', error);
      throw error;
    }
  }

  /**
   * Get top clients for a company by billing amount
   */
  static async getTopClients(companyId, year, month = null, limitCount = 10) {
    try {
      const clientStatsRef = collection(db, 'client_stats');
      let q = query(
        clientStatsRef,
        where('company_id', '==', companyId),
        where('year', '==', year),
        orderBy('metrics.total_billed', 'desc'),
        limit(limitCount)
      );

      if (month) {
        q = query(
          clientStatsRef,
          where('company_id', '==', companyId),
          where('year', '==', year),
          where('month', '==', month),
          orderBy('metrics.total_billed', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting top clients:', error);

      // If it's an index error, return empty array instead of throwing
      if (error.message && error.message.includes('index')) {
        console.warn('Missing Firestore index for top clients query. Returning empty array.');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get top servers for a company by success rate
   */
  static async getTopServers(companyId, year, month = null, limitCount = 10) {
    try {
      const serverStatsRef = collection(db, 'server_stats');
      let q = query(
        serverStatsRef,
        where('company_id', '==', companyId),
        where('year', '==', year),
        orderBy('performance.success_rate', 'desc'),
        limit(limitCount)
      );

      if (month) {
        q = query(
          serverStatsRef,
          where('company_id', '==', companyId),
          where('year', '==', year),
          where('month', '==', month),
          orderBy('performance.success_rate', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting top servers:', error);

      // If it's an index error, return empty array instead of throwing
      if (error.message && error.message.includes('index')) {
        console.warn('Missing Firestore index for top servers query. Returning empty array.');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get real-time job counts directly from jobs data
   * These are not time-period dependent and reflect current job statuses
   */
  static getRealTimeJobCounts(jobs) {
    try {
      const counts = {
        total_open_jobs: 0,
        open_rush_jobs: 0,
        jobs_need_attention: 0,
        jobs_created_today: 0,
        jobs_closed_today: 0
      };

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      jobs.forEach(job => {
        // Count open jobs (not closed)
        if (!job.is_closed) {
          counts.total_open_jobs++;

          // Count rush jobs that are open
          if (job.priority === 'rush') {
            counts.open_rush_jobs++;
          }

          // Count jobs that need attention (open + specific criteria)
          if (this.jobNeedsAttention(job)) {
            counts.jobs_need_attention++;
          }
        }

        // Count jobs created today
        if (job.created_date) {
          const createdDate = new Date(job.created_date);
          if (createdDate >= startOfToday && createdDate < endOfToday) {
            counts.jobs_created_today++;
          }
        }

        // Count jobs closed today
        if (job.is_closed && job.service_date) {
          const closedDate = new Date(job.service_date);
          if (closedDate >= startOfToday && closedDate < endOfToday) {
            counts.jobs_closed_today++;
          }
        }
      });

      return counts;
    } catch (error) {
      console.error('Error calculating real-time job counts:', error);
      return {
        total_open_jobs: 0,
        open_rush_jobs: 0,
        jobs_need_attention: 0,
        jobs_created_today: 0,
        jobs_closed_today: 0
      };
    }
  }

  /**
   * Determine if a job needs attention based on specific criteria
   */
  static jobNeedsAttention(job) {
    // Job needs attention if:
    // 1. No assigned server
    // 2. Overdue (past due date)
    // 3. High priority and no progress
    // 4. Pending for too long

    const now = new Date();

    // 1. No assigned server
    if (!job.assigned_server_id) {
      return true;
    }

    // 2. Overdue jobs
    if (job.due_date) {
      const dueDate = new Date(job.due_date);
      if (dueDate < now) {
        return true;
      }
    }

    // 3. Emergency priority jobs not in progress
    if (job.priority === 'emergency' && job.status === 'pending') {
      return true;
    }

    // 4. Jobs pending for more than 3 days
    if (job.status === 'pending' && job.created_date) {
      const createdDate = new Date(job.created_date);
      const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get jobs created/closed counts for a specific time period
   */
  static getJobActivityForTimePeriod(jobs, period) {
    try {
      const now = new Date();
      let startDate, endDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all_time':
          // For all time, we don't filter by date
          return {
            jobs_created: jobs.length,
            jobs_closed: jobs.filter(job => job.is_closed).length
          };
        default:
          // Default to today
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }

      const counts = {
        jobs_created: 0,
        jobs_closed: 0
      };

      jobs.forEach(job => {
        // Count jobs created in period
        if (job.created_at) {
          const createdDate = new Date(job.created_at);
          if (createdDate >= startDate && createdDate < endDate) {
            counts.jobs_created++;
          }
        }

        // Count jobs closed in period
        if (job.is_closed && job.service_date) {
          const closedDate = new Date(job.service_date);
          if (closedDate >= startDate && closedDate < endDate) {
            counts.jobs_closed++;
          }
        }
      });

      return counts;
    } catch (error) {
      console.error('Error calculating job activity for time period:', error);
      return {
        jobs_created: 0,
        jobs_closed: 0
      };
    }
  }

  /**
   * Calculate month-over-month and year-over-year performance changes
   */
  static async calculatePerformanceChanges(companyId) {
    try {
      const { year, month } = this.getCurrentPeriod();
      const { year: prevYear, month: prevMonth } = this.getPreviousPeriod(year, month);

      // Get current month stats
      const currentRef = doc(db, 'company_stats', `${companyId}_${year}_${month}`);
      const currentDoc = await getDoc(currentRef);

      if (!currentDoc.exists()) return;

      const currentData = currentDoc.data();

      // Get previous month stats for MoM comparison
      const prevMonthRef = doc(db, 'company_stats', `${companyId}_${prevYear}_${prevMonth}`);
      const prevMonthDoc = await getDoc(prevMonthRef);

      // Get same month last year for YoY comparison
      const lastYearRef = doc(db, 'company_stats', `${companyId}_${year - 1}_${month}`);
      const lastYearDoc = await getDoc(lastYearRef);

      const updates = {};

      // Calculate MoM changes
      if (prevMonthDoc.exists()) {
        const prevData = prevMonthDoc.data();

        if (prevData.financial.total_billed > 0) {
          const billingChangeMoM = ((currentData.financial.total_billed - prevData.financial.total_billed) / prevData.financial.total_billed) * 100;
          updates['performance.billing_change_mom'] = Math.round(billingChangeMoM * 100) / 100;
        }

        if (prevData.jobs.total > 0) {
          const volumeChangeMoM = ((currentData.jobs.total - prevData.jobs.total) / prevData.jobs.total) * 100;
          updates['performance.volume_change_mom'] = Math.round(volumeChangeMoM * 100) / 100;
        }
      }

      // Calculate YoY changes
      if (lastYearDoc.exists()) {
        const lastYearData = lastYearDoc.data();

        if (lastYearData.financial.total_billed > 0) {
          const billingChangeYoY = ((currentData.financial.total_billed - lastYearData.financial.total_billed) / lastYearData.financial.total_billed) * 100;
          updates['performance.billing_change_yoy'] = Math.round(billingChangeYoY * 100) / 100;
        }

        if (lastYearData.jobs.total > 0) {
          const volumeChangeYoY = ((currentData.jobs.total - lastYearData.jobs.total) / lastYearData.jobs.total) * 100;
          updates['performance.volume_change_yoy'] = Math.round(volumeChangeYoY * 100) / 100;
        }
      }

      // Update the document with calculated changes
      if (Object.keys(updates).length > 0) {
        updates.updated_at = serverTimestamp();
        await updateDoc(currentRef, updates);
      }

    } catch (error) {
      console.error('Error calculating performance changes:', error);
      throw error;
    }
  }
}