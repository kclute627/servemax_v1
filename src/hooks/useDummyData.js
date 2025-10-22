import { useState, useCallback } from 'react';
import { dummyData, generateAdditionalJobs } from '@/data/dummyData';

// Global state for dummy data override
let isDummyDataActive = false;
let dummyDataState = null;

export const useDummyData = () => {
  const [isActive, setIsActive] = useState(isDummyDataActive);

  const activateDummyData = useCallback(() => {
    dummyDataState = {
      clients: dummyData.clients,
      employees: dummyData.employees,
      jobs: [...dummyData.jobs, ...generateAdditionalJobs(15)], // Add more jobs for a fuller dashboard
      invoices: dummyData.invoices,
      payments: dummyData.payments,
      courtCases: dummyData.courtCases,
      serverPayRecords: dummyData.serverPayRecords,
      isLoading: false
    };
    isDummyDataActive = true;
    setIsActive(true);
  }, []);

  const deactivateDummyData = useCallback(() => {
    dummyDataState = null;
    isDummyDataActive = false;
    setIsActive(false);
  }, []);

  const getDummyDataOverride = useCallback(() => {
    return isDummyDataActive ? dummyDataState : null;
  }, []);

  return {
    isActive,
    activateDummyData,
    deactivateDummyData,
    getDummyDataOverride
  };
};

// Export functions for external access
export const getDummyDataState = () => {
  return isDummyDataActive ? dummyDataState : null;
};

export const isDummyDataEnabled = () => isDummyDataActive;