import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Job, Client, Employee, CourtCase, User, Invoice, Payment } from "@/api/entities";

const GlobalDataContext = createContext();

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

export const GlobalDataProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [courtCases, setCourtCases] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [myCompanyClientId, setMyCompanyClientId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastRefresh && Date.now() - lastRefresh < 30000) { // 30 seconds cache
      return;
    }

    setIsLoading(true);
    try {
      let companyId = myCompanyClientId;
      
      if (!companyId) {
        try {
          const currentUser = await User.me();
          if (currentUser?.email) {
            const companyClients = await Client.filter({ job_sharing_email: currentUser.email });
            if (companyClients.length > 0) {
              companyId = companyClients[0].id;
              setMyCompanyClientId(companyId);
            }
          }
        } catch (error) {
          console.error("Error fetching user/company ID:", error);
        }
      }

      const [
        clientsData, 
        employeesData, 
        courtCasesData, 
        myJobs, 
        invoicesData, 
        paymentsData
      ] = await Promise.all([
        Client.list(),
        Employee.list(),
        CourtCase.list(),
        Job.list("-created_date"),
        Invoice.list("-invoice_date"),
        Payment.list("-payment_date"),
      ]);

      setClients(clientsData);
      setEmployees(employeesData);
      setCourtCases(courtCasesData);
      setInvoices(invoicesData);
      setPayments(paymentsData);

      let sharedJobs = [];
      if (companyId) {
        sharedJobs = await Job.filter({ assigned_server_id: companyId });
      }

      const allJobsMap = new Map();
      myJobs.forEach(job => allJobsMap.set(job.id, job));
      sharedJobs.forEach(job => allJobsMap.set(job.id, job));
      const combinedJobs = Array.from(allJobsMap.values()).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setJobs(combinedJobs);
      setLastRefresh(Date.now());

    } catch (error) {
      console.error("Error loading global data:", error);
    }
    setIsLoading(false);
  }, [myCompanyClientId, lastRefresh]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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
    myCompanyClientId,
    allAssignableServers,
    isLoading,
    refreshData: () => loadAllData(true),
    lastRefresh
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};