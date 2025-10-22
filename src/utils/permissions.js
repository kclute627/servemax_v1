import { USER_TYPES, EMPLOYEE_ROLES } from '@/firebase/schemas';

// Define permissions for different actions
export const PERMISSIONS = {
  // Company management
  MANAGE_COMPANY: 'manage_company',
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_INVITATIONS: 'manage_invitations',
  VIEW_BILLING: 'view_billing',

  // Job management
  CREATE_JOBS: 'create_jobs',
  EDIT_ALL_JOBS: 'edit_all_jobs',
  EDIT_ASSIGNED_JOBS: 'edit_assigned_jobs',
  DELETE_JOBS: 'delete_jobs',
  ASSIGN_JOBS: 'assign_jobs',
  VIEW_ALL_JOBS: 'view_all_jobs',
  VIEW_ASSIGNED_JOBS: 'view_assigned_jobs',

  // Client management
  MANAGE_CLIENTS: 'manage_clients',
  VIEW_ALL_CLIENTS: 'view_all_clients',
  VIEW_CLIENT_DETAILS: 'view_client_details',

  // Financial data
  VIEW_INVOICES: 'view_invoices',
  MANAGE_INVOICES: 'manage_invoices',
  VIEW_PAYMENTS: 'view_payments',
  MANAGE_PAYMENTS: 'manage_payments',
  VIEW_ACCOUNTING: 'view_accounting',

  // Server pay
  VIEW_SERVER_PAY: 'view_server_pay',
  MANAGE_SERVER_PAY: 'manage_server_pay',

  // System settings
  MANAGE_SETTINGS: 'manage_settings',

  // Directory (company sharing)
  VIEW_DIRECTORY: 'view_directory',
  MANAGE_DIRECTORY: 'manage_directory',
};

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  [USER_TYPES.COMPANY_OWNER]: {
    [EMPLOYEE_ROLES.ADMIN]: [
      // Company owners have full access
      PERMISSIONS.MANAGE_COMPANY,
      PERMISSIONS.MANAGE_EMPLOYEES,
      PERMISSIONS.MANAGE_INVITATIONS,
      PERMISSIONS.VIEW_BILLING,
      PERMISSIONS.CREATE_JOBS,
      PERMISSIONS.EDIT_ALL_JOBS,
      PERMISSIONS.DELETE_JOBS,
      PERMISSIONS.ASSIGN_JOBS,
      PERMISSIONS.VIEW_ALL_JOBS,
      PERMISSIONS.MANAGE_CLIENTS,
      PERMISSIONS.VIEW_ALL_CLIENTS,
      PERMISSIONS.VIEW_CLIENT_DETAILS,
      PERMISSIONS.VIEW_INVOICES,
      PERMISSIONS.MANAGE_INVOICES,
      PERMISSIONS.VIEW_PAYMENTS,
      PERMISSIONS.MANAGE_PAYMENTS,
      PERMISSIONS.VIEW_ACCOUNTING,
      PERMISSIONS.VIEW_SERVER_PAY,
      PERMISSIONS.MANAGE_SERVER_PAY,
      PERMISSIONS.MANAGE_SETTINGS,
      PERMISSIONS.VIEW_DIRECTORY,
      PERMISSIONS.MANAGE_DIRECTORY,
    ]
  },

  [USER_TYPES.EMPLOYEE]: {
    [EMPLOYEE_ROLES.ADMIN]: [
      // Employee admins have most permissions except company management
      PERMISSIONS.MANAGE_EMPLOYEES,
      PERMISSIONS.MANAGE_INVITATIONS,
      PERMISSIONS.CREATE_JOBS,
      PERMISSIONS.EDIT_ALL_JOBS,
      PERMISSIONS.DELETE_JOBS,
      PERMISSIONS.ASSIGN_JOBS,
      PERMISSIONS.VIEW_ALL_JOBS,
      PERMISSIONS.MANAGE_CLIENTS,
      PERMISSIONS.VIEW_ALL_CLIENTS,
      PERMISSIONS.VIEW_CLIENT_DETAILS,
      PERMISSIONS.VIEW_INVOICES,
      PERMISSIONS.MANAGE_INVOICES,
      PERMISSIONS.VIEW_PAYMENTS,
      PERMISSIONS.MANAGE_PAYMENTS,
      PERMISSIONS.VIEW_ACCOUNTING,
      PERMISSIONS.VIEW_SERVER_PAY,
      PERMISSIONS.MANAGE_SERVER_PAY,
      PERMISSIONS.VIEW_DIRECTORY,
    ],

    [EMPLOYEE_ROLES.MANAGER]: [
      // Managers can create and manage jobs, view clients
      PERMISSIONS.CREATE_JOBS,
      PERMISSIONS.EDIT_ALL_JOBS,
      PERMISSIONS.ASSIGN_JOBS,
      PERMISSIONS.VIEW_ALL_JOBS,
      PERMISSIONS.MANAGE_CLIENTS,
      PERMISSIONS.VIEW_ALL_CLIENTS,
      PERMISSIONS.VIEW_CLIENT_DETAILS,
      PERMISSIONS.VIEW_INVOICES,
      PERMISSIONS.VIEW_ACCOUNTING,
      PERMISSIONS.VIEW_SERVER_PAY,
      PERMISSIONS.VIEW_DIRECTORY,
    ],

    [EMPLOYEE_ROLES.PROCESS_SERVER]: [
      // Process servers can only view and complete assigned jobs
      PERMISSIONS.EDIT_ASSIGNED_JOBS,
      PERMISSIONS.VIEW_ASSIGNED_JOBS,
      PERMISSIONS.VIEW_SERVER_PAY,
    ]
  },

  [USER_TYPES.INDEPENDENT_CONTRACTOR]: {
    // Independent contractors have very limited access
    '*': [
      PERMISSIONS.EDIT_ASSIGNED_JOBS,
      PERMISSIONS.VIEW_ASSIGNED_JOBS,
      // Note: No access to client details, invoicing, or company data
    ]
  }
};

// Get user permissions based on their type and role
export const getUserPermissions = (user) => {
  if (!user) return [];

  const userType = user.user_type;
  const employeeRole = user.employee_role;

  if (userType === USER_TYPES.INDEPENDENT_CONTRACTOR) {
    return ROLE_PERMISSIONS[userType]['*'] || [];
  }

  if (userType === USER_TYPES.COMPANY_OWNER) {
    // Company owners always get admin permissions
    return ROLE_PERMISSIONS[userType][EMPLOYEE_ROLES.ADMIN] || [];
  }

  if (userType === USER_TYPES.EMPLOYEE && employeeRole) {
    return ROLE_PERMISSIONS[userType][employeeRole] || [];
  }

  return [];
};

// Check if user has a specific permission
export const hasPermission = (user, permission) => {
  const userPermissions = getUserPermissions(user);
  return userPermissions.includes(permission);
};

// Check multiple permissions (user must have ALL)
export const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

// Check multiple permissions (user must have ANY)
export const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

// Common permission checks
export const canManageCompany = (user) => hasPermission(user, PERMISSIONS.MANAGE_COMPANY);
export const canManageEmployees = (user) => hasPermission(user, PERMISSIONS.MANAGE_EMPLOYEES);
export const canManageInvitations = (user) => hasPermission(user, PERMISSIONS.MANAGE_INVITATIONS);
export const canViewBilling = (user) => hasPermission(user, PERMISSIONS.VIEW_BILLING);

export const canCreateJobs = (user) => hasPermission(user, PERMISSIONS.CREATE_JOBS);
export const canEditAllJobs = (user) => hasPermission(user, PERMISSIONS.EDIT_ALL_JOBS);
export const canDeleteJobs = (user) => hasPermission(user, PERMISSIONS.DELETE_JOBS);
export const canAssignJobs = (user) => hasPermission(user, PERMISSIONS.ASSIGN_JOBS);
export const canViewAllJobs = (user) => hasPermission(user, PERMISSIONS.VIEW_ALL_JOBS);

export const canManageClients = (user) => hasPermission(user, PERMISSIONS.MANAGE_CLIENTS);
export const canViewAllClients = (user) => hasPermission(user, PERMISSIONS.VIEW_ALL_CLIENTS);
export const canViewClientDetails = (user) => hasPermission(user, PERMISSIONS.VIEW_CLIENT_DETAILS);

export const canViewInvoices = (user) => hasPermission(user, PERMISSIONS.VIEW_INVOICES);
export const canManageInvoices = (user) => hasPermission(user, PERMISSIONS.MANAGE_INVOICES);
export const canViewAccounting = (user) => hasPermission(user, PERMISSIONS.VIEW_ACCOUNTING);

export const canViewServerPay = (user) => hasPermission(user, PERMISSIONS.VIEW_SERVER_PAY);
export const canManageServerPay = (user) => hasPermission(user, PERMISSIONS.MANAGE_SERVER_PAY);

export const canManageSettings = (user) => hasPermission(user, PERMISSIONS.MANAGE_SETTINGS);
export const canViewDirectory = (user) => hasPermission(user, PERMISSIONS.VIEW_DIRECTORY);

// Check if user can access a specific job
export const canAccessJob = (user, job) => {
  if (!user || !job) return false;

  // Company owners and admins can access all jobs from their company
  if (canViewAllJobs(user) && job.company_id === user.company_id) {
    return true;
  }

  // Process servers and contractors can only access assigned jobs
  if (hasPermission(user, PERMISSIONS.VIEW_ASSIGNED_JOBS)) {
    return job.assigned_server_id === user.uid ||
           (user.companies && user.companies.includes(job.company_id));
  }

  return false;
};

// Check if user can edit a specific job
export const canEditJob = (user, job) => {
  if (!user || !job) return false;

  // Admins and managers can edit all company jobs
  if (canEditAllJobs(user) && job.company_id === user.company_id) {
    return true;
  }

  // Process servers and contractors can only edit assigned jobs
  if (hasPermission(user, PERMISSIONS.EDIT_ASSIGNED_JOBS)) {
    return job.assigned_server_id === user.uid ||
           (user.companies && user.companies.includes(job.company_id));
  }

  return false;
};

// Super Admin menu items (platform owner)
export const getSuperAdminMenuItems = () => {
  return [
    'Dashboard',     // Platform admin dashboard
    'Jobs',          // All jobs across platform
    'Companies',     // All platform users
    'Subscriptions', // Subscription/billing overview
    'System',        // System health & monitoring
    'Templates',     // Document template management
    'Settings'       // System settings
  ];
};

// Navigation menu permissions
export const getAvailableMenuItems = (user) => {
  // Super admin gets special menu
  if (isSuperAdmin(user)) {
    return getSuperAdminMenuItems();
  }

  // Regular user menu
  const menuItems = [];

  if (canViewAllJobs(user) || hasPermission(user, PERMISSIONS.VIEW_ASSIGNED_JOBS)) {
    menuItems.push('Dashboard', 'Jobs');
  }

  if (canViewAllClients(user)) {
    menuItems.push('Clients');
  }

  if (canManageEmployees(user)) {
    menuItems.push('Employees');
  }

  if (canViewDirectory(user)) {
    menuItems.push('Directory');
  }

  if (canViewAccounting(user)) {
    menuItems.push('Accounting');
  }

  if (canViewServerPay(user)) {
    menuItems.push('ServerPay');
  }

  if (canManageSettings(user) || canViewBilling(user)) {
    menuItems.push('Settings');
  }

  return menuItems;
};

// For contractors: filter jobs to only show those from connected companies
export const filterJobsForContractor = (user, jobs) => {
  if (user.user_type !== USER_TYPES.INDEPENDENT_CONTRACTOR) {
    return jobs;
  }

  return jobs.filter(job =>
    user.companies && user.companies.includes(job.company_id)
  );
};

// For contractors: hide sensitive information from job data
export const sanitizeJobForContractor = (user, job) => {
  if (user.user_type !== USER_TYPES.INDEPENDENT_CONTRACTOR) {
    return job;
  }

  // Remove sensitive client and billing information
  const {
    client_billing_address,
    client_invoice_email,
    invoice_amount,
    payment_status,
    ...sanitizedJob
  } = job;

  return sanitizedJob;
};

// Super Admin Detection
// Super admins are SaaS owners who can manage system-wide templates and settings
// You can configure this based on:
// 1. Specific email addresses/domains
// 2. A special role flag in the user object
// 3. A custom claim in Firebase Auth

// Define your super admin email domain or specific emails here
const SUPER_ADMIN_DOMAIN = 'yourdomain.com'; // Replace with your actual domain
const SUPER_ADMIN_EMAILS = [
  // Add specific super admin emails here if needed
  // 'admin@example.com',
];

export const isSuperAdmin = (user) => {
  if (!user || !user.email) return false;

  // Check if user has super_admin role flag
  if (user.role === 'super_admin' || user.is_super_admin === true) {
    return true;
  }

  // Check if email ends with super admin domain
  if (user.email.endsWith(`@${SUPER_ADMIN_DOMAIN}`)) {
    return true;
  }

  // Check if email is in the super admin list
  if (SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }

  return false;
};