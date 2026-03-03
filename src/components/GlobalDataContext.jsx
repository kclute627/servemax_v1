import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from "@/components/auth/AuthProvider";
import {
  SecureJobAccess,
  SecureClientAccess,
  SecureEmployeeAccess,
  SecureInvoiceAccess,
  SecurePaymentAccess,
  SecureServerPayRecordAccess,
  MultiTenantAccess
} from "@/firebase/multiTenantAccess";
import { getDummyDataState, isDummyDataEnabled } from "@/hooks/useDummyData";
import { dummyCompany } from "@/data/dummyData";
import { entities } from "@/firebase/database";
import { CompanySettings } from "@/api/entities";
import { DirectoryManager } from "@/firebase/schemas";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

const GlobalDataContext = createContext();

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

export const GlobalDataProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Pagination state for jobs
  const [jobsCursor, setJobsCursor] = useState(null);
  const [jobsHasMore, setJobsHasMore] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsFilters, setJobsFilters] = useState({ is_closed: false });
  const [jobsSearchTerm, setJobsSearchTerm] = useState('');
  const [courtCases, setCourtCases] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [serverPayRecords, setServerPayRecords] = useState([]);
  const [companyData, setCompanyData] = useState(null);
  const [myCompanyClientId, setMyCompanyClientId] = useState(null);
  const [companySettings, setCompanySettings] = useState({
    priorities: [],
    jobSharingEnabled: false,
    kanbanBoard: { enabled: true, columns: [] },
    directoryListing: null,
    ratingWeights: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadAllData = useCallback(async (forceRefresh = false) => {
    // Check for dummy data override first
    const dummyDataOverride = getDummyDataState();
    if (dummyDataOverride) {
      setClients(dummyDataOverride.clients);
      setEmployees(dummyDataOverride.employees);
      setJobs(dummyDataOverride.jobs.sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at)));
      setCourtCases(dummyDataOverride.courtCases);
      setInvoices(dummyDataOverride.invoices);
      setPayments(dummyDataOverride.payments);
      setServerPayRecords([]);
      setCompanyData(dummyCompany); // Load company data from dummy data
      setMyCompanyClientId('company_12345'); // Use dummy company ID
      setIsLoading(false);
      setLastRefresh(Date.now());
      return;
    }

    // Reduced cache time from 30s to 5s for fresher data
    if (!forceRefresh && lastRefresh && Date.now() - lastRefresh < 5000) {
      return;
    }

    // Don't load data if auth is still loading
    if (authLoading) {
      return;
    }

    // Only show loading on initial load or force refresh
    // This allows cached data to remain visible during background refreshes
    const isInitialLoad = !lastRefresh;
    if (isInitialLoad) {
      setIsLoading(true);
    }
    try {
      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        // If no authentication, clear all data
        setClients([]);
        setEmployees([]);
        setJobs([]);
        setCourtCases([]);
        setInvoices([]);
        setPayments([]);
        setServerPayRecords([]);
        setMyCompanyClientId(null);
        setIsLoading(false);
        return;
      }

      // Set company ID for context
      setMyCompanyClientId(user.company_id);

      // PERFORMANCE: Progressive data loading - critical data first
      // Tier 1: Critical data needed for initial render
      const [
        companyDataFromDb,
        employeesData,
        jobsData
      ] = await Promise.all([
        entities.Company.findById(user.company_id).catch(() => null),
        SecureEmployeeAccess.list().catch(() => []),
        SecureJobAccess.list().catch(() => [])
      ]);

      // Set critical data immediately for faster initial render
      setCompanyData(companyDataFromDb);
      setEmployees(employeesData);
      setJobs(jobsData.sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at)));

      // Tier 2: Important data (loaded in parallel, non-blocking)
      const [
        courtCasesData,
        invoicesData,
        paymentsData,
        serverPayRecordsData,
        // PERFORMANCE: Single query for all company settings instead of 3 separate queries
        allCompanySettings,
        directoryListing
      ] = await Promise.all([
        MultiTenantAccess.getCourtCases().catch(() => []),
        SecureInvoiceAccess.list().catch(() => []),
        SecurePaymentAccess.list().catch(() => []),
        SecureServerPayRecordAccess.list().catch(() => []),
        CompanySettings.filter({ setting_key: ["job_priorities", "job_sharing", "kanban_board", "server_rating_weights"], company_id: user.company_id }).catch(() => []),
        DirectoryManager.getDirectoryListing(user.company_id).catch(() => null)
      ]);

      // Extract individual settings from consolidated query
      const prioritySettings = allCompanySettings.filter(s => s.setting_key === "job_priorities");
      const jobSharingSettings = allCompanySettings.filter(s => s.setting_key === "job_sharing");
      const kanbanSettings = allCompanySettings.filter(s => s.setting_key === "kanban_board");
      const ratingWeightsSettings = allCompanySettings.filter(s => s.setting_key === "server_rating_weights");

      // Set Tier 2 data
      setCourtCases(courtCasesData);
      setInvoices(invoicesData);
      setPayments(paymentsData);
      setServerPayRecords(serverPayRecordsData);

      // Set company settings
      const loadedPriorities = prioritySettings.length > 0
        ? prioritySettings[0].setting_value.priorities.map(p => ({
            ...p,
            name: p.name || "",
            first_attempt_days: p.first_attempt_days !== undefined ? p.first_attempt_days : 0
          }))
        : [
            { name: "standard", label: "Standard", days_offset: 14, first_attempt_days: 3 },
            { name: "rush", label: "Rush", days_offset: 2, first_attempt_days: 1 },
            { name: "same_day", label: "Same Day", days_offset: 0, first_attempt_days: 0 }
          ];

      const jobSharing = jobSharingSettings.length > 0
        ? jobSharingSettings[0].setting_value.enabled || false
        : false;

      const loadedKanbanBoard = kanbanSettings.length > 0
        ? kanbanSettings[0].setting_value
        : {
            enabled: true,
            columns: [
              { id: crypto.randomUUID(), title: 'Pending', order: 0 },
              { id: crypto.randomUUID(), title: 'Assigned', order: 1 },
              { id: crypto.randomUUID(), title: 'In Progress', order: 2 },
              { id: crypto.randomUUID(), title: 'Served', order: 3 },
              { id: crypto.randomUUID(), title: 'Needs Affidavit', order: 4 },
              { id: crypto.randomUUID(), title: 'Unable to Serve', order: 5 },
              { id: crypto.randomUUID(), title: 'Cancelled', order: 6 },
            ]
          };

      // PERFORMANCE: Load rating weights here so BusinessStatsPanel doesn't need separate query
      const loadedRatingWeights = ratingWeightsSettings.length > 0
        ? ratingWeightsSettings[0].setting_value?.weights || {}
        : {};

      setCompanySettings({
        priorities: loadedPriorities,
        jobSharingEnabled: jobSharing,
        kanbanBoard: loadedKanbanBoard,
        directoryListing: directoryListing,
        ratingWeights: loadedRatingWeights
      });

      setLastRefresh(Date.now());

    } catch (error) {
      console.error("Error loading global data:", error);
      // Set empty data on error
      setClients([]);
      setEmployees([]);
      setJobs([]);
      setCourtCases([]);
      setInvoices([]);
      setPayments([]);
      setServerPayRecords([]);
    }

    // Only update loading state on initial load
    if (isInitialLoad) {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, authLoading, lastRefresh]);

  // PERFORMANCE: Selective refresh for jobs only (instead of refreshing all data)
  // Use this when only job data needs to be updated (e.g., after job share status changes)
  const refreshJobs = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const jobsData = await SecureJobAccess.list();
      setJobs(jobsData.sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at)));
    } catch (error) {
      console.error("Error refreshing jobs:", error);
    }
  }, [isAuthenticated, user]);

  // PERFORMANCE: Use ref to hold latest refreshJobs to avoid listener recreation
  const refreshJobsRef = useRef(refreshJobs);
  useEffect(() => {
    refreshJobsRef.current = refreshJobs;
  }, [refreshJobs]);

  // Paginated job loading functions
  const loadJobsPaginated = useCallback(async (filters = {}, searchTerm = '', reset = true) => {
    if (!isAuthenticated || !user) return;

    setJobsLoading(true);

    try {
      const result = await MultiTenantAccess.getJobsPaginated({
        pageSize: 50,
        cursor: reset ? null : jobsCursor,
        filters,
        searchTerm: searchTerm || null
      });

      if (reset) {
        setJobs(result.data);
      } else {
        setJobs(prev => [...prev, ...result.data]);
      }

      setJobsCursor(result.lastDoc);
      setJobsHasMore(result.hasMore);
      setJobsFilters(filters);
      setJobsSearchTerm(searchTerm);
    } catch (error) {
      console.error('Error loading paginated jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  }, [isAuthenticated, user, jobsCursor]);

  // Load more jobs (next page)
  const loadMoreJobs = useCallback(async () => {
    if (!jobsHasMore || jobsLoading) return;
    await loadJobsPaginated(jobsFilters, jobsSearchTerm, false);
  }, [jobsHasMore, jobsLoading, loadJobsPaginated, jobsFilters, jobsSearchTerm]);

  // Search jobs with term
  const searchJobs = useCallback(async (term) => {
    await loadJobsPaginated(jobsFilters, term, true);
  }, [loadJobsPaginated, jobsFilters]);

  // Update filters and reload
  const updateJobFilters = useCallback(async (newFilters) => {
    await loadJobsPaginated(newFilters, jobsSearchTerm, true);
  }, [loadJobsPaginated, jobsSearchTerm]);

  useEffect(() => {
    if (!authLoading) {
      loadAllData();
    }
  }, [loadAllData, authLoading]);

  // Real-time listener for clients - updates automatically when clients are added/modified
  useEffect(() => {
    // Check for dummy data override first
    const dummyDataOverride = getDummyDataState();
    if (dummyDataOverride) {
      // Dummy data is already set in loadAllData
      return;
    }

    // Don't set up listener if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated || !user) {
      setClients([]);
      return;
    }

    let unsubscribe;

    // Set up real-time listener
    const setupListener = async () => {
      try {
        unsubscribe = await SecureClientAccess.subscribe((clientsData) => {
          setClients(clientsData);
        });
      } catch (error) {
        console.error('Error setting up clients listener:', error);
        setClients([]);
      }
    };

    setupListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, user, authLoading]);

  // Real-time listener for outgoing job share requests
  // When a partner accepts/declines, refresh jobs so carbon_copy_pending updates on Company A's side
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.company_id) return;

    const q = query(
      collection(db, 'job_share_requests'),
      where('requesting_company_id', '==', user.company_id)
    );

    let isFirstSnapshot = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return; // Skip initial load
      }
      // PERFORMANCE: Only refresh jobs data, not all data
      // An outgoing share request changed — refresh jobs data
      // Use ref to avoid recreating listener when refreshJobs changes
      refreshJobsRef.current();
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.company_id, authLoading]);

  const allAssignableServers = React.useMemo(() => {
    const servers = [...employees];
    if (myCompanyClientId) {
      servers.push({ id: myCompanyClientId, name: "Jobs Shared With My Company" });
    }
    return servers;
  }, [employees, myCompanyClientId]);

  const value = {
    jobs,
    clients,
    employees,
    courtCases,
    invoices,
    payments,
    serverPayRecords,
    companyData,
    companySettings,
    myCompanyClientId,
    allAssignableServers,
    isLoading,
    refreshData: () => loadAllData(true),
    refreshJobs, // PERFORMANCE: Selective refresh for jobs only
    lastRefresh,
    user,
    isAuthenticated,
    // Pagination functions for jobs
    jobsLoading,
    jobsHasMore,
    jobsFilters,
    jobsSearchTerm,
    loadJobsPaginated,
    loadMoreJobs,
    searchJobs,
    updateJobFilters
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};