import { entities } from './database';
import { serverTimestamp } from 'firebase/firestore';
import { geocodeZipCode, geocodeCompanyAddress, calculateDistance } from '../utils/geolocation';

// User Types
export const USER_TYPES = {
  COMPANY_OWNER: 'company_owner',
  EMPLOYEE: 'employee',
  INDEPENDENT_CONTRACTOR: 'independent_contractor'
};

// Company Types
export const COMPANY_TYPES = {
  PROCESS_SERVING: 'process_serving',
  CLIENT: 'client',
  INDEPENDENT_CONTRACTOR: 'independent_contractor'
};

// Employee Roles
export const EMPLOYEE_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PROCESS_SERVER: 'process_server'
};

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete'
};

// Billing Tiers
export const BILLING_TIERS = {
  FREE: 'free',
  TRIAL: 'trial',
  PAID: 'paid'
};

// Trial limits
export const TRIAL_LIMITS = {
  DAYS: 30,
  JOBS: 100
};

// Staff Size Options
export const STAFF_SIZES = {
  SOLO: 'solo',
  SMALL_TEAM: 'small_team',
  MEDIUM: 'medium',
  LARGE: 'large'
};

// Data Schemas for new collections

// Company Schema
export const createCompanySchema = (data) => ({
  // Basic company information
  name: data.name,
  email: data.email,
  phone: data.phone || '',
  website: data.website || '',
  fax: data.fax || '',

  // Legacy address fields (for backward compatibility)
  address: data.address || '',
  city: data.city || '',
  state: data.state || '',
  zip: data.zip || '',
  county: data.county || '',

  // Enhanced address system
  addresses: data.addresses || [
    // Auto-create primary address from legacy fields if provided
    ...(data.address || data.city || data.state || data.zip ? [{
      label: "Primary",
      address1: data.address || '',
      address2: '',
      city: data.city || '',
      state: data.state || '',
      postal_code: data.zip || '',
      county: data.county || '',
      lat: data.lat || null,
      lng: data.lng || null,
      primary: true,
      created_at: new Date(),
      updated_at: new Date()
    }] : [])
  ],

  // Ownership & relationships
  owner_id: data.owner_id, // Firebase Auth UID of company owner
  company_owner: data.owner_id, // Alias for clearer relationship identification
  company_employees: [], // Array of employee UIDs

  // Business classification & operations
  company_type: data.company_type || COMPANY_TYPES.PROCESS_SERVING, // Default to process_serving for existing companies
  staff_size: data.staff_size || 'solo', // 'solo', 'small_team', 'medium', 'large'
  service_capabilities: data.service_capabilities || [], // Array of capabilities
  custom_job_statuses: data.custom_job_statuses || [], // User-defined statuses

  // Business analytics & metrics
  monthly_jobs_quota: data.monthly_jobs_quota || null, // User-set or plan-based limit
  current_month_job_count: 0, // Auto-calculated, starts at 0
  pending_jobs_count: 0, // Auto-calculated, starts at 0
  first_job_created_at: null, // Will be set when first job is created
  last_job_created_at: null, // Will be updated with each job

  // Financial capabilities
  can_receive_funds: data.can_receive_funds || false, // Payment processing enabled

  // Billing & subscription (existing)
  billing_tier: data.billing_tier || BILLING_TIERS.TRIAL,
  subscription_status: SUBSCRIPTION_STATUS.TRIAL,
  trial_start_date: serverTimestamp(),
  trial_jobs_used: 0,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  plan_name: 'trial',
  monthly_job_limit: TRIAL_LIMITS.JOBS,

  // Collaboration settings (existing)
  collaboration_settings: {
    job_sharing_enabled: false,
    directory_listing_enabled: false,
    accepts_overflow_work: false
  },

  // Invoice settings
  invoice_settings: data.invoice_settings || {
    invoice_for_printing: false,
    per_page_copy_rate: 0.25,
    tax_on_invoice: false,
    tax_rate: 0,
    service_fee: 75,
    rush_fee: 50,
    emergency_fee: 150,
    invoice_presets: [
      { id: 'preset_1', description: 'Mileage Fee', default_amount: 15.00 },
      { id: 'preset_2', description: 'Additional Attempt', default_amount: 25.00 },
      { id: 'preset_3', description: 'Research Fee', default_amount: 35.00 },
      { id: 'preset_4', description: 'Filing Fee', default_amount: 50.00 }
    ]
  },

  // Timestamps
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
});

// Directory Collection Schema
export const createDirectorySchema = (data) => ({
  company_id: data.company_id,
  company_type: data.company_type, // Only 'process_serving' or 'independent_contractor'
  name: data.name,
  email: data.email,
  phone: data.phone || '',
  address: data.address || '',
  city: data.city || '',
  state: data.state || '',
  zip: data.zip || '',

  // Geolocation fields for distance search
  lat: data.lat || null, // Latitude coordinate
  lng: data.lng || null, // Longitude coordinate
  last_geocoded_at: data.last_geocoded_at || null, // When coordinates were last updated

  blurb: data.blurb || '', // 250 character limit
  services_offered: data.services_offered || ['standard_service'], // Array of service types
  coverage_areas: data.coverage_areas || [], // Array of ZIP codes
  service_radius_miles: data.service_radius_miles || 25,
  rates: data.rates || {
    standard_service: 75.00,
    rush_service: 125.00,
    weekend_service: 150.00
  },
  availability: data.availability || {
    accepts_rush_jobs: true,
    accepts_weekend_jobs: false,
    average_turnaround_days: 3
  },
  contact_preferences: data.contact_preferences || {
    email: true,
    phone: true,
    secure_messaging: true
  },
  verification_status: data.verification_status || 'unverified', // 'verified', 'pending', 'unverified'
  rating_average: data.rating_average || 0,
  total_jobs_completed: data.total_jobs_completed || 0,
  is_active: data.is_active !== undefined ? data.is_active : true,
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
});

// Enhanced User Schema (extends Firebase Auth users collection)
export const createUserSchema = (data) => ({
  email: data.email,
  first_name: data.first_name,
  last_name: data.last_name,
  full_name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(), // Auto-generate if not provided
  user_type: data.user_type, // company_owner, employee, independent_contractor
  company_id: data.company_id || null, // For employees and company owners
  employee_role: data.employee_role || null, // For employees only
  invited_by: data.invited_by || null, // User ID who sent the invitation
  companies: data.companies || [], // For independent contractors - array of company IDs they work with
  is_active: true,
  phone: data.phone || '',
  address: data.address || '',
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
});

// Invitation Schema
export const createInvitationSchema = (data) => ({
  email: data.email,
  invited_by: data.invited_by, // User ID who sent the invitation
  company_id: data.company_id,
  user_type: data.user_type, // employee or independent_contractor
  employee_role: data.employee_role || null, // For employees only
  invitation_token: data.invitation_token, // Unique token for secure signup
  status: 'pending', // pending, accepted, expired
  expires_at: data.expires_at, // Expiration timestamp
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
});

// Subscription Schema (if using custom subscription tracking alongside Stripe)
export const createSubscriptionSchema = (data) => ({
  company_id: data.company_id,
  stripe_subscription_id: data.stripe_subscription_id,
  stripe_customer_id: data.stripe_customer_id,
  plan_name: data.plan_name,
  status: data.status,
  current_period_start: data.current_period_start,
  current_period_end: data.current_period_end,
  monthly_job_limit: data.monthly_job_limit,
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
});

// Helper functions for multi-tenant data access

// Check if user can access company data
export const canAccessCompanyData = (user, companyId) => {
  if (!user || !companyId) return false;

  switch (user.user_type) {
    case USER_TYPES.COMPANY_OWNER:
    case USER_TYPES.EMPLOYEE:
      return user.company_id === companyId;
    case USER_TYPES.INDEPENDENT_CONTRACTOR:
      return user.companies && user.companies.includes(companyId);
    default:
      return false;
  }
};

// Get companies accessible by user
export const getAccessibleCompanies = (user) => {
  if (!user) return [];

  switch (user.user_type) {
    case USER_TYPES.COMPANY_OWNER:
    case USER_TYPES.EMPLOYEE:
      return user.company_id ? [user.company_id] : [];
    case USER_TYPES.INDEPENDENT_CONTRACTOR:
      return user.companies || [];
    default:
      return [];
  }
};

// Check trial status
export const checkTrialStatus = (company) => {
  if (!company || company.subscription_status !== SUBSCRIPTION_STATUS.TRIAL) {
    return { isActive: false, reason: 'not_in_trial' };
  }

  const trialStart = company.trial_start_date?.toDate?.() || company.trial_start_date;
  const daysSinceStart = Math.floor((Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceStart >= TRIAL_LIMITS.DAYS) {
    return { isActive: false, reason: 'days_exceeded', daysRemaining: 0 };
  }

  if (company.trial_jobs_used >= TRIAL_LIMITS.JOBS) {
    return { isActive: false, reason: 'jobs_exceeded', jobsRemaining: 0 };
  }

  return {
    isActive: true,
    daysRemaining: TRIAL_LIMITS.DAYS - daysSinceStart,
    jobsRemaining: TRIAL_LIMITS.JOBS - company.trial_jobs_used
  };
};

// Generate secure invitation token
export const generateInvitationToken = () => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
};

// Company management helpers
export class CompanyManager {
  static async createCompany(companyData, ownerId) {
    const schema = createCompanySchema({
      ...companyData,
      owner_id: ownerId
    });
    const company = await entities.Company.create(schema);

    // Auto-sync to directory if eligible and enabled
    await DirectoryManager.syncFromCompany(company);

    return company;
  }

  static async getCompanyByOwnerId(ownerId) {
    const companies = await entities.Company.filter({ owner_id: ownerId });
    return companies.length > 0 ? companies[0] : null;
  }

  static async updateTrialJobsUsed(companyId, increment = 1) {
    const company = await entities.Company.findById(companyId);
    if (!company) throw new Error('Company not found');

    return await entities.Company.update(companyId, {
      trial_jobs_used: company.trial_jobs_used + increment
    });
  }

  static async getCompanySubscriptionInfo(companyId) {
    const company = await entities.Company.findById(companyId);
    if (!company) return null;

    return {
      status: company.subscription_status,
      plan: company.plan_name,
      jobLimit: company.monthly_job_limit,
      trialInfo: checkTrialStatus(company)
    };
  }

  static async updateCompany(companyId, updateData) {
    const updatedCompany = await entities.Company.update(companyId, updateData);

    // Auto-sync to directory after company updates
    if (updatedCompany) {
      await DirectoryManager.syncFromCompany(updatedCompany);
    }

    return updatedCompany;
  }

  // Migration helper: Convert legacy company to new schema
  static async migrateCompanyToNewSchema(companyId) {
    try {
      const company = await entities.Company.findById(companyId);
      if (!company) return null;

      // Check if already migrated (has addresses array)
      if (company.addresses && Array.isArray(company.addresses)) {
        return company; // Already migrated
      }

      // Create migration update data
      const migrationData = {
        // Add new fields with defaults if missing
        website: company.website || '',
        fax: company.fax || '',
        county: company.county || '',
        staff_size: company.staff_size || STAFF_SIZES.SOLO,
        custom_job_statuses: company.custom_job_statuses || [],

        // Business analytics (preserve existing or set defaults)
        monthly_jobs_quota: company.monthly_jobs_quota || null,
        current_month_job_count: company.current_month_job_count || 0,
        pending_jobs_count: company.pending_jobs_count || 0,
        first_job_created_at: company.first_job_created_at || null,
        last_job_created_at: company.last_job_created_at || null,
        can_receive_funds: company.can_receive_funds || false,

        // Create addresses array from legacy fields
        addresses: []
      };

      // Migrate address if legacy fields exist
      if (company.address || company.city || company.state || company.zip) {
        migrationData.addresses = [{
          label: "Primary",
          address1: company.address || '',
          address2: '',
          city: company.city || '',
          state: company.state || '',
          postal_code: company.zip || '',
          county: company.county || '',
          lat: null,
          lng: null,
          primary: true,
          created_at: company.created_at || new Date(),
          updated_at: new Date()
        }];
      }

      // Update company with migration data
      return await this.updateCompany(companyId, migrationData);
    } catch (error) {
      console.error('Failed to migrate company schema:', error);
      throw error;
    }
  }

  // Helper: Get company with auto-migration
  static async getCompanyWithMigration(companyId) {
    try {
      let company = await entities.Company.findById(companyId);

      // Auto-migrate if needed
      if (company && (!company.addresses || !Array.isArray(company.addresses))) {
        company = await this.migrateCompanyToNewSchema(companyId);
      }

      return company;
    } catch (error) {
      console.error('Failed to get company with migration:', error);
      throw error;
    }
  }

  // Update job-related metrics when company stats change
  static async updateJobMetrics(companyId, increment = 1) {
    try {
      const company = await entities.Company.findById(companyId);
      if (!company) return;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Check if we need to reset for a new month
      let currentCount = company.current_month_job_count || 0;

      if (company.last_job_created_at) {
        const lastJobDate = company.last_job_created_at.toDate ? company.last_job_created_at.toDate() : new Date(company.last_job_created_at);
        const lastMonth = lastJobDate.getMonth();
        const lastYear = lastJobDate.getFullYear();

        // Reset count if we're in a new month
        if (lastMonth !== currentMonth || lastYear !== currentYear) {
          currentCount = 0;
        }
      }

      // Update current month job count
      const newCount = Math.max(0, currentCount + increment);

      await this.updateCompany(companyId, {
        current_month_job_count: newCount,
        last_job_created_at: increment > 0 ? now : company.last_job_created_at,
        first_job_created_at: company.first_job_created_at || (increment > 0 ? now : null)
      });
    } catch (error) {
      console.error('Failed to update job metrics:', error);
    }
  }
}

// Directory management helpers
export class DirectoryManager {
  static async addToDirectory(companyId, directoryData) {
    try {
      // Validate company type - only process_serving and independent_contractor can be in directory
      if (!directoryData.company_type ||
          ![COMPANY_TYPES.PROCESS_SERVING, COMPANY_TYPES.INDEPENDENT_CONTRACTOR].includes(directoryData.company_type)) {
        throw new Error('Only process serving companies and independent contractors can be added to directory');
      }

      const schema = createDirectorySchema({
        ...directoryData,
        company_id: companyId
      });

      // Use company_id as document ID for easier lookups
      return await entities.Directory.createWithId(companyId, schema);
    } catch (error) {
      throw new Error(`Failed to add to directory: ${error.message}`);
    }
  }

  static async updateDirectoryListing(companyId, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date()
      };

      return await entities.Directory.update(companyId, updateData);
    } catch (error) {
      throw new Error(`Failed to update directory listing: ${error.message}`);
    }
  }

  static async removeFromDirectory(companyId) {
    try {
      // Instead of deleting, set inactive to preserve historical data
      return await entities.Directory.update(companyId, {
        is_active: false,
        updated_at: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to remove from directory: ${error.message}`);
    }
  }

  static async getDirectoryListing(companyId) {
    try {
      return await entities.Directory.findById(companyId);
    } catch (error) {
      return null;
    }
  }

  static async searchDirectory(filters = {}) {
    try {
      // For now, do a simple search by ZIP code match
      // More complex filtering can be added later with proper Firestore compound queries
      let queryOptions = {
        where: [['is_active', '==', true]]
      };

      if (filters.zip) {
        // Add ZIP filter - this will find exact matches for now
        queryOptions.where.push(['zip', '==', filters.zip]);
      }

      if (filters.company_type) {
        queryOptions.where.push(['company_type', '==', filters.company_type]);
      }

      if (filters.min_rating) {
        queryOptions.where.push(['rating_average', '>=', filters.min_rating]);
      }

      // Add ordering by rating to show best rated first
      queryOptions.orderBy = ['rating_average', 'desc'];

      return await entities.Directory.find(queryOptions);
    } catch (error) {
      console.error('Directory search error:', error);
      // If exact ZIP search fails, try to get all active listings for now
      try {
        return await entities.Directory.filter({ is_active: true });
      } catch (fallbackError) {
        throw new Error(`Directory search failed: ${error.message}`);
      }
    }
  }

  // New distance-based search method
  static async searchDirectoryByDistance(zipCode, maxRadius = 50, filters = {}) {
    try {
      console.log(`Searching directory within ${maxRadius} miles of ZIP code: ${zipCode}`);

      // First, geocode the search ZIP code
      const searchCoords = await geocodeZipCode(zipCode);
      console.log('Search coordinates:', searchCoords);

      // Get all active directory listings
      let queryOptions = {
        where: [['is_active', '==', true]]
      };

      // Apply additional filters
      if (filters.company_type) {
        queryOptions.where.push(['company_type', '==', filters.company_type]);
      }

      if (filters.min_rating) {
        queryOptions.where.push(['rating_average', '>=', filters.min_rating]);
      }

      const allCompanies = await entities.Directory.find(queryOptions);
      console.log(`Found ${allCompanies.length} active companies to check`);

      // Calculate distances for each company
      const companiesWithDistance = [];

      for (const company of allCompanies) {
        try {
          let companyCoords = null;

          // Check if company already has coordinates
          if (company.lat && company.lng && !isNaN(company.lat) && !isNaN(company.lng)) {
            companyCoords = { lat: company.lat, lng: company.lng };
          } else {
            // Skip companies without coordinates - they need to update their own listing
            // Cannot update other companies' directory listings due to security rules
            console.warn(`Skipping ${company.name} - missing coordinates. Company should update their own listing.`);
            continue;
          }

          // Calculate distance
          const distance = calculateDistance(
            searchCoords.lat,
            searchCoords.lng,
            companyCoords.lat,
            companyCoords.lng
          );

          if (distance !== null && distance <= maxRadius) {
            companiesWithDistance.push({
              ...company,
              distance: distance,
              lat: companyCoords.lat,
              lng: companyCoords.lng
            });
          }
        } catch (error) {
          console.warn(`Error processing company ${company.name}:`, error.message);
          // Continue with other companies
        }
      }

      // Sort by distance (closest first)
      companiesWithDistance.sort((a, b) => a.distance - b.distance);

      console.log(`Found ${companiesWithDistance.length} companies within ${maxRadius} miles`);
      return companiesWithDistance;

    } catch (error) {
      console.error('Distance search error:', error);
      // Fallback to regular search if distance search fails
      console.warn('Falling back to regular directory search');
      return await this.searchDirectory(filters);
    }
  }

  // Update company coordinates
  static async updateCompanyCoordinates(companyId, force = false) {
    try {
      const listing = await this.getDirectoryListing(companyId);
      if (!listing) {
        throw new Error('Directory listing not found');
      }

      // Skip if already has coordinates and not forcing update
      if (!force && listing.lat && listing.lng && !isNaN(listing.lat) && !isNaN(listing.lng)) {
        return { lat: listing.lat, lng: listing.lng };
      }

      // Geocode the company's address
      const coordinates = await geocodeCompanyAddress(listing);

      // Update the listing with new coordinates
      await this.updateDirectoryListing(companyId, {
        lat: coordinates.lat,
        lng: coordinates.lng,
        last_geocoded_at: new Date()
      });

      return coordinates;
    } catch (error) {
      console.error(`Failed to update coordinates for company ${companyId}:`, error);
      throw error;
    }
  }

  static async updateCompanyRating(companyId, newJobData) {
    try {
      const listing = await this.getDirectoryListing(companyId);
      if (!listing) return;

      // Increment job count
      const newJobCount = listing.total_jobs_completed + 1;

      // Update rating if job data includes rating
      let newRating = listing.rating_average;
      if (newJobData.rating) {
        const totalRating = (listing.rating_average * listing.total_jobs_completed) + newJobData.rating;
        newRating = totalRating / newJobCount;
      }

      return await this.updateDirectoryListing(companyId, {
        total_jobs_completed: newJobCount,
        rating_average: newRating
      });
    } catch (error) {
      console.error('Failed to update company rating:', error);
    }
  }

  static async syncFromCompany(company) {
    try {
      // Only sync if company has directory enabled and is eligible type
      const isEligible = [COMPANY_TYPES.PROCESS_SERVING, COMPANY_TYPES.INDEPENDENT_CONTRACTOR].includes(company.company_type);
      const isEnabled = company.collaboration_settings?.directory_listing_enabled;

      if (!isEligible) return;

      const existingListing = await this.getDirectoryListing(company.id);

      if (isEnabled) {
        // Create or update directory listing
        const directoryData = {
          company_type: company.company_type,
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          state: company.state,
          zip: company.zip,
          // Preserve existing directory-specific data
          ...(existingListing ? {
            blurb: existingListing.blurb,
            services_offered: existingListing.services_offered,
            coverage_areas: existingListing.coverage_areas,
            service_radius_miles: existingListing.service_radius_miles,
            rates: existingListing.rates,
            availability: existingListing.availability,
            contact_preferences: existingListing.contact_preferences,
            rating_average: existingListing.rating_average,
            total_jobs_completed: existingListing.total_jobs_completed
          } : {}),
          is_active: true
        };

        if (existingListing) {
          return await this.updateDirectoryListing(company.id, directoryData);
        } else {
          return await this.addToDirectory(company.id, directoryData);
        }
      } else if (existingListing) {
        // Disable if exists but directory is disabled
        return await this.removeFromDirectory(company.id);
      }
    } catch (error) {
      console.error('Failed to sync directory from company:', error);
    }
  }
}

// Marketplace Job Schema
export const createMarketplaceJobSchema = (data) => ({
  // Reference to the original job
  job_id: data.job_id,

  // Company that posted the job
  posted_by_company_id: data.posted_by_company_id,
  posted_by_user_id: data.posted_by_user_id,

  // Job details (limited info for marketplace listing)
  service_type: data.service_type || 'standard',
  rush_service: data.rush_service || false,

  // Address info (city/state/ZIP only - no street address for privacy)
  service_city: data.service_city,
  service_state: data.service_state,
  service_zip: data.service_zip,
  service_county: data.service_county || '',

  // Case information
  case_number: data.case_number || '',
  defendant_name: data.defendant_name || '',

  // Court information
  court_name: data.court_name || '',
  court_county: data.court_county || '',

  // Documents count (don't expose actual documents)
  document_count: data.document_count || 0,

  // Deadline information
  deadline: data.deadline || null,

  // Special requirements or notes
  special_requirements: data.special_requirements || '',

  // Marketplace status
  status: 'open', // 'open', 'awarded', 'cancelled', 'expired'

  // Bid management
  bid_count: 0,
  lowest_bid: null,
  highest_bid: null,

  // Selected bid (when job is awarded)
  selected_bid_id: null,
  awarded_to_company_id: null,
  awarded_at: null,

  // Timestamps
  posted_at: serverTimestamp(),
  expires_at: data.expires_at || null, // Optional expiration date
  updated_at: serverTimestamp(),
  created_at: serverTimestamp()
});

// Marketplace Bid Schema
export const createMarketplaceBidSchema = (data) => ({
  // Reference to marketplace job
  marketplace_job_id: data.marketplace_job_id,
  job_id: data.job_id, // Reference to original job

  // Bidder information (NOT anonymous)
  bidder_company_id: data.bidder_company_id,
  bidder_user_id: data.bidder_user_id,
  bidder_company_name: data.bidder_company_name, // Denormalized for easy display

  // Bid details
  bid_amount: data.bid_amount,
  estimated_completion_days: data.estimated_completion_days || null,

  // Additional notes from bidder
  notes: data.notes || '',

  // Bid status
  status: 'pending', // 'pending', 'accepted', 'rejected', 'withdrawn'

  // Response timestamps
  accepted_at: null,
  rejected_at: null,
  withdrawn_at: null,

  // Timestamps
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
});

// Marketplace management helpers
export class MarketplaceManager {
  // Post a job to the marketplace
  static async postJobToMarketplace(jobId, jobData, companyId, userId) {
    try {
      // Validate that job has required fields
      if (!jobData.addresses || jobData.addresses.length === 0) {
        throw new Error('Job must have a service address to post to marketplace');
      }

      const primaryAddress = jobData.addresses.find(a => a.primary) || jobData.addresses[0];

      const marketplaceJobSchema = createMarketplaceJobSchema({
        job_id: jobId,
        posted_by_company_id: companyId,
        posted_by_user_id: userId,
        service_type: jobData.service_type,
        rush_service: jobData.rush_service,
        service_city: primaryAddress.city,
        service_state: primaryAddress.state,
        service_zip: primaryAddress.postal_code,
        service_county: primaryAddress.county,
        case_number: jobData.case_number,
        defendant_name: jobData.defendant_name,
        court_name: jobData.court_name,
        court_county: jobData.court_county,
        document_count: jobData.uploaded_documents?.length || 0,
        deadline: jobData.deadline,
        special_requirements: jobData.special_requirements,
        expires_at: jobData.marketplace_expires_at || null
      });

      return await entities.MarketplaceJob.create(marketplaceJobSchema);
    } catch (error) {
      throw new Error(`Failed to post job to marketplace: ${error.message}`);
    }
  }

  // Place a bid on a marketplace job
  static async placeBid(marketplaceJobId, jobId, bidData, companyId, userId, companyName) {
    try {
      // Check if job is still open
      const marketplaceJob = await entities.MarketplaceJob.findById(marketplaceJobId);
      if (!marketplaceJob) {
        throw new Error('Marketplace job not found');
      }

      if (marketplaceJob.status !== 'open') {
        throw new Error('This job is no longer accepting bids');
      }

      // Check if company already has a bid on this job
      const existingBids = await entities.MarketplaceBid.filter({
        marketplace_job_id: marketplaceJobId,
        bidder_company_id: companyId
      });

      if (existingBids.length > 0) {
        throw new Error('You have already placed a bid on this job');
      }

      // Create bid
      const bidSchema = createMarketplaceBidSchema({
        marketplace_job_id: marketplaceJobId,
        job_id: jobId,
        bidder_company_id: companyId,
        bidder_user_id: userId,
        bidder_company_name: companyName,
        bid_amount: bidData.bid_amount,
        estimated_completion_days: bidData.estimated_completion_days,
        notes: bidData.notes
      });

      const bid = await entities.MarketplaceBid.create(bidSchema);

      // Update marketplace job with bid stats
      const currentBidCount = marketplaceJob.bid_count || 0;
      const currentLowestBid = marketplaceJob.lowest_bid;
      const currentHighestBid = marketplaceJob.highest_bid;

      await entities.MarketplaceJob.update(marketplaceJobId, {
        bid_count: currentBidCount + 1,
        lowest_bid: !currentLowestBid ? bidData.bid_amount : Math.min(currentLowestBid, bidData.bid_amount),
        highest_bid: !currentHighestBid ? bidData.bid_amount : Math.max(currentHighestBid, bidData.bid_amount)
      });

      return bid;
    } catch (error) {
      throw new Error(`Failed to place bid: ${error.message}`);
    }
  }

  // Accept a bid and award the job
  static async acceptBid(marketplaceJobId, bidId, acceptingUserId) {
    try {
      const marketplaceJob = await entities.MarketplaceJob.findById(marketplaceJobId);
      const bid = await entities.MarketplaceBid.findById(bidId);

      if (!marketplaceJob || !bid) {
        throw new Error('Job or bid not found');
      }

      if (marketplaceJob.status !== 'open') {
        throw new Error('This job is no longer accepting bids');
      }

      // Update bid status
      await entities.MarketplaceBid.update(bidId, {
        status: 'accepted',
        accepted_at: new Date()
      });

      // Update marketplace job
      await entities.MarketplaceJob.update(marketplaceJobId, {
        status: 'awarded',
        selected_bid_id: bidId,
        awarded_to_company_id: bid.bidder_company_id,
        awarded_at: new Date()
      });

      // Reject all other bids
      const allBids = await entities.MarketplaceBid.filter({
        marketplace_job_id: marketplaceJobId
      });

      for (const otherBid of allBids) {
        if (otherBid.id !== bidId && otherBid.status === 'pending') {
          await entities.MarketplaceBid.update(otherBid.id, {
            status: 'rejected',
            rejected_at: new Date()
          });
        }
      }

      return { marketplaceJob, acceptedBid: bid };
    } catch (error) {
      throw new Error(`Failed to accept bid: ${error.message}`);
    }
  }

  // Get all open marketplace jobs (excluding user's own company)
  static async getOpenMarketplaceJobs(excludeCompanyId = null) {
    try {
      const whereConditions = [['status', '==', 'open']];

      // Note: Firestore doesn't support != operator, so we'll filter in code
      const allJobs = await entities.MarketplaceJob.find({
        where: whereConditions,
        orderBy: ['posted_at', 'desc']
      });

      if (excludeCompanyId) {
        return allJobs.filter(job => job.posted_by_company_id !== excludeCompanyId);
      }

      return allJobs;
    } catch (error) {
      throw new Error(`Failed to get marketplace jobs: ${error.message}`);
    }
  }

  // Get bids for a specific marketplace job
  static async getBidsForJob(marketplaceJobId) {
    try {
      return await entities.MarketplaceBid.filter({
        marketplace_job_id: marketplaceJobId
      });
    } catch (error) {
      throw new Error(`Failed to get bids: ${error.message}`);
    }
  }

  // Get marketplace jobs posted by a company
  static async getJobsByCompany(companyId) {
    try {
      return await entities.MarketplaceJob.filter({
        posted_by_company_id: companyId
      });
    } catch (error) {
      throw new Error(`Failed to get company jobs: ${error.message}`);
    }
  }

  // Cancel a marketplace job
  static async cancelMarketplaceJob(marketplaceJobId) {
    try {
      return await entities.MarketplaceJob.update(marketplaceJobId, {
        status: 'cancelled'
      });
    } catch (error) {
      throw new Error(`Failed to cancel marketplace job: ${error.message}`);
    }
  }
}

// Invitation management helpers
export class InvitationManager {
  static async createInvitation(invitationData) {
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const schema = createInvitationSchema({
      ...invitationData,
      invitation_token: token,
      expires_at: expiresAt
    });

    return await entities.Invitation.create(schema);
  }

  static async getInvitationByToken(token) {
    const invitations = await entities.Invitation.filter({ invitation_token: token });
    return invitations.length > 0 ? invitations[0] : null;
  }

  static async acceptInvitation(token) {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) throw new Error('Invitation not found');

    if (invitation.status !== 'pending') {
      throw new Error('Invitation already processed');
    }

    if (new Date() > invitation.expires_at) {
      throw new Error('Invitation expired');
    }

    await entities.Invitation.update(invitation.id, { status: 'accepted' });
    return invitation;
  }

  static async getPendingInvitationsByCompany(companyId) {
    return await entities.Invitation.filter({
      company_id: companyId,
      status: 'pending'
    });
  }
}