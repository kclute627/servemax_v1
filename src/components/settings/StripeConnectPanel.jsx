import React, { useState, useEffect } from "react";
import { useGlobalData } from "@/components/GlobalDataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Building,
  ArrowRight,
  RefreshCw,
  Info
} from "lucide-react";
import { FirebaseFunctions } from "@/firebase/functions";

export default function StripeConnectPanel() {
  const { companyData } = useGlobalData();
  const { toast } = useToast();
  const [connectStatus, setConnectStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (companyData?.id) {
      loadConnectStatus();
    }
  }, [companyData?.id]);

  const loadConnectStatus = async () => {
    try {
      setIsLoading(true);
      const result = await FirebaseFunctions.getConnectAccountStatus({
        companyId: companyData.id
      });
      setConnectStatus(result);
    } catch (error) {
      console.error('Error loading Connect status:', error);
      setConnectStatus({
        connected: false,
        status: 'not_connected',
        chargesEnabled: false,
        payoutsEnabled: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConnectStatus();
    setRefreshing(false);
  };

  const handleStartOnboarding = async () => {
    setLoadingOnboarding(true);
    try {
      const result = await FirebaseFunctions.createConnectOnboarding({
        companyId: companyData.id,
        refreshUrl: `${window.location.origin}/settings?tab=payments&refresh=true`,
        returnUrl: `${window.location.origin}/settings?tab=payments&connected=true`
      });

      // Redirect to Stripe onboarding
      window.location.href = result.accountLinkUrl;
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const handleOpenDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const result = await FirebaseFunctions.createConnectDashboardLink({
        companyId: companyData.id
      });

      // Open Stripe dashboard in new tab
      window.open(result.dashboardUrl, '_blank');
    } catch (error) {
      console.error('Dashboard error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open dashboard. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingDashboard(false);
    }
  };

  const platformFeePercent = companyData?.platform_fee_percentage || 2.9;

  const getStatusDisplay = () => {
    if (!connectStatus) return null;

    if (connectStatus.status === 'connected') {
      return (
        <Badge className="bg-green-100 text-green-700 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Connected
        </Badge>
      );
    }

    if (connectStatus.status === 'pending') {
      return (
        <Badge className="bg-amber-100 text-amber-700 gap-1">
          <Clock className="w-3 h-3" />
          Setup Incomplete
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-100 text-slate-700 gap-1">
        <AlertCircle className="w-3 h-3" />
        Not Connected
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payment Processing</h2>
          <p className="text-slate-600">Accept credit card payments from your clients</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Not Connected State */}
      {connectStatus?.status === 'not_connected' && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <CreditCard className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-purple-900">
                  Start Accepting Online Payments
                </h3>
                <p className="text-purple-700 mt-1">
                  Connect your Stripe account to accept credit card payments directly from your invoices.
                  Payments are deposited directly into your bank account.
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Accept all major credit cards
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Instant payment notifications
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Automatic invoice updates
                  </div>
                </div>
                <Button
                  onClick={handleStartOnboarding}
                  disabled={loadingOnboarding}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 gap-2"
                  size="lg"
                >
                  {loadingOnboarding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Connect with Stripe
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending/Incomplete State */}
      {connectStatus?.status === 'pending' && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-amber-900">
                  Complete Your Setup
                </h3>
                <p className="text-amber-700 mt-1">
                  Your Stripe account setup is incomplete. Please complete the onboarding process
                  to start accepting payments.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    {connectStatus.chargesEnabled ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <span className="text-sm">
                      {connectStatus.chargesEnabled ? 'Can accept payments' : 'Cannot accept payments yet'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {connectStatus.payoutsEnabled ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <span className="text-sm">
                      {connectStatus.payoutsEnabled ? 'Payouts enabled' : 'Payouts not enabled yet'}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleStartOnboarding}
                  disabled={loadingOnboarding}
                  className="mt-4 gap-2"
                >
                  {loadingOnboarding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Continue Setup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected State */}
      {connectStatus?.status === 'connected' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Stripe Connected</CardTitle>
                    <CardDescription>Your account is ready to accept payments</CardDescription>
                  </div>
                </div>
                {getStatusDisplay()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium">Accept Payments</p>
                    <p className="text-xs text-green-600">Enabled</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Building className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium">Payouts</p>
                    <p className="text-xs text-green-600">Enabled</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleOpenDashboard}
                disabled={loadingDashboard}
                variant="outline"
                className="w-full gap-2"
              >
                {loadingDashboard ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Open Stripe Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                How Invoice Payments Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="font-bold text-blue-600">1</span>
                  </div>
                  <h4 className="font-medium">Client Receives Invoice</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Send invoices through the client portal
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="font-bold text-blue-600">2</span>
                  </div>
                  <h4 className="font-medium">Client Pays Online</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    They click "Pay Now" and enter card details
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="font-bold text-blue-600">3</span>
                  </div>
                  <h4 className="font-medium">You Get Paid</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Funds deposited to your bank account
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Platform Fee Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Fees & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Stripe Processing Fee</p>
                <p className="text-sm text-slate-600">Charged by Stripe on all transactions</p>
              </div>
              <p className="font-semibold">2.9% + $0.30</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Platform Fee</p>
                <p className="text-sm text-slate-600">ServeMax platform fee</p>
              </div>
              <p className="font-semibold">{platformFeePercent}%</p>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Fees are automatically deducted from each payment. The remaining amount is deposited to your connected bank account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
