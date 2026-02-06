import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Building,
  Calendar,
  DollarSign,
  Users,
  Activity
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function CustomerHealthPanel() {
  const [churnMetrics, setChurnMetrics] = useState(null);
  const [inactiveCompanies, setInactiveCompanies] = useState(null);
  const [trialMetrics, setTrialMetrics] = useState(null);
  const [failedPayments, setFailedPayments] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllMetrics();
  }, []);

  const loadAllMetrics = async () => {
    try {
      setIsLoading(true);
      const [churn, inactive, trials, payments] = await Promise.all([
        AdminStatsManager.getChurnMetrics(),
        AdminStatsManager.getInactiveCompanies(30),
        AdminStatsManager.getTrialConversionMetrics(),
        AdminStatsManager.getFailedPaymentMetrics()
      ]);
      setChurnMetrics(churn);
      setInactiveCompanies(inactive);
      setTrialMetrics(trials);
      setFailedPayments(payments);
    } catch (err) {
      console.error('Error loading customer health metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllMetrics();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-3 text-slate-600">Loading customer health metrics...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Health</h2>
          <p className="text-slate-600">Monitor churn, retention, and payment health</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Churn Rate Card */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 text-red-500" />
              <Badge variant="outline" className={
                (churnMetrics?.monthlyChurnRate || 0) > 5
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }>
                {(churnMetrics?.monthlyChurnRate || 0) > 5 ? 'High' : 'Healthy'}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {formatPercent(churnMetrics?.monthlyChurnRate)}
            </div>
            <div className="text-sm text-slate-600">Monthly Churn Rate</div>
            <div className="text-xs text-slate-500 mt-1">
              {churnMetrics?.churnedLast30Days || 0} churned last 30 days
            </div>
          </CardContent>
        </Card>

        {/* Inactive Companies Card */}
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <Badge variant="outline" className={
                (inactiveCompanies?.inactiveCompanies?.length || 0) > 0
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }>
                {inactiveCompanies?.inactiveCompanies?.length || 0} inactive
              </Badge>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {inactiveCompanies?.atRiskCompanies?.length || 0}
            </div>
            <div className="text-sm text-slate-600">At-Risk Companies</div>
            <div className="text-xs text-slate-500 mt-1">
              15-30 days since activity
            </div>
          </CardContent>
        </Card>

        {/* Trial Conversion Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-8 h-8 text-blue-500" />
              <Badge variant="outline" className="bg-blue-100 text-blue-700">
                {trialMetrics?.activeTrials || 0} active
              </Badge>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {formatPercent(trialMetrics?.conversionRate)}
            </div>
            <div className="text-sm text-slate-600">Trial Conversion Rate</div>
            <div className="text-xs text-slate-500 mt-1">
              {trialMetrics?.trialsEndingSoon || 0} trials ending in 7 days
            </div>
          </CardContent>
        </Card>

        {/* Failed Payments Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 text-purple-500" />
              <Badge variant="outline" className={
                (failedPayments?.totalPastDue || 0) > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }>
                {failedPayments?.totalPastDue || 0} past due
              </Badge>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(failedPayments?.mrrAtRisk)}
            </div>
            <div className="text-sm text-slate-600">MRR at Risk</div>
            <div className="text-xs text-slate-500 mt-1">
              {failedPayments?.criticalCount || 0} critical (30+ days)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Details */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpandedSection(expandedSection === 'churn' ? null : 'churn')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Churn Details
              </div>
              {expandedSection === 'churn' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {expandedSection === 'churn' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {churnMetrics?.churnedLast30Days || 0}
                      </div>
                      <div className="text-xs text-slate-500">Last 30 Days</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {churnMetrics?.churnedLast60Days || 0}
                      </div>
                      <div className="text-xs text-slate-500">Last 60 Days</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {churnMetrics?.churnedLast90Days || 0}
                      </div>
                      <div className="text-xs text-slate-500">Last 90 Days</div>
                    </div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-700">MRR Lost to Churn</span>
                      <span className="text-lg font-bold text-red-900">
                        {formatCurrency(churnMetrics?.mrrLostToChurn)}
                      </span>
                    </div>
                  </div>
                  {churnMetrics?.recentlyChurned?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-700">Recently Churned</h4>
                      {churnMetrics.recentlyChurned.slice(0, 5).map((company, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-slate-400" />
                            <span>{company.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">{formatDate(company.canceledAt)}</span>
                            <Badge variant="outline" className="text-xs">
                              {company.reason || 'No reason'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Inactive Companies Details */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpandedSection(expandedSection === 'inactive' ? null : 'inactive')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Inactive & At-Risk
              </div>
              {expandedSection === 'inactive' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {expandedSection === 'inactive' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 space-y-4">
                  {/* At-Risk Companies (15-30 days) */}
                  {inactiveCompanies?.atRiskCompanies?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        At Risk (15-30 days inactive)
                      </h4>
                      {inactiveCompanies.atRiskCompanies.slice(0, 5).map((company, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-yellow-500" />
                            <span>{company.name}</span>
                          </div>
                          <div className="text-yellow-700">
                            {company.daysInactive} days inactive
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Inactive Companies (30+ days) */}
                  {inactiveCompanies?.inactiveCompanies?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-red-700 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Inactive (30+ days)
                      </h4>
                      {inactiveCompanies.inactiveCompanies.slice(0, 5).map((company, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-red-500" />
                            <span>{company.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">{company.totalJobs} jobs</span>
                            <span className="text-red-700 font-medium">
                              {company.daysInactive} days
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!inactiveCompanies?.atRiskCompanies?.length && !inactiveCompanies?.inactiveCompanies?.length) && (
                    <div className="text-center py-4 text-slate-500">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>All companies are active!</p>
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Trial Conversion Details */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpandedSection(expandedSection === 'trials' ? null : 'trials')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500" />
                Trial Conversions
              </div>
              {expandedSection === 'trials' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {expandedSection === 'trials' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">
                        {trialMetrics?.activeTrials || 0}
                      </div>
                      <div className="text-xs text-blue-600">Active Trials</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">
                        {trialMetrics?.convertedTrials || 0}
                      </div>
                      <div className="text-xs text-green-600">Converted</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {trialMetrics?.expiredTrials || 0}
                      </div>
                      <div className="text-xs text-slate-500">Expired</div>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Conversion Rate</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatPercent(trialMetrics?.conversionRate)}
                      </span>
                    </div>
                  </div>
                  {trialMetrics?.trialsEndingSoon > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-700">Ending in 7 Days</span>
                        </div>
                        <span className="text-lg font-bold text-yellow-900">
                          {trialMetrics.trialsEndingSoon}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-slate-500 text-center">
                    {trialMetrics?.recentConversions || 0} conversions in last 30 days
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Failed Payments Details */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpandedSection(expandedSection === 'payments' ? null : 'payments')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
                Payment Issues
              </div>
              {expandedSection === 'payments' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {expandedSection === 'payments' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-900">
                        {failedPayments?.criticalCount || 0}
                      </div>
                      <div className="text-xs text-red-600">Critical (30d+)</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-900">
                        {failedPayments?.warningCount || 0}
                      </div>
                      <div className="text-xs text-orange-600">Warning (15-30d)</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-900">
                        {failedPayments?.recentCount || 0}
                      </div>
                      <div className="text-xs text-yellow-600">Recent (&lt;15d)</div>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-700">Total MRR at Risk</span>
                      <span className="text-lg font-bold text-purple-900">
                        {formatCurrency(failedPayments?.mrrAtRisk)}
                      </span>
                    </div>
                  </div>
                  {failedPayments?.pastDueSubscriptions?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-700">Past Due Accounts</h4>
                      {failedPayments.pastDueSubscriptions.slice(0, 5).map((sub, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-slate-400" />
                            <span>{sub.companyName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(sub.mrr)}/mo</span>
                            <Badge
                              variant="outline"
                              className={
                                sub.severity === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : sub.severity === 'warning'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {sub.daysPastDue}d
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!failedPayments?.pastDueSubscriptions?.length) && (
                    <div className="text-center py-4 text-slate-500">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>All payments current!</p>
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
