import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Loader2
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function RevenueMetricsPanel() {
  const [stats, setStats] = useState(null);
  const [revenueByPlan, setRevenueByPlan] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      setIsLoading(true);
      const [platformStats, planRevenue] = await Promise.all([
        AdminStatsManager.getPlatformStats(),
        AdminStatsManager.getRevenueByPlan()
      ]);
      setStats(platformStats);
      setRevenueByPlan(planRevenue);
    } catch (err) {
      console.error('Error loading revenue data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const LoadingSpinner = () => (
    <motion.div
      className="flex items-center gap-2 text-slate-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading...</span>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Revenue Metrics</h2>
        <p className="text-slate-600">Monthly and annual recurring revenue</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MRR */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Monthly Recurring Revenue</p>
                <div className="h-16 flex items-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <AnimatedNumber
                          value={stats?.mrr || 0}
                          format="currency"
                          className="text-3xl font-bold text-slate-900"
                          delay={100}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Annual Recurring Revenue</p>
                <div className="h-16 flex items-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <AnimatedNumber
                          value={stats?.arr || 0}
                          format="currency"
                          className="text-3xl font-bold text-slate-900"
                          delay={200}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Revenue Breakdown by Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : revenueByPlan.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No subscription data available</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {revenueByPlan.map((plan, index) => (
                  <motion.div
                    key={plan.plan}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        {plan.plan}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        {plan.count} {plan.count === 1 ? 'subscriber' : 'subscribers'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(plan.mrr)}/mo
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatCurrency(plan.arr)}/yr
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Average Revenue Per User */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <AnimatedNumber
                    value={
                      stats?.activeSubscriptions > 0
                        ? stats.mrr / stats.activeSubscriptions
                        : 0
                    }
                    format="currency"
                    className="text-2xl font-bold text-blue-600 block mb-2"
                    delay={300}
                  />
                  <p className="text-sm text-slate-600">ARPU (Monthly)</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <AnimatedNumber
                    value={
                      stats?.totalCompanies > 0
                        ? (stats.activeSubscriptions / stats.totalCompanies) * 100
                        : 0
                    }
                    suffix="%"
                    className="text-2xl font-bold text-purple-600 block mb-2"
                    delay={400}
                  />
                  <p className="text-sm text-slate-600">Conversion Rate</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <AnimatedNumber
                    value={
                      stats?.totalCompanies > 0
                        ? stats.mrr / stats.totalCompanies
                        : 0
                    }
                    format="currency"
                    className="text-2xl font-bold text-orange-600 block mb-2"
                    delay={500}
                  />
                  <p className="text-sm text-slate-600">Revenue per Company</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
