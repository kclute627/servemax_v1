import { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { checkTrialStatus, SUBSCRIPTION_STATUS } from '@/firebase/schemas';
import { canViewBilling } from '@/utils/permissions';

export function useTrialStatus() {
  const [trialInfo, setTrialInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTrialStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (canViewBilling(currentUser) && currentUser.company) {
        const subscriptionInfo = await User.getSubscriptionInfo();
        const company = currentUser.company;

        if (company.subscription_status === SUBSCRIPTION_STATUS.TRIAL) {
          const trialStatus = checkTrialStatus(company);
          setTrialInfo({
            ...trialStatus,
            company,
            subscriptionInfo
          });
        } else {
          // Not on trial - either active subscription or no subscription
          setTrialInfo({
            isActive: company.subscription_status === SUBSCRIPTION_STATUS.ACTIVE,
            isOnTrial: false,
            subscriptionStatus: company.subscription_status,
            company,
            subscriptionInfo
          });
        }
      } else {
        setTrialInfo(null);
      }
    } catch (err) {
      console.error('Error loading trial status:', err);
      setError(err.message);
      setTrialInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrialStatus();
  }, [loadTrialStatus]);

  // Helper functions for common checks
  const isOnTrial = trialInfo?.company?.subscription_status === SUBSCRIPTION_STATUS.TRIAL;
  const isTrialActive = isOnTrial && trialInfo?.isActive;
  const isTrialExpired = isOnTrial && !trialInfo?.isActive;
  const hasActiveSubscription = trialInfo?.subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE;

  // Check if user can perform actions that consume trial resources
  const canCreateJob = useCallback(() => {
    if (!trialInfo) return true; // Allow if we can't determine status

    // If on active subscription, always allow
    if (hasActiveSubscription) return true;

    // If on trial, check limits
    if (isOnTrial) {
      return trialInfo.isActive && trialInfo.jobsRemaining > 0;
    }

    // If no subscription info available, allow (will be handled by backend)
    return true;
  }, [trialInfo, hasActiveSubscription, isOnTrial]);

  // Check if action would trigger trial limit
  const wouldExceedTrialLimit = useCallback((actionType = 'job') => {
    if (!isOnTrial || !trialInfo?.isActive) return false;

    if (actionType === 'job') {
      return trialInfo.jobsRemaining <= 1; // Would exceed after this job
    }

    return false;
  }, [isOnTrial, trialInfo]);

  // Get trial warning info for displaying banners/warnings
  const getTrialWarning = useCallback(() => {
    if (!isOnTrial || !trialInfo) return null;

    const { daysRemaining, jobsRemaining, isActive } = trialInfo;

    if (!isActive) {
      return {
        type: 'expired',
        severity: 'critical',
        message: 'Your trial has expired. Subscribe to continue using ServeMax.',
        action: 'upgrade'
      };
    }

    if (daysRemaining <= 1) {
      return {
        type: 'days',
        severity: 'critical',
        message: `Your trial expires ${daysRemaining === 0 ? 'today' : 'tomorrow'}!`,
        action: 'upgrade'
      };
    }

    if (jobsRemaining <= 5) {
      return {
        type: 'jobs',
        severity: 'critical',
        message: `Only ${jobsRemaining} jobs remaining in your trial!`,
        action: 'upgrade'
      };
    }

    if (daysRemaining <= 3 || jobsRemaining <= 15) {
      return {
        type: 'warning',
        severity: 'warning',
        message: `${daysRemaining} days and ${jobsRemaining} jobs remaining in your trial.`,
        action: 'consider-upgrade'
      };
    }

    return null;
  }, [isOnTrial, trialInfo]);

  // Refresh trial status (useful after user actions)
  const refreshTrialStatus = useCallback(() => {
    loadTrialStatus();
  }, [loadTrialStatus]);

  return {
    // Data
    trialInfo,
    user,
    isLoading,
    error,

    // Status checks
    isOnTrial,
    isTrialActive,
    isTrialExpired,
    hasActiveSubscription,

    // Action checks
    canCreateJob,
    wouldExceedTrialLimit,

    // Warning/UI helpers
    getTrialWarning,

    // Actions
    refreshTrialStatus
  };
}

// Hook for components that need to check trial limits before actions
export function useTrialLimits() {
  const {
    canCreateJob,
    wouldExceedTrialLimit,
    isTrialExpired,
    trialInfo,
    refreshTrialStatus
  } = useTrialStatus();

  // Check if an action is allowed and return appropriate response
  const checkTrialLimit = useCallback((actionType = 'job') => {
    if (isTrialExpired) {
      return {
        allowed: false,
        reason: 'trial_expired',
        message: 'Your trial has expired. Please upgrade to continue.',
        action: 'upgrade_required'
      };
    }

    if (actionType === 'job' && !canCreateJob()) {
      return {
        allowed: false,
        reason: 'job_limit_reached',
        message: 'You\'ve reached your trial limit of 100 jobs. Please upgrade to continue.',
        action: 'upgrade_required'
      };
    }

    if (wouldExceedTrialLimit(actionType)) {
      return {
        allowed: true,
        reason: 'approaching_limit',
        message: 'This will use your last trial job. Consider upgrading soon.',
        action: 'upgrade_suggested'
      };
    }

    return {
      allowed: true,
      reason: 'within_limits',
      message: null,
      action: 'none'
    };
  }, [canCreateJob, wouldExceedTrialLimit, isTrialExpired]);

  return {
    checkTrialLimit,
    trialInfo,
    refreshTrialStatus
  };
}