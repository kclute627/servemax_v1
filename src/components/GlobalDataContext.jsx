import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    directoryListing: null
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

      // Load data using secure multi-tenant access
      // Note: Clients are loaded via real-time listener (see separate useEffect below)
      const [
        companyDataFromDb,
        employeesData,
        courtCasesData,
        jobsData,
        invoicesData,
        paymentsData,
        serverPayRecordsData,
        prioritySettings,
        jobSharingSettings,
        kanbanSettings,
        directoryListing
      ] = await Promise.all([
        entities.Company.findById(user.company_id).catch(() => null),
        SecureEmployeeAccess.list().catch(() => []),
        MultiTenantAccess.getCourtCases().catch(() => []),
        SecureJobAccess.list().catch(() => []),
        SecureInvoiceAccess.list().catch(() => []),
        SecurePaymentAccess.list().catch(() => []),
        SecureServerPayRecordAccess.list().catch(() => []),
        CompanySettings.filter({ setting_key: "job_priorities" }).catch(() => []),
        CompanySettings.filter({ setting_key: "job_sharing" }).catch(() => []),
        CompanySettings.filter({ setting_key: "kanban_board" }).catch(() => []),
        DirectoryManager.getDirectoryListing(user.company_id).catch(() => null)
      ]);

      setCompanyData(companyDataFromDb);
      setEmployees(employeesData);
      setCourtCases(courtCasesData);
      setJobs(jobsData.sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at)));
      setInvoices(invoicesData);
      setPayments(paymentsData);
      setServerPayRecords(serverPayRecordsData);

      console.log('[GlobalDataContext] Jobs loaded:', jobsData.length);
      console.log('[GlobalDataContext] Sample job:', jobsData[0]);

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

      setCompanySettings({
        priorities: loadedPriorities,
        jobSharingEnabled: jobSharing,
        kanbanBoard: loadedKanbanBoard,
        directoryListing: directoryListing
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
    lastRefresh,
    user, 
    isAuthenticated 
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};