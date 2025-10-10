import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Clock,
  Briefcase,
  CheckCircle,
  Star,
  Zap
} from 'lucide-react';

export default function TrialLimitModal({
  open,
  onOpenChange,
  limitType, // 'days' or 'jobs'
  onUpgrade,
  trialInfo
}) {
  const isJobLimit = limitType === 'jobs';
  const isDayLimit = limitType === 'days';

  const getTitle = () => {
    if (isJobLimit) return 'Job Limit Reached';
    if (isDayLimit) return 'Trial Period Ended';
    return 'Trial Limit Reached';
  };

  const getMessage = () => {
    if (isJobLimit) {
      return 'You\'ve reached your trial limit of 100 jobs. Upgrade to continue creating new jobs and managing your business.';
    }
    if (isDayLimit) {
      return 'Your 30-day free trial has ended. Subscribe now to continue using ServeMax and all its features.';
    }
    return 'Your trial limit has been reached. Please upgrade to continue.';
  };

  const plans = [
    {
      name: 'Professional',
      price: 29,
      period: 'month',
      features: [
        'Unlimited jobs',
        'Unlimited clients',
        'Team collaboration',
        'Advanced reporting',
        'Priority support',
        'Mobile app access'
      ],
      recommended: true
    },
    {
      name: 'Starter',
      price: 19,
      period: 'month',
      features: [
        'Up to 500 jobs/month',
        'Unlimited clients',
        'Basic reporting',
        'Email support',
        'Mobile app access'
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isJobLimit && <Briefcase className="w-5 h-5 text-orange-500" />}
            {isDayLimit && <Clock className="w-5 h-5 text-red-500" />}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Usage Alert */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Great news!</strong> You've been actively using ServeMax during your trial.
              {trialInfo && (
                <span> You've created {100 - (trialInfo.jobsRemaining || 0)} jobs and used {30 - (trialInfo.daysRemaining || 0)} days of your trial.</span>
              )}
            </AlertDescription>
          </Alert>

          {/* Subscription Plans */}
          <div>
            <h3 className="font-semibold mb-4">Choose Your Plan</h3>
            <div className="grid gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative border rounded-lg p-4 ${
                    plan.recommended
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {plan.recommended && (
                    <Badge className="absolute -top-2 left-4 bg-blue-600">
                      <Star className="w-3 h-3 mr-1" />
                      Recommended
                    </Badge>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">${plan.price}</span>
                        <span className="text-slate-500">/{plan.period}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => onUpgrade(plan)}
                      variant={plan.recommended ? 'default' : 'outline'}
                      className="gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Subscribe
                    </Button>
                  </div>

                  <ul className="space-y-1 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits Reminder */}
          <div className="bg-slate-50 border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold">Why Upgrade?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No limits on jobs or clients</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Advanced automation features</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Team collaboration tools</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Priority customer support</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Continue Trial (Read-Only)
          </Button>
          <Button
            onClick={() => onUpgrade(plans[0])}
            className="flex-1 sm:flex-none gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}