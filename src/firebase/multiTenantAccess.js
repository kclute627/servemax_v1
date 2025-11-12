import { entities } from './database';
import { FirebaseAuth } from './auth';
import { USER_TYPES, getAccessibleCompanies, CompanyManager } from './schemas';
import {
  canAccessJob,
  canViewAllClients,
  canViewClientDetails,
  canViewInvoices,
  canViewAccounting,
  filterJobsForContractor,
  sanitizeJobForContractor,
  isSuperAdmin
} from '@/utils/permissions';
import { generateClientSearchTerms } from '@/utils/searchTerms';

// Multi-tenant data access layer
export class MultiTenantAccess {
  static async getCurrentUser() {
    try {
      return await FirebaseAuth.me();
    } catch (error) {
      throw new Error('Authentication required');
    }
  }

  // Jobs with multi-tenant filtering
  static async getJobs(queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Super admin can see ALL jobs across all companies
    if (isSuperAdmin(user)) {
      const allJobs = await entities.Job.find(queryOptions);
      return allJobs;
    }

    const accessibleCompanies = getAccessibleCompanies(user);

    if (accessibleCompanies.length === 0) {
      return [];
    }

    // Add company filter to query
    const companyFilter = accessibleCompanies.length === 1
      ? [['company_id', '==', accessibleCompanies[0]]]
      : accessibleCompanies.map(companyId => ['company_id', '==', companyId]);

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ...(accessibleCompanies.length === 1 ? companyFilter : [])
      ]
    };

    let jobs;
    if (accessibleCompanies.length === 1) {
      jobs = await entities.Job.find(modifiedQuery);
    } else {
      // For multiple companies (contractors), we need to make multiple queries
      const jobPromises = accessibleCompanies.map(companyId =>
        entities.Job.filter({ company_id: companyId })
      );
      const jobArrays = await Promise.all(jobPromises);
      jobs = jobArrays.flat();
    }

    // Apply role-based filtering
    let filteredJobs = jobs.filter(job => canAccessJob(user, job));

    // For contractors, filter and sanitize data
    if (user.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR) {
      filteredJobs = filterJobsForContractor(user, filteredJobs);
      filteredJobs = filteredJobs.map(job => sanitizeJobForContractor(user, job));
    }

    return filteredJobs;
  }

  // Get single job with access control
  static async getJob(jobId) {
    const user = await this.getCurrentUser();
    const job = await entities.Job.findById(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    if (!canAccessJob(user, job)) {
      throw new Error('Access denied to this job');
    }

    // Sanitize for contractors
    if (user.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR) {
      return sanitizeJobForContractor(user, job);
    }

    return job;
  }

  // Create job with company assignment
  static async createJob(jobData) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      throw new Error('No company associated with user');
    }

    // Add company_id to job data
    const jobWithCompany = {
      ...jobData,
      company_id: user.company_id,
      created_by: user.uid
    };

    const newJob = await entities.Job.create(jobWithCompany);

    // Increment trial usage if company is on trial
    try {
      await FirebaseAuth.incrementTrialJobUsage();
    } catch (error) {
      console.warn('Could not update trial usage:', error);
    }

    // Update monthly job metrics for billing tracking
    try {
      await CompanyManager.updateJobMetrics(user.company_id, 1);
    } catch (error) {
      console.warn('Could not update job metrics:', error);
    }

    return newJob;
  }

  // Update job with access control
  static async updateJob(jobId, updateData) {
    const user = await this.getCurrentUser();
    const job = await entities.Job.findById(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    if (!canAccessJob(user, job)) {
      throw new Error('Access denied to this job');
    }

    // Prevent contractors from modifying company/client data
    if (user.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR) {
      const allowedFields = [
        'status',
        'notes',
        'attempt_details',
        'completion_date',
        'server_notes'
      ];

      const sanitizedUpdate = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          sanitizedUpdate[field] = updateData[field];
        }
      });

      return await entities.Job.update(jobId, sanitizedUpdate);
    }

    return await entities.Job.update(jobId, updateData);
  }

  // Get all companies created by the user's company (no company_type filter)
  static async getCompanies(queryOptions = {}) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      return [];
    }

    // Query companies collection where created_by equals the user's company
    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['created_by', '==', user.company_id]
        // No company_type filter - return all companies (clients and contractors)
      ]
    };

    return await entities.Company.find(modifiedQuery);
  }

  // Clients with multi-tenant filtering
  static async getClients(queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Super admin can see ALL companies
    if (isSuperAdmin(user)) {
      return await entities.Company.find(queryOptions);
    }

    if (!canViewAllClients(user)) {
      throw new Error('Access denied to client data');
    }

    if (!user.company_id) {
      return [];
    }

    // Query companies collection where created_by equals the user's company
    // Clients are identified by being created_by this company (not by company_type)
    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['created_by', '==', user.company_id]
      ]
    };

    return await entities.Company.find(modifiedQuery);
  }

  // Subscribe to real-time client updates with access control
  static async subscribeToClients(callback, queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Super admin can see ALL companies
    if (isSuperAdmin(user)) {
      return entities.Company.onSnapshot(callback, queryOptions);
    }

    if (!canViewAllClients(user)) {
      throw new Error('Access denied to client data');
    }

    if (!user.company_id) {
      // Return empty data and a no-op unsubscribe function
      callback([]);
      return () => {};
    }

    // Query companies collection where created_by equals the user's company
    // Clients are identified by being created_by this company (not by company_type)
    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['created_by', '==', user.company_id]
      ]
    };

    return entities.Company.onSnapshot(callback, modifiedQuery);
  }

  // Get single client with access control
  static async getClient(clientId) {
    const user = await this.getCurrentUser();

    if (!canViewClientDetails(user)) {
      throw new Error('Access denied to client details');
    }

    const client = await entities.Company.findById(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    // Verify this client was created by the user's company
    if (client.created_by !== user.company_id) {
      throw new Error('Access denied to this client');
    }

    return client;
  }

  // Create client with company assignment
  static async createClient(clientData) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      throw new Error('No company associated with user');
    }

    // Generate search terms if not already provided
    const search_terms = clientData.search_terms || generateClientSearchTerms(clientData);

    // Create client as a company document
    const clientCompanyData = {
      ...clientData,
      name: clientData.company_name, // Use 'name' field like other companies
      // company_type comes from clientData (user's selection from dropdown)
      created_by: user.company_id, // The company that created this client
      created_by_user: user.uid, // The user who created it
      search_terms
    };

    console.log('[MultiTenantAccess] Creating client company:', {
      name: clientCompanyData.name,
      created_by: clientCompanyData.created_by,
      company_type: clientCompanyData.company_type
    });

    // Create the client company document
    const newClient = await entities.Company.create(clientCompanyData);

    console.log('[MultiTenantAccess] Client company created:', {
      id: newClient.id,
      name: newClient.name
    });

    // Create company_stats document for the new client
    try {
      await entities.CompanyStats.createWithId(newClient.id, {
        company_id: newClient.id,
        // Initialize with empty stats - will be populated as jobs are created
        total_jobs: 0,
        active_jobs: 0,
        completed_jobs: 0
      });
      console.log('[MultiTenantAccess] Created company_stats for client:', newClient.id);
    } catch (error) {
      console.error('Error creating company_stats:', error);
      // Don't fail the client creation if stats creation fails
    }

    return newClient;
  }

  // Update client with access control
  static async updateClient(clientId, updateData) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      throw new Error('No company associated with user');
    }

    // Get the client company document
    const client = await entities.Company.findById(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    // Verify this client was created by the user's company (security check)
    if (client.created_by !== user.company_id) {
      throw new Error('Access denied to update this client');
    }

    // Regenerate search_terms if contacts were updated
    if (updateData.contacts) {
      const updatedClient = { ...client, ...updateData };
      updateData.search_terms = generateClientSearchTerms(updatedClient);
      console.log('[MultiTenantAccess] Regenerated search_terms after contact update:', updateData.search_terms);
    }

    console.log('[MultiTenantAccess] Updating client company:', {
      id: clientId,
      fields: Object.keys(updateData)
    });

    // Update the COMPANY document (not the old clients collection)
    const updatedClient = await entities.Company.update(clientId, updateData);

    console.log('[MultiTenantAccess] Client company updated successfully');

    return updatedClient;
  }

  // Courts with multi-tenant filtering
  static async getCourts(queryOptions = {}) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      return [];
    }

    // Query courts collection where created_by equals the user's company
    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['created_by', '==', user.company_id]
      ]
    };

    return await entities.Court.find(modifiedQuery);
  }

  // Create court with company assignment
  static async createCourt(courtData) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      throw new Error('No company associated with user');
    }

    const courtWithCompany = {
      ...courtData,
      created_by: user.company_id,
      created_by_user: user.uid
    };

    console.log('[MultiTenantAccess] Creating court:', {
      court_name: courtWithCompany.court_name,
      court_county: courtWithCompany.court_county,
      created_by: courtWithCompany.created_by
    });

    return await entities.Court.create(courtWithCompany);
  }

  // Cases with multi-tenant filtering
  static async getCases(queryOptions = {}) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      return [];
    }

    // Query court_cases collection where created_by equals the user's company
    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['created_by', '==', user.company_id]
      ]
    };

    return await entities.CourtCase.find(modifiedQuery);
  }

  // Create case with company assignment
  // IMPORTANT: Case should have court_id set before calling this
  static async createCase(caseData) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      throw new Error('No company associated with user');
    }

    const caseWithCompany = {
      ...caseData,
      created_by: user.company_id,
      created_by_user: user.uid
    };

    console.log('[MultiTenantAccess] Creating case:', {
      case_number: caseWithCompany.case_number,
      court_id: caseWithCompany.court_id,
      created_by: caseWithCompany.created_by
    });

    return await entities.CourtCase.create(caseWithCompany);
  }

  // Employees with multi-tenant filtering
  static async getEmployees(queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Super admin can see ALL employees across all companies
    if (isSuperAdmin(user)) {
      return await entities.Employee.find(queryOptions);
    }

    if (!user.company_id) {
      return [];
    }

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['company_id', '==', user.company_id]
      ]
    };

    return await entities.Employee.find(modifiedQuery);
  }

  // Invoices with multi-tenant filtering
  static async getInvoices(queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Super admin can see ALL invoices across all companies
    if (isSuperAdmin(user)) {
      return await entities.Invoice.find(queryOptions);
    }

    if (!canViewInvoices(user)) {
      throw new Error('Access denied to invoice data');
    }

    if (!user.company_id) {
      return [];
    }

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['company_id', '==', user.company_id]
      ]
    };

    return await entities.Invoice.find(modifiedQuery);
  }

  // Payments with multi-tenant filtering
  static async getPayments(queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Super admin can see ALL payments across all companies
    if (isSuperAdmin(user)) {
      return await entities.Payment.find(queryOptions);
    }

    if (!canViewAccounting(user)) {
      throw new Error('Access denied to payment data');
    }

    if (!user.company_id) {
      return [];
    }

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['company_id', '==', user.company_id]
      ]
    };

    return await entities.Payment.find(modifiedQuery);
  }

  // Court cases with multi-tenant filtering
  static async getCourtCases(queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Super admin can see ALL court cases across all companies
    if (isSuperAdmin(user)) {
      return await entities.CourtCase.find(queryOptions);
    }

    if (!user.company_id) {
      return [];
    }

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['company_id', '==', user.company_id]
      ]
    };

    return await entities.CourtCase.find(modifiedQuery);
  }

  // Documents with access control
  static async getDocuments(queryOptions = {}) {
    const user = await this.getCurrentUser();
    const accessibleCompanies = getAccessibleCompanies(user);

    if (accessibleCompanies.length === 0) {
      return [];
    }

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['company_id', 'in', accessibleCompanies]
      ]
    };

    return await entities.Document.find(modifiedQuery);
  }

  // Server pay records with multi-tenant filtering
  static async getServerPayRecords(queryOptions = {}) {
    const user = await this.getCurrentUser();

    // Independent contractors can only see their own pay records
    if (user.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR) {
      const modifiedQuery = {
        ...queryOptions,
        where: [
          ...(queryOptions.where || []),
          ['server_id', '==', user.uid]
        ]
      };
      return await entities.ServerPayRecord.find(modifiedQuery);
    }

    // Company users can see all records for their company
    if (!user.company_id) {
      return [];
    }

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['company_id', '==', user.company_id]
      ]
    };

    return await entities.ServerPayRecord.find(modifiedQuery);
  }

  // Subscription info for company
  static async getSubscriptionInfo() {
    const user = await this.getCurrentUser();
    return await FirebaseAuth.getSubscriptionInfo();
  }

  // Generic method for entities that need company filtering
  static async getEntityWithCompanyFilter(entityName, queryOptions = {}) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      return [];
    }

    const modifiedQuery = {
      ...queryOptions,
      where: [
        ...(queryOptions.where || []),
        ['company_id', '==', user.company_id]
      ]
    };

    return await entities[entityName].find(modifiedQuery);
  }

  // Create entity with company assignment
  static async createEntityWithCompany(entityName, entityData) {
    const user = await this.getCurrentUser();

    if (!user.company_id) {
      throw new Error('No company associated with user');
    }

    const dataWithCompany = {
      ...entityData,
      company_id: user.company_id,
      created_by: user.uid
    };

    return await entities[entityName].create(dataWithCompany);
  }
}

// Export convenience methods that wrap the multi-tenant access
export const SecureJobAccess = {
  list: (queryOptions) => MultiTenantAccess.getJobs(queryOptions),
  findById: (id) => MultiTenantAccess.getJob(id),
  create: (data) => MultiTenantAccess.createJob(data),
  update: (id, data) => MultiTenantAccess.updateJob(id, data),
  filter: (filterObj) => MultiTenantAccess.getJobs({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};

export const SecureCompanyAccess = {
  list: (queryOptions) => MultiTenantAccess.getCompanies(queryOptions),
  filter: (filterObj) => MultiTenantAccess.getCompanies({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};

export const SecureClientAccess = {
  list: (queryOptions) => MultiTenantAccess.getClients(queryOptions),
  subscribe: (callback, queryOptions) => MultiTenantAccess.subscribeToClients(callback, queryOptions),
  findById: (id) => MultiTenantAccess.getClient(id),
  create: (data) => MultiTenantAccess.createClient(data),
  update: (id, data) => MultiTenantAccess.updateClient(id, data),
  filter: (filterObj) => MultiTenantAccess.getClients({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};

export const SecureEmployeeAccess = {
  list: (queryOptions) => MultiTenantAccess.getEmployees(queryOptions),
  filter: (filterObj) => MultiTenantAccess.getEmployees({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};

export const SecureInvoiceAccess = {
  list: (queryOptions) => MultiTenantAccess.getInvoices(queryOptions),
  filter: (filterObj) => MultiTenantAccess.getInvoices({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};

export const SecurePaymentAccess = {
  list: (queryOptions) => MultiTenantAccess.getPayments(queryOptions),
  filter: (filterObj) => MultiTenantAccess.getPayments({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};

export const SecureCourtAccess = {
  list: (queryOptions) => MultiTenantAccess.getCourts(queryOptions),
  create: (data) => MultiTenantAccess.createCourt(data),
  filter: (filterObj) => MultiTenantAccess.getCourts({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};

export const SecureCaseAccess = {
  list: (queryOptions) => MultiTenantAccess.getCases(queryOptions),
  create: (data) => MultiTenantAccess.createCase(data),
  filter: (filterObj) => MultiTenantAccess.getCases({ where: Object.entries(filterObj).map(([k, v]) => [k, '==', v]) })
};