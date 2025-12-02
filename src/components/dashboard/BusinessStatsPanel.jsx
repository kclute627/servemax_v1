import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber, AnimatedPercentage } from '@/components/ui/animated-number';
import { AnimatedCard, AnimatedGrid, AnimatedContent } from '@/components/ui/animated-card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Users,
  Star,
  Calendar,
  Target,
  Award,
  Clock,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { StatsManager } from '@/firebase/stats';
import { InvoiceManager } from '@/firebase/invoiceManager';
import { useGlobalData } from '@/components/GlobalDataContext';
import { CompanySettings } from '@/api/entities';
import { createPageUrl } from '@/utils';
import TopClients from './TopClients';
import TopServers from './TopServers';
import {
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  isWithinInterval,
} from "date-fns";

export default function BusinessStatsPanel() {
  const { user } = useAuth();
  const { jobs, clients, invoices, employees, serverPayRecords, isLoading: isLoadingJobs } = useGlobalData();
  const [stats, setStats] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [topServers, setTopServers] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [realTimeJobCounts, setRealTimeJobCounts] = useState(null);
  const [jobActivity, setJobActivity] = useState(null);

  // State for integrated TopClients and TopServers
  const [topClientsData, setTopClientsData] = useState([]);
  const [isTopClientsLoading, setIsTopClientsLoading] = useState(true);
  const [topClientsPeriod, setTopClientsPeriod] = useState('this_month');

  const [topServersData, setTopServersData] = useState([]);
  const [isTopServersLoading, setIsTopServersLoading] = useState(true);
  const [topServersPeriod, setTopServersPeriod] = useState('this_month');
  const [ratingWeights, setRatingWeights] = useState({
    completion_time: 3,
    profit_margin: 3,
    affidavit_turnaround: 3,
    first_attempt_timing: 3,
    acceptance_rate: 0,
    mobile_app_usage: 0
  });

  // Time period options
  const timePeriods = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'all_time', label: 'All Time' }
  ];

  // Time period options for Top Clients and Top Servers
  const topDataTimePeriods = [
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'all_time', label: 'All Time' },
  ];

  // Load rating weights from company settings
  useEffect(() => {
    const loadRatingWeights = async () => {
      try {
        const result = await CompanySettings.filter({ setting_key: 'server_rating_weights' });
        if (result && result.length > 0) {
          setRatingWeights(prev => ({ ...prev, ...result[0].setting_value.weights }));
        }
      } catch (error) {
        console.error('Error loading rating weights:', error);
      }
    };
    loadRatingWeights();
  }, []);

  // Calculate real-time job counts whenever jobs data changes
  useEffect(() => {
    if (jobs && jobs.length >= 0) {
      const realTimeCounts = StatsManager.getRealTimeJobCounts(jobs);
      setRealTimeJobCounts(realTimeCounts);

      const activityCounts = StatsManager.getJobActivityForTimePeriod(jobs, selectedPeriod);

      // Calculate unsigned affidavits count
      const unsignedAffidavitsCount = jobs.filter(job =>
        (job.status === 'served' || job.status === 'non-served') &&
        !job.is_closed &&
        !job.has_signed_affidavit
      ).length;

      setJobActivity({
        ...activityCounts,
        unsignedAffidavits: unsignedAffidavitsCount
      });
    }
  }, [jobs, selectedPeriod]);

  // Calculate real-time business stats from jobs and invoices
  useEffect(() => {
    if (jobs && invoices) {
      setIsLoadingStats(true);
      calculateRealTimeStats();
    }
  }, [jobs, invoices, selectedPeriod]);

  const calculateRealTimeStats = () => {
    try {
      const now = new Date();
      let startDate, endDate;

      // Determine date range based on selected period
      switch (selectedPeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all_time':
          startDate = null;
          endDate = null;
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      // Filter jobs by period
      const jobsInPeriod = startDate
        ? jobs.filter(job => {
            const createdAt = new Date(job.created_at);
            return createdAt >= startDate && createdAt < endDate;
          })
        : jobs;

      // Filter invoices by period (use created_at for invoices)
      const invoicesInPeriod = startDate
        ? invoices.filter(inv => {
            const createdAt = new Date(inv.created_at || inv.invoice_date);
            return createdAt >= startDate && createdAt < endDate;
          })
        : invoices;

      // Calculate job counts
      const totalJobs = jobsInPeriod.length;
      const completedJobs = jobsInPeriod.filter(j => j.status === 'served').length;
      const inProgressJobs = jobsInPeriod.filter(j => !j.is_closed && j.status !== 'served').length;
      const cancelledJobs = jobsInPeriod.filter(j => j.status === 'cancelled').length;

      // Calculate financial metrics
      const totalBilled = invoicesInPeriod.reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);
      const totalCollected = invoicesInPeriod
        .filter(inv => inv.status?.toLowerCase() === 'paid')
        .reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);

      // Calculate outstanding from ALL invoices (not period-filtered)
      // Match the Accounting page calculation: exclude cancelled, use balance_due
      const allActiveInvoices = invoices.filter(inv => inv.status?.toLowerCase() !== 'cancelled');
      const outstandingInvoices = allActiveInvoices.filter(inv =>
        ['issued', 'sent', 'overdue', 'partial', 'partially_paid'].includes(inv.status?.toLowerCase())
      );
      const outstanding = outstandingInvoices.reduce((sum, inv) =>
        sum + (inv.balance_due || inv.amount_outstanding || inv.total_amount || inv.total || 0), 0
      );

      // Calculate performance changes (simplified - just show 0 for now)
      const realTimeStats = {
        company_id: user?.company_id,
        jobs: {
          total: totalJobs,
          completed: completedJobs,
          in_progress: inProgressJobs,
          cancelled: cancelledJobs
        },
        financial: {
          total_billed: totalBilled,
          total_collected: totalCollected,
          outstanding: outstanding
        },
        performance: {
          billing_change_mom: 0,
          volume_change_mom: 0
        }
      };

      setStats(realTimeStats);
      setIsLoadingStats(false);
    } catch (error) {
      console.error('Error calculating real-time stats:', error);
      setIsLoadingStats(false);
    }
  };

  // Helper function for date ranges
  const getDateRangeForTopData = (period) => {
    const now = new Date();

    switch (period) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'this_quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'all_time':
        return null; // No date filtering
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  // Calculate TopClients data
  const calculateTopClientsData = useCallback(() => {
    if (isLoadingJobs || !jobs || !invoices || !clients) {
        setTopClientsData([]);
        return;
    }
    setIsTopClientsLoading(true);

    const dateRange = getDateRangeForTopData(topClientsPeriod);

    const clientStats = clients.reduce((acc, client) => {
        acc[client.id] = { client, jobs: 0, revenue: 0 };
        return acc;
    }, {});

    // Calculate jobs: Count all jobs CREATED in the period (not just served)
    const jobsToConsider = dateRange
        ? jobs.filter(job => job.created_at && isWithinInterval(new Date(job.created_at), dateRange))
        : jobs;

    jobsToConsider.forEach(job => {
        if (job.client_id && clientStats[job.client_id]) {
            clientStats[job.client_id].jobs += 1;
        }
    });

    // Calculate revenue from ALL invoices (not just paid) - show total billed amount
    const invoicesToConsider = dateRange
        ? invoices.filter(inv => {
            const invoiceDate = new Date(inv.created_at || inv.invoice_date);
            return isWithinInterval(invoiceDate, dateRange);
          })
        : invoices;

    invoicesToConsider.forEach(invoice => {
        if (invoice.client_id && clientStats[invoice.client_id]) {
            clientStats[invoice.client_id].revenue += invoice.total_amount || 0;
        }
    });

    // Filter out clients with no activity and sort
    const statsArray = Object.values(clientStats)
                            .filter(item => item.jobs > 0 || item.revenue > 0)
                            .sort((a, b) => b.revenue - a.revenue || b.jobs - a.jobs);

    setTopClientsData(statsArray);
    setIsTopClientsLoading(false);
  }, [jobs, invoices, clients, topClientsPeriod, isLoadingJobs]);

  // Calculate TopServers data
  const calculateTopServersData = useCallback(() => {
    if (isLoadingJobs || !jobs || !employees) {
        setTopServersData([]);
        return;
    }
    setIsTopServersLoading(true);

    const dateRange = getDateRangeForTopData(topServersPeriod);
    // Show all employees (removed role filter since employees may not have role field)
    const processServers = employees;

    const serverStats = processServers.reduce((acc, server) => {
        acc[server.id] = {
            server,
            jobs: 0, // All jobs assigned in period
            completedJobs: 0, // Jobs served in period
            rating: 0,
            serverPay: 0, // Total amount paid to server
            clientBilling: 0, // Total amount billed to clients
            profit: 0 // Profit/loss (clientBilling - serverPay)
        };
        return acc;
    }, {});

    // 1. Count jobs COMPLETED (served) by each server within the period
    const servedJobsInPeriod = dateRange
        ? jobs.filter(job => job.status === 'served' && job.updated_at && isWithinInterval(new Date(job.updated_at), dateRange))
        : jobs.filter(job => job.status === 'served');

    servedJobsInPeriod.forEach(job => {
        if (job.assigned_server_id && serverStats[job.assigned_server_id]) {
            serverStats[job.assigned_server_id].completedJobs += 1;

            // Get server pay from serverPayRecords collection (linked by job_id)
            const serverPayRecord = serverPayRecords?.find(r => r.job_id === job.id);
            const serverPay = serverPayRecord?.total_amount || 0;

            // Get client billing from invoice linked to this job (invoice total is the actual billed amount)
            // Note: invoices use job_ids array, not job_id
            const jobInvoice = invoices?.find(inv =>
              inv.job_ids?.includes(job.id) || inv.job_id === job.id
            );
            const clientBilling = jobInvoice?.total_amount || jobInvoice?.total || job.total_fee || 0;

            serverStats[job.assigned_server_id].serverPay += serverPay;
            serverStats[job.assigned_server_id].clientBilling += clientBilling;
            serverStats[job.assigned_server_id].profit += (clientBilling - serverPay);
        }
    });

    // 2. Count all jobs ASSIGNED to each server within the period (for completion rate)
    const assignedJobsInPeriod = dateRange
        ? jobs.filter(job => job.created_at && isWithinInterval(new Date(job.created_at), dateRange))
        : jobs;

    assignedJobsInPeriod.forEach(job => {
        if (job.assigned_server_id && serverStats[job.assigned_server_id]) {
            serverStats[job.assigned_server_id].jobs += 1;
        }
    });

    // Calculate ratings using weighted factors from settings
    const statsArray = Object.values(serverStats).map(stat => {
        // A server must have jobs assigned in the period to have a rating.
        if (stat.jobs === 0) {
          return { ...stat, rating: 0 };
        }

        let totalScore = 0;
        let totalWeight = 0;

        // 1. Completion Time Score (faster = better)
        // Score based on completion rate as proxy for efficiency
        if (ratingWeights.completion_time > 0) {
          const completionRate = stat.completedJobs / stat.jobs;
          totalScore += completionRate * ratingWeights.completion_time;
          totalWeight += ratingWeights.completion_time;
        }

        // 2. Profit Margin Score (higher margin = better)
        // Score: profit as percentage of client billing, capped at 100%
        if (ratingWeights.profit_margin > 0 && stat.clientBilling > 0) {
          const marginPercent = Math.min(stat.profit / stat.clientBilling, 1);
          const marginScore = Math.max(0, marginPercent); // No negative scores
          totalScore += marginScore * ratingWeights.profit_margin;
          totalWeight += ratingWeights.profit_margin;
        } else if (ratingWeights.profit_margin > 0) {
          // If no billing data, neutral score of 0.5
          totalScore += 0.5 * ratingWeights.profit_margin;
          totalWeight += ratingWeights.profit_margin;
        }

        // 3. First Attempt Timing Score (placeholder - uses completion as proxy)
        if (ratingWeights.first_attempt_timing > 0) {
          const completionRate = stat.completedJobs / stat.jobs;
          totalScore += completionRate * ratingWeights.first_attempt_timing;
          totalWeight += ratingWeights.first_attempt_timing;
        }

        // 4. Affidavit Turnaround Score (placeholder - uses completion as proxy)
        if (ratingWeights.affidavit_turnaround > 0) {
          const completionRate = stat.completedJobs / stat.jobs;
          totalScore += completionRate * ratingWeights.affidavit_turnaround;
          totalWeight += ratingWeights.affidavit_turnaround;
        }

        // Future factors (acceptance_rate, mobile_app_usage) - disabled by default

        // Calculate final rating (0-5 scale)
        const rating = totalWeight > 0
          ? (totalScore / totalWeight) * 5
          : 0;

        return {
            ...stat,
            rating: Number(rating.toFixed(1))
        };
    }).sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs);

    setTopServersData(statsArray);
    setIsTopServersLoading(false);
  }, [jobs, employees, serverPayRecords, topServersPeriod, isLoadingJobs, ratingWeights, invoices]);

  // Calculate TopClients data when dependencies change
  useEffect(() => {
    calculateTopClientsData();
  }, [calculateTopClientsData]);

  // Calculate TopServers data when dependencies change
  useEffect(() => {
    calculateTopServersData();
  }, [calculateTopServersData]);

  const loadBusinessStats = async () => {
    try {
      setIsLoadingStats(true);
      setError(null);

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Load data sources with individual error handling
      const results = await Promise.allSettled([
        StatsManager.getStatsForTimePeriod(user.company_id, selectedPeriod),
        StatsManager.getTopClients(user.company_id, currentYear, currentMonth, 5),
        StatsManager.getTopServers(user.company_id, currentYear, currentMonth, 5)
      ]);

      // Extract results with fallbacks
      const periodStats = results[0].status === 'fulfilled' ? results[0].value : {
        company_id: user.company_id,
        jobs: { total: 0, completed: 0, in_progress: 0, cancelled: 0 },
        financial: { total_billed: 0, total_collected: 0, outstanding: 0 },
        performance: { billing_change_mom: 0, volume_change_mom: 0 }
      };

      const clientsData = results[1].status === 'fulfilled' ? results[1].value : [];
      const serversData = results[2].status === 'fulfilled' ? results[2].value : [];

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const dataType = ['monthly stats', 'top clients', 'top servers'][index];
          console.warn(`Failed to load ${dataType}:`, result.reason);
        }
      });

      // Try to calculate performance changes (non-critical)
      try {
        await StatsManager.calculatePerformanceChanges(user.company_id);
      } catch (perfError) {
        console.warn('Performance calculation failed:', perfError);
      }

      setStats(periodStats);
      setTopClients(clientsData);
      setTopServers(serversData);
    } catch (err) {
      console.error('Error loading business stats:', err);
      setError('Failed to load business statistics. This is normal for new accounts.');

      // Set default empty state
      setStats({
        company_id: user.company_id,
        jobs: { total: 0, completed: 0, in_progress: 0, cancelled: 0 },
        financial: { total_billed: 0, total_collected: 0, outstanding: 0 },
        performance: { billing_change_mom: 0, volume_change_mom: 0 }
      });
      setTopClients([]);
      setTopServers([]);
    } finally {
      setIsLoadingStats(false);
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

  const formatPercentage = (value) => {
    if (!value || value === 0) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${Math.round(value * 100) / 100}%`;
  };

  const getPeriodLabel = () => {
    const selected = timePeriods.find(p => p.value === selectedPeriod);
    return selected ? selected.label : 'This Period';
  };

  const handleJobCountClick = (filterType) => {
    let url = createPageUrl("Jobs");

    switch (filterType) {
      case 'total_open':
        url += '?status=open';
        break;
      case 'open_rush':
        url += '?status=open&priority=rush';
        break;
      case 'need_attention':
        url += '?status=open&attention=true';
        break;
      default:
        url += '?status=open';
    }

    window.location.href = url;
  };

  const LoadingSpinner = ({ size = "default" }) => {
    const sizeClasses = {
      small: "w-4 h-4",
      default: "w-6 h-6",
      large: "w-8 h-8"
    };

    return (
      <motion.div
        className="flex items-center gap-2 text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Loader2 className={`${sizeClasses[size]} animate-spin`} />
        <span className="text-sm">Loading...</span>
      </motion.div>
    );
  };


  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-blue-500 opacity-50" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Setting Up Your Analytics</h3>
            <p className="text-slate-600 mb-2">
              Your business analytics dashboard is getting ready. This is normal for new accounts.
            </p>
            <p className="text-sm text-slate-500">
              Create your first job or invoice to start seeing statistics here.
            </p>
          </div>
          <button
            onClick={loadBusinessStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Check Again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Period Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Business Analytics</h2>
            <p className="text-slate-600">Performance metrics and key indicators</p>
          </div>
        </div>

        {/* Time Period Selector - Responsive */}
        <div className="flex flex-col gap-4">
          {/* Large Screen Slider */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Time Period</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-sm">
              {timePeriods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                    selectedPeriod === period.value
                      ? 'bg-white text-slate-900 shadow-lg ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Small/Medium Screen Dropdown */}
          <div className="lg:hidden flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="flex h-10 w-40 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              {timePeriods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jobs This Month */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <motion.p
                  className="text-sm text-slate-600 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  Jobs {getPeriodLabel()}
                </motion.p>
                <div className="h-20 flex flex-col justify-between relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="h-full flex flex-col justify-between"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.jobs?.total || 0}
                          className="text-2xl font-bold text-slate-900 mb-2"
                          delay={150}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <motion.p
                  className="text-sm text-slate-600 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Billed {getPeriodLabel()}
                </motion.p>
                <div className="h-20 flex flex-col justify-between relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="h-full flex flex-col justify-between"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.financial?.total_billed || 0}
                          format="currency"
                          className="text-2xl font-bold text-slate-900 mb-2"
                          delay={500}
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

        {/* Collections This Month */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <motion.p
                  className="text-sm text-slate-600 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Collected {getPeriodLabel()}
                </motion.p>
                <div className="h-24 flex flex-col justify-between relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="h-full flex flex-col justify-between"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.financial?.total_collected || 0}
                          format="currency"
                          className="text-2xl font-bold text-slate-900 mb-2"
                          delay={600}
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

        {/* Outstanding Amount */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <motion.p
                  className="text-sm text-slate-600 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Outstanding
                </motion.p>
                <div className="h-24 flex flex-col justify-between relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="h-full flex flex-col justify-between"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.financial?.outstanding || 0}
                          format="currency"
                          className="text-2xl font-bold text-slate-900 mb-2"
                          delay={700}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Activity (Time Period Dependent) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Jobs Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              <div className="text-center p-4 bg-blue-50 rounded-lg transition-colors duration-200 hover:bg-blue-100">
                <AnimatePresence mode="wait">
                  {isLoadingStats || !jobActivity ? (
                    <motion.div
                      key="loading-created"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content-created"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <AnimatedNumber
                        value={jobActivity.jobs_created || 0}
                        className="text-2xl font-bold text-blue-600 mb-2 block"
                        delay={1100}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-sm text-slate-600">Jobs Created</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg transition-colors duration-200 hover:bg-green-100">
                <AnimatePresence mode="wait">
                  {isLoadingStats || !jobActivity ? (
                    <motion.div
                      key="loading-closed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto mb-2" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content-closed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <AnimatedNumber
                        value={jobActivity.jobs_closed || 0}
                        className="text-2xl font-bold text-green-600 mb-2 block"
                        delay={1200}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-sm text-slate-600">Jobs Closed</p>
              </div>
              <div
                className="text-center p-4 bg-amber-50 rounded-lg cursor-pointer transition-all hover:bg-amber-100 hover:shadow-md"
                onClick={() => window.location.href = createPageUrl('Jobs?unsigned_affidavit=true')}
              >
                <AnimatePresence mode="wait">
                  {isLoadingStats || !jobActivity ? (
                    <motion.div
                      key="loading-unsigned"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content-unsigned"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <AnimatedNumber
                        value={jobActivity.unsignedAffidavits || 0}
                        className="text-2xl font-bold text-amber-600 mb-2 block"
                        delay={1300}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-sm text-slate-600">Unsigned Affidavits</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Status Summary (Real-time) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Jobs Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {isLoadingJobs || !realTimeJobCounts ? (
                <motion.div
                  key="loading"
                  className="flex justify-center items-center h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LoadingSpinner />
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  className="h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                    <div
                      className="text-center p-4 bg-orange-50 rounded-lg cursor-pointer transition-all hover:bg-orange-100 hover:shadow-md"
                      onClick={() => handleJobCountClick('total_open')}
                    >
                      <AnimatedNumber
                        value={realTimeJobCounts.total_open_jobs || 0}
                        className="text-2xl font-bold text-orange-600 block mb-2"
                        delay={300}
                      />
                      <p className="text-sm text-slate-600">Total Open Jobs</p>
                    </div>
                    <div
                      className="text-center p-4 bg-red-50 rounded-lg cursor-pointer transition-all hover:bg-red-100 hover:shadow-md"
                      onClick={() => handleJobCountClick('open_rush')}
                    >
                      <AnimatedNumber
                        value={realTimeJobCounts.open_rush_jobs || 0}
                        className="text-2xl font-bold text-red-600 block mb-2"
                        delay={400}
                      />
                      <p className="text-sm text-slate-600">Open Rush Jobs</p>
                    </div>
                    <div
                      className="text-center p-4 bg-purple-50 rounded-lg cursor-pointer transition-all hover:bg-purple-100 hover:shadow-md"
                      onClick={() => handleJobCountClick('need_attention')}
                    >
                      <AnimatedNumber
                        value={realTimeJobCounts.jobs_need_attention || 0}
                        className="text-2xl font-bold text-purple-600 block mb-2"
                        delay={500}
                      />
                      <p className="text-sm text-slate-600">Need Attention</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>


      {/* Year-over-Year Comparison */}
      {(stats?.performance?.billing_change_yoy || stats?.performance?.volume_change_yoy) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Year-over-Year Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 border rounded-lg transition-shadow hover:shadow-md">
                <motion.p
                  className="text-sm text-slate-600 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                >
                  Billing Growth (YoY)
                </motion.p>
                <div className="flex items-center justify-center">
                  <AnimatedPercentage
                    value={stats.performance.billing_change_yoy}
                    delay={1500}
                  />
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg transition-shadow hover:shadow-md">
                <motion.p
                  className="text-sm text-slate-600 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  Job Volume Growth (YoY)
                </motion.p>
                <div className="flex items-center justify-center">
                  <AnimatedPercentage
                    value={stats.performance.volume_change_yoy}
                    delay={1600}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Clients and Top Servers Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Top Clients */}
        <TopClients
          clientsData={topClientsData}
          isLoading={isTopClientsLoading || isLoadingJobs}
          period={topClientsPeriod}
          onPeriodChange={setTopClientsPeriod}
          timePeriods={topDataTimePeriods}
        />

        {/* Top Servers */}
        <TopServers
          serversData={topServersData}
          isLoading={isTopServersLoading || isLoadingJobs}
          period={topServersPeriod}
          onPeriodChange={setTopServersPeriod}
          timePeriods={topDataTimePeriods}
        />
      </div>
    </div>
  );
}