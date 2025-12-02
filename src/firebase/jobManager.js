import { entities } from './database';
import { StatsManager } from './stats';
import { CompanyManager } from './schemas';
import { UsageTracker } from './usageTracker';

/**
 * JobManager - Enhanced job management with automatic stats tracking
 * Wraps the base Job entity to include business intelligence tracking
 */
export class JobManager {

  /**
   * Create a new job with automatic stats tracking
   */
  static async createJob(jobData) {
    try {
      // Validate required fields
      if (!jobData.company_id) {
        throw new Error('company_id is required for job creation');
      }
      if (!jobData.client_id) {
        throw new Error('client_id is required for job creation');
      }

      // Create the job using the base entity
      const job = await entities.Job.create({
        ...jobData,
        status: jobData.status || 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Track platform-wide usage stats
      UsageTracker.trackJobCreated();

      // Update stats asynchronously (don't block job creation)
      this.updateStatsAsync('job_created', {
        companyId: jobData.company_id,
        clientId: jobData.client_id,
        serverId: jobData.assigned_to || null,
        jobId: job.id
      });

      console.log(`Job ${job.id} created and stats updated`);
      return job;

    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  /**
   * Update job status with automatic stats tracking
   */
  static async updateJobStatus(jobId, newStatus, updateData = {}) {
    try {
      // Get the current job to track changes
      const currentJob = await entities.Job.findById(jobId);
      if (!currentJob) {
        throw new Error(`Job ${jobId} not found`);
      }

      const oldStatus = currentJob.status;

      // Update the job
      const updatedJob = await entities.Job.update(jobId, {
        ...updateData,
        status: newStatus,
        updated_at: new Date()
      });

      // Track status changes in stats
      if (oldStatus !== newStatus) {
        this.handleStatusChange(currentJob, oldStatus, newStatus, updateData);
      }

      return updatedJob;

    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  }

  /**
   * Complete a job with automatic stats and performance tracking
   */
  static async completeJob(jobId, completionData = {}) {
    try {
      const job = await entities.Job.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Calculate completion time if not provided
      const completedAt = completionData.completed_at || new Date();
      const createdAt = new Date(job.created_at);
      const completionDays = Math.ceil((completedAt - createdAt) / (1000 * 60 * 60 * 24));

      // Update job status to completed
      const completedJob = await this.updateJobStatus(jobId, 'completed', {
        ...completionData,
        completed_at: completedAt,
        completion_days: completionDays
      });

      // Update stats with completion info
      this.updateStatsAsync('job_completed', {
        companyId: job.company_id,
        clientId: job.client_id,
        serverId: job.assigned_to,
        jobId: job.id,
        wasSuccessful: completionData.was_successful !== false, // Default to true
        completionDays: completionDays
      });

      console.log(`Job ${jobId} completed in ${completionDays} days`);
      return completedJob;

    } catch (error) {
      console.error('Error completing job:', error);
      throw error;
    }
  }

  /**
   * Cancel a job with automatic stats tracking
   */
  static async cancelJob(jobId, cancellationReason = '') {
    try {
      const job = await entities.Job.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const cancelledJob = await this.updateJobStatus(jobId, 'cancelled', {
        cancellation_reason: cancellationReason,
        cancelled_at: new Date()
      });

      // Update stats for cancellation
      this.updateStatsAsync('job_cancelled', {
        companyId: job.company_id,
        clientId: job.client_id,
        serverId: job.assigned_to,
        jobId: job.id
      });

      console.log(`Job ${jobId} cancelled: ${cancellationReason}`);
      return cancelledJob;

    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Assign a job to a server with stats tracking
   */
  static async assignJob(jobId, serverId) {
    try {
      const job = await entities.Job.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const assignedJob = await entities.Job.update(jobId, {
        assigned_to: serverId,
        assigned_at: new Date(),
        status: 'assigned',
        updated_at: new Date()
      });

      // If this is a new assignment (not a reassignment), update server stats
      if (!job.assigned_to) {
        this.updateStatsAsync('job_assigned', {
          companyId: job.company_id,
          clientId: job.client_id,
          serverId: serverId,
          jobId: job.id
        });
      }

      console.log(`Job ${jobId} assigned to server ${serverId}`);
      return assignedJob;

    } catch (error) {
      console.error('Error assigning job:', error);
      throw error;
    }
  }

  /**
   * Get jobs with enhanced filtering and stats context
   */
  static async getJobs(queryOptions = {}) {
    return await entities.Job.find(queryOptions);
  }

  /**
   * Get job by ID
   */
  static async getJobById(jobId) {
    return await entities.Job.findById(jobId);
  }

  /**
   * Handle status change logic and stats updates
   */
  static handleStatusChange(job, oldStatus, newStatus, updateData) {
    // Status transition logic
    const statusTransitions = {
      'pending': ['assigned', 'cancelled'],
      'assigned': ['in_progress', 'completed', 'cancelled'],
      'in_progress': ['completed', 'unable_to_serve', 'cancelled'],
      'completed': [], // Final state
      'unable_to_serve': ['assigned', 'cancelled'], // Can be reassigned
      'cancelled': [] // Final state
    };

    // Track important status changes
    switch (newStatus) {
      case 'completed':
        this.updateStatsAsync('job_completed', {
          companyId: job.company_id,
          clientId: job.client_id,
          serverId: job.assigned_to,
          jobId: job.id,
          wasSuccessful: updateData.was_successful !== false,
          completionDays: updateData.completion_days
        });
        break;

      case 'cancelled':
        this.updateStatsAsync('job_cancelled', {
          companyId: job.company_id,
          clientId: job.client_id,
          serverId: job.assigned_to,
          jobId: job.id
        });
        break;

      case 'unable_to_serve':
        this.updateStatsAsync('job_completed', {
          companyId: job.company_id,
          clientId: job.client_id,
          serverId: job.assigned_to,
          jobId: job.id,
          wasSuccessful: false,
          completionDays: updateData.completion_days
        });
        break;
    }
  }

  /**
   * Update stats asynchronously to avoid blocking job operations
   */
  static async updateStatsAsync(eventType, data) {
    try {
      switch (eventType) {
        case 'job_created':
          await StatsManager.recordJobCreated(
            data.companyId,
            data.clientId,
            data.serverId
          );

          // Also update company-level job metrics
          await CompanyManager.updateJobMetrics(data.companyId, 1);
          break;

        case 'job_completed':
          await StatsManager.recordJobCompleted(
            data.companyId,
            data.clientId,
            data.serverId,
            data.wasSuccessful,
            data.completionDays
          );
          break;

        case 'job_cancelled':
          await StatsManager.recordJobCancelled(
            data.companyId,
            data.clientId,
            data.serverId
          );
          break;

        case 'job_assigned':
          // This is handled in job creation, but could be used for reassignments
          break;
      }
    } catch (error) {
      // Log error but don't throw - stats shouldn't break job operations
      console.error(`Error updating stats for ${eventType}:`, error);
    }
  }

  /**
   * Get job statistics for a company
   */
  static async getJobStats(companyId) {
    try {
      return await StatsManager.getCurrentMonthStats(companyId);
    } catch (error) {
      console.error('Error getting job stats:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a time period
   */
  static async getPerformanceMetrics(companyId, year, month = null) {
    try {
      // Calculate and update performance changes
      await StatsManager.calculatePerformanceChanges(companyId);

      // Return current stats
      return await StatsManager.getCurrentMonthStats(companyId);
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }
}