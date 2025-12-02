import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  FileText,
  CheckCircle,
  UserPlus,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

const TIME_PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'allTime', label: 'All Time' }
];

export default function UsageStatsPanel() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  useEffect(() => {
    loadUsageStats();

    // Auto-refresh every 60 seconds
    const interval = setInterval(loadUsageStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadUsageStats = async () => {
    try {
      setIsLoading(true);
      const usageStats = await AdminStatsManager.getUsageStats();
      setStats(usageStats);
      setError(null);
    } catch (err) {
      console.error('Error loading usage stats:', err);
      setError('Failed to load usage statistics');
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

  const currentStats = stats?.[selectedPeriod] || {
    jobs_created: 0,
    affidavits_generated: 0,
    serves_completed: 0,
    users_added: 0
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsageStats}
            className="mt-4 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Platform Usage</h2>
          <p className="text-slate-600">Track core business operations across the platform</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadUsageStats}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Time Period Selector */}
      <div className="flex flex-wrap gap-2">
        {TIME_PERIODS.map((period) => (
          <Button
            key={period.key}
            variant={selectedPeriod === period.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period.key)}
            className={selectedPeriod === period.key ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jobs Created */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-blue-700 font-medium mb-1">Jobs Created</p>
                <div className="h-16 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        key={`jobs-${selectedPeriod}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <AnimatedNumber
                          value={currentStats.jobs_created || 0}
                          className="text-3xl font-bold text-blue-900"
                          delay={100}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-blue-200/50 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Affidavits Generated */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-purple-700 font-medium mb-1">Affidavits Generated</p>
                <div className="h-16 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        key={`affidavits-${selectedPeriod}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <AnimatedNumber
                          value={currentStats.affidavits_generated || 0}
                          className="text-3xl font-bold text-purple-900"
                          delay={200}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-purple-200/50 rounded-lg">
                <FileText className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Serves Completed */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-green-700 font-medium mb-1">Serves Completed</p>
                <div className="h-16 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        key={`serves-${selectedPeriod}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <AnimatedNumber
                          value={currentStats.serves_completed || 0}
                          className="text-3xl font-bold text-green-900"
                          delay={300}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-green-200/50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Added */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-amber-700 font-medium mb-1">Users Added</p>
                <div className="h-16 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        key={`users-${selectedPeriod}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <AnimatedNumber
                          value={currentStats.users_added || 0}
                          className="text-3xl font-bold text-amber-900"
                          delay={400}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-amber-200/50 rounded-lg">
                <UserPlus className="w-6 h-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
