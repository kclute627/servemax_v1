import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber, AnimatedPercentage } from '@/components/ui/animated-number';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function PlatformStatsPanel() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPlatformStats();
  }, []);

  const loadPlatformStats = async () => {
    try {
      setIsLoading(true);
      const platformStats = await AdminStatsManager.getPlatformStats();
      setStats(platformStats);
    } catch (err) {
      console.error('Error loading platform stats:', err);
      setError('Failed to load platform statistics');
    } finally {
      setIsLoading(false);
    }
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

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Platform Overview</h2>
        <p className="text-slate-600">Real-time metrics across all companies</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Total Companies</p>
                <div className="h-20 flex flex-col justify-between">
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
                          value={stats?.totalCompanies || 0}
                          className="text-3xl font-bold text-slate-900"
                          delay={100}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Total Users</p>
                <div className="h-20 flex flex-col justify-between">
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
                          value={stats?.totalUsers || 0}
                          className="text-3xl font-bold text-slate-900"
                          delay={200}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Paying Subscribers</p>
                <div className="h-20 flex flex-col justify-between">
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
                          value={stats?.activeSubscriptions || 0}
                          className="text-3xl font-bold text-slate-900"
                          delay={300}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {stats?.trialSubscriptions || 0} on trial
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Growth Rate (30d)</p>
                <div className="h-20 flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <AnimatedPercentage
                          value={stats?.growthRate || 0}
                          className="text-3xl font-bold"
                          delay={400}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {stats?.recentSignups || 0} new signups
                        </p>
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

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status Breakdown</CardTitle>
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
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <AnimatedNumber
                    value={stats?.activeSubscriptions || 0}
                    className="text-2xl font-bold text-green-600 block mb-2"
                    delay={500}
                  />
                  <p className="text-sm text-slate-600">Active</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <AnimatedNumber
                    value={stats?.trialSubscriptions || 0}
                    className="text-2xl font-bold text-blue-600 block mb-2"
                    delay={600}
                  />
                  <p className="text-sm text-slate-600">Trial</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <AnimatedNumber
                    value={stats?.cancelledSubscriptions || 0}
                    className="text-2xl font-bold text-gray-600 block mb-2"
                    delay={700}
                  />
                  <p className="text-sm text-slate-600">Cancelled</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
