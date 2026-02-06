import React, { useState, useEffect } from "react";
import { useGlobalData } from "@/components/GlobalDataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  CreditCard,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  XCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { FirebaseFunctions } from "@/firebase/functions";
import { entities } from "@/firebase/database";

export default function BillingPanel() {
  const { companyData } = useGlobalData();
  const { toast } = useToast();
  const [pricingPlans, setPricingPlans] = useState([]);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPricingPlans();
  }, []);

  const loadPricingPlans = async () => {
    try {
      const plans = await entities.PricingPlan.list();
      // Filter to only visible standard plans and sort by price
      const standardPlans = plans
        .filter(p => !p.is_custom && p.is_visible_on_home !== false)
        .sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
      setPricingPlans(standardPlans);
    } catch (err) {
      console.error('Error loading pricing plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscription data from company document
  const subscriptionStatus = companyData?.subscription_status || 'trial';
  const billingTier = companyData?.billing_tier || 'trial';
  const planName = companyData?.plan_name || 'Trial';
  const monthlyJobLimit = companyData?.monthly_job_limit || 100;
  const currentUsage = companyData?.current_month_job_count || 0;
  const trialStartDate = companyData?.trial_start_date?.toDate?.() || companyData?.trial_start_date;
  const periodEnd = companyData?.subscription_current_period_end?.toDate?.() || companyData?.subscription_current_period_end;
  const cancelAtPeriodEnd = companyData?.subscription_cancel_at_period_end || false;

  // Calculate trial days remaining
  const isTrialing = subscriptionStatus === 'trial';
  const trialDaysRemaining = isTrialing && trialStartDate
    ? Math.max(0, 30 - differenceInDays(new Date(), new Date(trialStartDate)))
    : 0;
  const trialJobsRemaining = isTrialing ? Math.max(0, 100 - (companyData?.trial_jobs_used || 0)) : 0;

  const usagePercentage = (currentUsage / monthlyJobLimit) * 100;
  const remainingJobs = monthlyJobLimit - currentUsage;

  // Find current plan price
  const currentPlan = pricingPlans.find(p => p.name === planName);
  const monthlyRate = currentPlan?.monthly_price || 0;

  const handleSubscribe = async (plan) => {
    if (!plan.stripe_price_id) {
      toast({
        title: "Not Available",
        description: "This plan is not yet available for subscription. Please contact support.",
        variant: "destructive"
      });
      return;
    }

    setLoadingCheckout(true);
    try {
      const result = await FirebaseFunctions.createSubscriptionCheckout({
        priceId: plan.stripe_price_id,
        companyId: companyData.id,
        successUrl: `${window.location.origin}/settings?tab=billing&subscription=success`,
        cancelUrl: `${window.location.origin}/settings?tab=billing&subscription=canceled`
      });

      // Redirect to Stripe Checkout
      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const result = await FirebaseFunctions.createBillingPortalSession({
        companyId: companyData.id,
        returnUrl: `${window.location.origin}/settings?tab=billing`
      });

      // Redirect to Stripe Customer Portal
      window.location.href = result.portalUrl;
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Active" },
      trial: { color: "bg-blue-100 text-blue-700", icon: Sparkles, label: "Trial" },
      past_due: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Past Due" },
      canceled: { color: "bg-slate-100 text-slate-700", icon: XCircle, label: "Canceled" },
      incomplete: { color: "bg-amber-100 text-amber-700", icon: Clock, label: "Incomplete" }
    };

    const { color, icon: Icon, label } = config[status] || config.incomplete;

    return (
      <Badge className={`${color} gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialing && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Free Trial</h3>
                  <p className="text-sm text-blue-700">
                    {trialDaysRemaining} days remaining • {trialJobsRemaining} jobs left
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleSubscribe(pricingPlans[0])}
                disabled={loadingCheckout || pricingPlans.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loadingCheckout ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Due Warning */}
      {subscriptionStatus === 'past_due' && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900">Payment Failed</h3>
                  <p className="text-sm text-red-700">
                    Please update your payment method to continue service
                  </p>
                </div>
              </div>
              <Button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                variant="destructive"
              >
                {loadingPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Update Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              Your subscription details and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{planName}</h3>
                  {getStatusBadge(subscriptionStatus)}
                </div>
                <p className="text-slate-600">
                  {monthlyJobLimit} jobs per month
                </p>
              </div>
              <div className="text-right">
                {billingTier === 'paid' ? (
                  <>
                    <p className="text-2xl font-bold">${monthlyRate}</p>
                    <p className="text-sm text-slate-500">per month</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">$0</p>
                    <p className="text-sm text-slate-500">trial</p>
                  </>
                )}
              </div>
            </div>

            {periodEnd && billingTier === 'paid' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}
                  </span>
                  {cancelAtPeriodEnd && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">
                      Canceling
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600">
                  {format(new Date(periodEnd), "MMMM d, yyyy")}
                </p>
              </div>
            )}

            {/* Manage Subscription Button */}
            {billingTier === 'paid' && companyData?.stripe_customer_id && (
              <Button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                variant="outline"
                className="w-full gap-2"
              >
                {loadingPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{currentUsage}</div>
              <div className="text-sm text-slate-500">
                of {monthlyJobLimit} jobs used
              </div>
            </div>

            <Progress value={Math.min(usagePercentage, 100)} className="h-2" />

            <div className="text-center">
              <p className="text-sm text-slate-600">
                {remainingJobs > 0 ? `${remainingJobs} jobs remaining` : 'Limit reached'}
              </p>
              {usagePercentage > 80 && usagePercentage < 100 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Approaching limit
                </p>
              )}
              {usagePercentage >= 100 && (
                <p className="text-xs text-red-600 mt-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Limit reached - upgrade to continue
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Plans */}
      {(isTrialing || billingTier === 'free') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Available Plans
            </CardTitle>
            <CardDescription>
              Choose a plan that fits your business needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : pricingPlans.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                No plans available. Please contact support.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">${plan.monthly_price || 0}</span>
                      <span className="text-slate-500">/month</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {plan.job_limit || 'Unlimited'} jobs/month
                    </p>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={loadingCheckout || !plan.stripe_price_id}
                      className="w-full mt-4"
                      variant={plan.stripe_price_id ? "default" : "outline"}
                    >
                      {loadingCheckout ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {plan.stripe_price_id ? 'Subscribe' : 'Coming Soon'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Management for Paid Users */}
      {billingTier === 'paid' && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Management</CardTitle>
            <CardDescription>
              Manage your subscription and billing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Need more jobs?</p>
                <p className="text-sm text-slate-600">Upgrade to handle more volume</p>
              </div>
              <Button onClick={handleManageSubscription} disabled={loadingPortal}>
                {loadingPortal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Change Plan
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Payment Method</p>
                <p className="text-sm text-slate-600">Manage your payment details</p>
              </div>
              <Button variant="outline" onClick={handleManageSubscription} disabled={loadingPortal}>
                {loadingPortal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Update
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Billing History</p>
                <p className="text-sm text-slate-600">View past invoices and receipts</p>
              </div>
              <Button variant="outline" onClick={handleManageSubscription} disabled={loadingPortal}>
                {loadingPortal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
