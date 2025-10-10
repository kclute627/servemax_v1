import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Zap,
  X
} from 'lucide-react';
import { User } from '@/api/entities';
import { checkTrialStatus, SUBSCRIPTION_STATUS } from '@/firebase/schemas';
import { canViewBilling } from '@/utils/permissions';

export default function TrialStatusBanner({ onUpgrade, dismissible = false }) {
  const [trialInfo, setTrialInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    loadTrialInfo();
  }, []);

  const loadTrialInfo = async () => {
    setIsLoading(true);
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
        }
      }
    } catch (error) {
      console.error('Error loading trial info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !trialInfo || !canViewBilling(user) || isDismissed) {
    return null;
  }

  const { isActive, daysRemaining, jobsRemaining, reason, company } = trialInfo;

  // Don't show banner if trial is active and has plenty of time/jobs remaining
  if (isActive && daysRemaining > 7 && jobsRemaining > 20) {
    return null;
  }

  const getAlertVariant = () => {
    if (!isActive) return 'destructive';
    if (daysRemaining <= 3 || jobsRemaining <= 10) return 'destructive';
    if (daysRemaining <= 7 || jobsRemaining <= 25) return 'default';
    return 'default';
  };

  const getStatusIcon = () => {
    if (!isActive) return <AlertTriangle className="h-4 w-4" />;
    if (daysRemaining <= 3 || jobsRemaining <= 10) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (!isActive) {
      if (reason === 'days_exceeded') {
        return 'Your 30-day free trial has expired';
      } else if (reason === 'jobs_exceeded') {
        return 'You\'ve reached your trial limit of 100 jobs';
      }
      return 'Your free trial has ended';
    }

    if (daysRemaining <= 0) {
      return 'Your trial expires today!';
    } else if (daysRemaining <= 3) {
      return `Trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
    } else if (jobsRemaining <= 10) {
      return `Only ${jobsRemaining} jobs remaining in your trial`;
    } else {
      return `${daysRemaining} days and ${jobsRemaining} jobs remaining in your trial`;
    }
  };

  const jobsUsed = 100 - jobsRemaining;
  const jobsPercentage = (jobsUsed / 100) * 100;
  const daysUsed = 30 - daysRemaining;
  const daysPercentage = (daysUsed / 30) * 100;

  return (
    <Alert variant={getAlertVariant()} className="mb-6 relative">
      {getStatusIcon()}
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="ml-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              {getStatusMessage()}
              {!isActive && <Badge variant="destructive">Trial Ended</Badge>}
              {isActive && (daysRemaining <= 3 || jobsRemaining <= 10) && (
                <Badge variant="destructive">Action Required</Badge>
              )}
            </h4>
          </div>
          <Button onClick={onUpgrade} className="gap-2">
            <CreditCard className="h-4 w-4" />
            {isActive ? 'Upgrade Now' : 'Subscribe to Continue'}
          </Button>
        </div>

        {isActive && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Days Used</span>
                <span>{daysUsed} / 30 days</span>
              </div>
              <Progress value={daysPercentage} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Jobs Used</span>
                <span>{jobsUsed} / 100 jobs</span>
              </div>
              <Progress value={jobsPercentage} className="h-2" />
            </div>
          </div>
        )}

        <AlertDescription>
          {isActive ? (
            <div className="text-sm">
              <strong>What happens when your trial ends?</strong> You'll lose access to creating new jobs
              and managing clients until you choose a subscription plan. Don't worry - your existing data
              will be safely preserved.
            </div>
          ) : (
            <div className="text-sm">
              <strong>Your trial has ended.</strong> Subscribe now to regain access to all features
              and continue managing your process serving business.
            </div>
          )}
        </AlertDescription>

        {!isActive && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Unlock Full Access</span>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Unlimited jobs and clients</li>
              <li>• Full team collaboration features</li>
              <li>• Advanced reporting and analytics</li>
              <li>• Priority customer support</li>
            </ul>
          </div>
        )}
      </div>
    </Alert>
  );
}