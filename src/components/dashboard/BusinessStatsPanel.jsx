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
  Loader2,
  BarChart3,
  ArrowRight
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

import cellularbars from '@/images/Dashboard/cellularbars.png';

export default function BusinessStatsPanel() {
  const { user } = useAuth();
  const { jobs, clients, invoices, employees, serverPayRecords, isLoading: isLoadingJobs } = useGlobalData();

  // Debug: Check if image is imported correctly
  console.log('Cellular bars image:', cellularbars);
  const [stats, setStats] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [topServers, setTopServers] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState(null);
  const [realTimeJobCounts, setRealTimeJobCounts] = useState(null);
  const [jobActivity, setJobActivity] = useState(null);
  const [previousPeriodData, setPreviousPeriodData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
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
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

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

  // Calculate previous period data for comparison
  useEffect(() => {
    if (jobs && selectedPeriod) {
      const prevPeriod = getPreviousPeriod(selectedPeriod);
      if (!prevPeriod) {
        setPreviousPeriodData(null);
        return;
      }

      const now = new Date();
      let prevStartDate, prevEndDate;

      // Calculate previous period date range
      switch (prevPeriod) {
        case 'yesterday':
          prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'day_before_yesterday':
          prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
          prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          break;
        case 'last_month':
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'month_before_last':
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'last_year':
          prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
          prevEndDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'year_before_last':
          prevStartDate = new Date(now.getFullYear() - 2, 0, 1);
          prevEndDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
        case 'this_year':
          prevStartDate = new Date(now.getFullYear(), 0, 1);
          prevEndDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
        default:
          setPreviousPeriodData(null);
          return;
      }

      // Filter jobs for previous period
      const prevJobs = jobs.filter(job => {
        if (!job.created_at) return false;
        const createdAt = job.created_at?.toDate ? job.created_at.toDate() : new Date(job.created_at);
        if (isNaN(createdAt.getTime())) return false;
        return createdAt >= prevStartDate && createdAt < prevEndDate;
      });

      // Calculate previous period activity
      const prevActivity = {
        jobs_created: prevJobs.length,
        jobs_closed: prevJobs.filter(job => job.is_closed).length,
        unsignedAffidavits: prevJobs.filter(job =>
          (job.status === 'served' || job.status === 'non-served') &&
          !job.is_closed &&
          !job.has_signed_affidavit
        ).length
      };

      // Calculate previous period real-time counts
      const prevRealTimeCounts = StatsManager.getRealTimeJobCounts(prevJobs);

      // Calculate previous period financial data
      let prevFinancial = null;
      if (invoices) {
        const prevInvoices = invoices.filter(inv => {
          const dateField = inv.created_at || inv.invoice_date;
          if (!dateField) return false;
          const createdAt = dateField?.toDate ? dateField.toDate() : new Date(dateField);
          if (isNaN(createdAt.getTime())) return false;
          return createdAt >= prevStartDate && createdAt < prevEndDate;
        });

        const prevTotalBilled = prevInvoices.reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);
        const prevTotalCollected = prevInvoices
          .filter(inv => inv.status?.toLowerCase() === 'paid')
          .reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);

        // For outstanding, calculate from all invoices up to the end of previous period
        const allPrevInvoices = invoices.filter(inv => {
          const dateField = inv.created_at || inv.invoice_date;
          if (!dateField) return false;
          const createdAt = dateField?.toDate ? dateField.toDate() : new Date(dateField);
          if (isNaN(createdAt.getTime())) return false;
          return createdAt < prevEndDate && inv.status?.toLowerCase() !== 'cancelled';
        });
        const prevOutstandingInvoices = allPrevInvoices.filter(inv =>
          ['issued', 'sent', 'overdue', 'partial', 'partially_paid'].includes(inv.status?.toLowerCase())
        );
        const prevOutstanding = prevOutstandingInvoices.reduce((sum, inv) =>
          sum + (inv.balance_due || inv.amount_outstanding || inv.total_amount || inv.total || 0), 0
        );

        prevFinancial = {
          total_billed: prevTotalBilled,
          total_collected: prevTotalCollected,
          outstanding: prevOutstanding
        };
      }

      setPreviousPeriodData({
        jobs: {
          total: prevActivity.jobs_created
        },
        activity: prevActivity,
        realTimeCounts: prevRealTimeCounts,
        financial: prevFinancial || {
          total_billed: 0,
          total_collected: 0,
          outstanding: 0
        }
      });
    } else {
      setPreviousPeriodData(null);
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

  // Helper function to get previous period based on current period
  const getPreviousPeriod = (currentPeriod) => {
    const periodMap = {
      'today': 'yesterday',
      'yesterday': 'day_before_yesterday',
      'this_month': 'last_month',
      'last_month': 'month_before_last',
      'this_year': 'last_year',
      'last_year': 'year_before_last',
      'all_time': 'this_year'
    };
    return periodMap[currentPeriod] || null;
  };

  // Get comparison label based on period
  const getComparisonLabel = () => {
    switch (selectedPeriod) {
      case 'today':
        return 'vs yesterday';
      case 'yesterday':
        return 'vs day before';
      case 'this_month':
        return 'vs last month';
      case 'last_month':
        return 'vs month before';
      case 'this_year':
        return 'vs last year';
      case 'last_year':
        return 'vs year before';
      case 'all_time':
        return 'vs this year';
      default:
        return 'vs last period';
    }
  };

  // Get formatted comparison label for "From" text (capitalize first letter of each word)
  const getFormattedComparisonLabel = () => {
    const label = getComparisonLabel().replace('vs ', '');
    return label.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (previous === null || previous === undefined) {
      return null; // No previous data
    }

    // If previous is 0 and current is also 0, no change
    if (previous === 0 && current === 0) {
      return 0;
    }

    // If previous is 0 but current > 0, calculate based on current value
    // Use a small base value (1) to calculate percentage
    if (previous === 0 && current > 0) {
      // Show as percentage increase from 0 to current
      // Since we can't divide by 0, we'll show it as current * 100% increase
      // Or we can use a base of 1 to calculate: ((current - 1) / 1) * 100
      // But better: show actual percentage: if current is 5, show 500% (5 times increase)
      return current * 100; // If current is 5, show 500% increase
    }

    // Normal percentage calculation
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10; // Round to 1 decimal
  };

  // Calculate absolute change (current - previous)
  const calculateAbsoluteChange = (current, previous) => {
    if (previous === null || previous === undefined) {
      return null;
    }
    return current - previous;
  };

  // Format absolute change with K, M suffixes
  const formatAbsoluteChange = (value, format = 'number') => {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    const absValue = Math.abs(value);
    let formattedValue;

    if (format === 'currency') {
      if (absValue >= 1000000) {
        formattedValue = `$${(absValue / 1000000).toFixed(1)}M`;
      } else if (absValue >= 1000) {
        formattedValue = `$${(absValue / 1000).toFixed(1)}K`;
      } else {
        formattedValue = `$${absValue.toFixed(0)}`;
      }
    } else {
      if (absValue >= 1000000) {
        formattedValue = `${(absValue / 1000000).toFixed(1)}M`;
      } else if (absValue >= 1000) {
        formattedValue = `${(absValue / 1000).toFixed(1)}K`;
      } else {
        formattedValue = `${absValue.toFixed(0)}`;
      }
    }

    const sign = value >= 0 ? '+' : '-';
    return `${sign}${formattedValue}`;
  };

  // Helper function to render percentage badge (oval style)
  const renderPercentageBadge = (change) => {
    const isPositive = change !== null && change !== undefined && change > 0;
    const isNegative = change !== null && change !== undefined && change < 0;
    const isZero = change === 0;
    const hasNoComparison = change === null || change === undefined;

    let percentageDisplay = 'N/A';
    if (!hasNoComparison) {
      const roundedChange = Math.round(Math.abs(change) * 10) / 10;
      percentageDisplay = `${roundedChange}%`;
    }

    // Increase = green, Decrease = red
    const bgColor = isPositive
      ? 'bg-green-50 border-green-200'
      : isNegative
        ? 'bg-red-50 border-red-200'
        : 'bg-gray-50 border-gray-200';

    const textColor = isPositive
      ? 'text-green-600'
      : isNegative
        ? 'text-red-600'
        : 'text-gray-400';

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${bgColor}`}>
        {!hasNoComparison && !isZero && (
          isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-600" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-600" />
          )
        )}
        <span className={`text-xs font-medium ${textColor}`}>
          {percentageDisplay}
        </span>
      </div>
    );
  };

  // Helper function to render comparison indicator
  const renderComparisonIndicator = (change) => {
    const isPositive = change !== null && change !== undefined && change > 0;
    const isNegative = change !== null && change !== undefined && change < 0;
    const isZero = change === 0;
    const hasNoComparison = change === null || change === undefined;

    // Format percentage display - always show actual percentage
    let percentageDisplay = 'N/A';
    if (!hasNoComparison) {
      // Round to 1 decimal place for display
      const roundedChange = Math.round(Math.abs(change) * 10) / 10;
      percentageDisplay = `${roundedChange}%`;
    }

    return (
      <div className="flex justify-center gap-3">
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : isNegative ? (
            <TrendingDown className="w-4 h-4 text-red-600" />
          ) : isZero ? (
            <span className="w-4 h-4 flex items-center justify-center text-slate-400">—</span>
          ) : hasNoComparison ? (
            <span className="w-4 h-4 flex items-center justify-center text-slate-400">—</span>
          ) : null}
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : isZero ? 'text-slate-400' : 'text-slate-400'
            }`}>
            {percentageDisplay}
          </span>
        </div>
        <p className="text-xs text-[#1F1F21]">{getComparisonLabel()}</p>
      </div>
    );
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
        clientStats[invoice.client_id].revenue += invoice.total_amount || invoice.total || 0;
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
      <div className="inline-flex flex-col md:flex-row justify-between items-start md:items-center gap-1 mt-4 bg-[#FAFBFC] rounded-md p-1 border border-[#EFEFEF]">
        {/* Time Period Selector - Responsive */}
        <div className="flex flex-col gap-4">
          {/* Large Screen Slider */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-1">
              {timePeriods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${selectedPeriod === period.value
                    ? 'bg-white text-dark shadow-sm  rounded-lg'
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
      <div className="relative">
        {/* Mobile Carousel Container */}
        <div className="md:hidden relative">
          <div 
            className="mobile-carousel-container flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
            onScroll={(e) => {
              const scrollLeft = e.target.scrollLeft;
              const cardWidth = e.target.offsetWidth;
              const index = Math.round(scrollLeft / cardWidth);
              setCurrentCardIndex(index);
            }}
          >
            {/* Jobs This Month */}
            <Card className="min-w-full snap-center flex-shrink-0 group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
          <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
            {/* Bar Chart Icon - Top Right */}
            <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
              <img
                src={cellularbars}
                alt="cellularbars"
                className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
              />
            </div>



            <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
              {/* Title */}
              <motion.p
                className="text-sm font-normal text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                Jobs {getPeriodLabel()}
              </motion.p>

              {/* Main Value with Percentage Badge */}
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {isLoadingStats ? (
                    <motion.div
                      key="loading"
                      className="flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <LoadingSpinner size="small" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <AnimatedNumber
                        value={stats?.jobs?.total || 0}
                        className="text-3xl font-bold text-[#1F1F21]"
                        delay={150}
                      />
                      {renderPercentageBadge(
                        previousPeriodData?.jobs
                          ? calculatePercentageChange(
                            stats?.jobs?.total || 0,
                            previousPeriodData.jobs.total
                          )
                          : null
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Absolute Change */}

            </div>

            <div className='flex items-center justify-between p-2'>
              <AnimatePresence mode="wait">
                {!isLoadingStats && (
                  <motion.p
                    key="absolute-change"
                    className="text-sm text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="font-medium text-gray-700">
                      {formatAbsoluteChange(
                        calculateAbsoluteChange(
                          stats?.jobs?.total || 0,
                          previousPeriodData?.jobs?.total
                        ),
                        'number'
                      )}
                    </span>
                    {' '}From {getFormattedComparisonLabel()}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="absolute bottom-4 right-4">
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Revenue This Month */}
            <Card className="min-w-full snap-center flex-shrink-0 group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
          <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
            {/* Bar Chart Icon - Top Right */}
            <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
              <img
                src={cellularbars}
                alt="cellularbars"
                className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
              />
            </div>



            <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
              {/* Title */}
              <motion.p
                className="text-sm font-normal text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Billed {getPeriodLabel()}
              </motion.p>

              {/* Main Value with Percentage Badge */}
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {isLoadingStats ? (
                    <motion.div
                      key="loading"
                      className="flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <LoadingSpinner size="small" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <AnimatedNumber
                        value={stats?.financial?.total_billed || 0}
                        format="currency"
                        className="text-3xl font-bold text-[#1F1F21]"
                        delay={500}
                      />
                      {renderPercentageBadge(
                        previousPeriodData?.financial
                          ? calculatePercentageChange(
                            stats?.financial?.total_billed || 0,
                            previousPeriodData.financial.total_billed
                          )
                          : null
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Absolute Change */}

            </div>

            <div className='flex items-center justify-between p-2'>
              <AnimatePresence mode="wait">
                {!isLoadingStats && (
                  <motion.p
                    key="absolute-change"
                    className="text-sm text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="font-medium text-gray-700">
                      {formatAbsoluteChange(
                        calculateAbsoluteChange(
                          stats?.financial?.total_billed || 0,
                          previousPeriodData?.financial?.total_billed
                        ),
                        'currency'
                      )}
                    </span>
                    {' '}From {getFormattedComparisonLabel()}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="absolute bottom-4 right-4">
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Collections This Month */}
            <Card className="min-w-full snap-center flex-shrink-0 group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
          <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
            {/* Bar Chart Icon - Top Right */}
            <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
              <img
                src={cellularbars}
                alt="cellularbars"
                className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
              />
            </div>



            <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
              {/* Title */}
              <motion.p
                className="text-sm font-normal text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Collected {getPeriodLabel()}
              </motion.p>

              {/* Main Value with Percentage Badge */}
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {isLoadingStats ? (
                    <motion.div
                      key="loading"
                      className="flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <LoadingSpinner size="small" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <AnimatedNumber
                        value={stats?.financial?.total_collected || 0}
                        format="currency"
                        className="text-3xl font-bold text-[#1F1F21]"
                        delay={600}
                      />
                      {renderPercentageBadge(
                        previousPeriodData?.financial
                          ? calculatePercentageChange(
                            stats?.financial?.total_collected || 0,
                            previousPeriodData.financial.total_collected
                          )
                          : null
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Absolute Change */}

            </div>

            <div className='flex items-center justify-between p-2'>
              <AnimatePresence mode="wait">
                {!isLoadingStats && (
                  <motion.p
                    key="absolute-change"
                    className="text-sm text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="font-medium text-gray-700">
                      {formatAbsoluteChange(
                        calculateAbsoluteChange(
                          stats?.financial?.total_collected || 0,
                          previousPeriodData?.financial?.total_collected
                        ),
                        'currency'
                      )}
                    </span>
                    {' '}From {getFormattedComparisonLabel()}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="absolute bottom-4 right-4">
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Outstanding Amount */}
            <Card className="min-w-full snap-center flex-shrink-0 group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
          <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
            {/* Bar Chart Icon - Top Right */}
            <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
              <img
                src={cellularbars}
                alt="cellularbars"
                className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
              />
            </div>



            <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
              {/* Title */}
              <motion.p
                className="text-sm font-normal text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Outstanding
              </motion.p>

              {/* Main Value with Percentage Badge */}
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {isLoadingStats ? (
                    <motion.div
                      key="loading"
                      className="flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <LoadingSpinner size="small" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <AnimatedNumber
                        value={stats?.financial?.outstanding || 0}
                        format="currency"
                        className="text-3xl font-bold text-[#1F1F21]"
                        delay={700}
                      />
                      {renderPercentageBadge(
                        previousPeriodData?.financial
                          ? calculatePercentageChange(
                            stats?.financial?.outstanding || 0,
                            previousPeriodData.financial.outstanding
                          )
                          : null
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Absolute Change */}

            </div>

            <div className='flex items-center justify-between p-2'>
              <AnimatePresence mode="wait">
                {!isLoadingStats && (
                  <motion.p
                    key="absolute-change"
                    className="text-sm text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="font-medium text-gray-700">
                      {formatAbsoluteChange(
                        calculateAbsoluteChange(
                          stats?.financial?.outstanding || 0,
                          previousPeriodData?.financial?.outstanding
                        ),
                        'currency'
                      )}
                    </span>
                    {' '}From {getFormattedComparisonLabel()}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="absolute bottom-4 right-4">
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
          
          {/* Dots Indicator - Mobile Only */}
          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                onClick={() => {
                  const container = document.querySelector('.mobile-carousel-container');
                  if (container) {
                    container.scrollTo({
                      left: index * container.offsetWidth,
                      behavior: 'smooth'
                    });
                  }
                  setCurrentCardIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentCardIndex === index
                    ? 'bg-blue-600 w-6'
                    : 'bg-gray-300'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Grid - Hidden on Mobile */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Jobs This Month */}
          <Card className="group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
            <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
              <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
                <img
                  src={cellularbars}
                  alt="cellularbars"
                  className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
                />
              </div>
              <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
                <motion.p
                  className="text-sm font-normal text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  Jobs {getPeriodLabel()}
                </motion.p>
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.jobs?.total || 0}
                          className="text-3xl font-bold text-[#1F1F21]"
                          delay={150}
                        />
                        {renderPercentageBadge(
                          previousPeriodData?.jobs
                            ? calculatePercentageChange(
                              stats?.jobs?.total || 0,
                              previousPeriodData.jobs.total
                            )
                            : null
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className='flex items-center justify-between p-2'>
                <AnimatePresence mode="wait">
                  {!isLoadingStats && (
                    <motion.p
                      key="absolute-change"
                      className="text-sm text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="font-medium text-gray-700">
                        {formatAbsoluteChange(
                          calculateAbsoluteChange(
                            stats?.jobs?.total || 0,
                            previousPeriodData?.jobs?.total
                          ),
                          'number'
                        )}
                      </span>
                      {' '}From {getFormattedComparisonLabel()}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="absolute bottom-4 right-4">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue This Month */}
          <Card className="group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
            <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
              <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
                <img
                  src={cellularbars}
                  alt="cellularbars"
                  className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
                />
              </div>
              <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
                <motion.p
                  className="text-sm font-normal text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Billed {getPeriodLabel()}
                </motion.p>
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.financial?.total_billed || 0}
                          format="currency"
                          className="text-3xl font-bold text-[#1F1F21]"
                          delay={500}
                        />
                        {renderPercentageBadge(
                          previousPeriodData?.financial
                            ? calculatePercentageChange(
                              stats?.financial?.total_billed || 0,
                              previousPeriodData.financial.total_billed
                            )
                            : null
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className='flex items-center justify-between p-2'>
                <AnimatePresence mode="wait">
                  {!isLoadingStats && (
                    <motion.p
                      key="absolute-change"
                      className="text-sm text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="font-medium text-gray-700">
                        {formatAbsoluteChange(
                          calculateAbsoluteChange(
                            stats?.financial?.total_billed || 0,
                            previousPeriodData?.financial?.total_billed
                          ),
                          'currency'
                        )}
                      </span>
                      {' '}From {getFormattedComparisonLabel()}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="absolute bottom-4 right-4">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collections This Month */}
          <Card className="group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
            <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
              <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
                <img
                  src={cellularbars}
                  alt="cellularbars"
                  className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
                />
              </div>
              <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
                <motion.p
                  className="text-sm font-normal text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Collected {getPeriodLabel()}
                </motion.p>
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.financial?.total_collected || 0}
                          format="currency"
                          className="text-3xl font-bold text-[#1F1F21]"
                          delay={600}
                        />
                        {renderPercentageBadge(
                          previousPeriodData?.financial
                            ? calculatePercentageChange(
                              stats?.financial?.total_collected || 0,
                              previousPeriodData.financial.total_collected
                            )
                            : null
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className='flex items-center justify-between p-2'>
                <AnimatePresence mode="wait">
                  {!isLoadingStats && (
                    <motion.p
                      key="absolute-change"
                      className="text-sm text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="font-medium text-gray-700">
                        {formatAbsoluteChange(
                          calculateAbsoluteChange(
                            stats?.financial?.total_collected || 0,
                            previousPeriodData?.financial?.total_collected
                          ),
                          'currency'
                        )}
                      </span>
                      {' '}From {getFormattedComparisonLabel()}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="absolute bottom-4 right-4">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Amount */}
          <Card className="group hover:shadow-xl transition-all duration-300 border border-[#EFEFEF] bg-[#FAFBFC] overflow-hidden rounded-lg relative">
            <CardContent className="p-1 relative bg-[#FAFBFC] rounded-lg">
              <div className="absolute top-[35%] right-4 -translate-y-1/2 z-20">
                <img
                  src={cellularbars}
                  alt="cellularbars"
                  className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-[#EFEFEF] rounded-md p-2"
                />
              </div>
              <div className="flex flex-col gap-3 relative z-10 border border-[#EFEFEF] rounded-md p-2 bg-[#FDFDFD]">
                <motion.p
                  className="text-sm font-normal text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Outstanding
                </motion.p>
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    {isLoadingStats ? (
                      <motion.div
                        key="loading"
                        className="flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LoadingSpinner size="small" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                      >
                        <AnimatedNumber
                          value={stats?.financial?.outstanding || 0}
                          format="currency"
                          className="text-3xl font-bold text-[#1F1F21]"
                          delay={700}
                        />
                        {renderPercentageBadge(
                          previousPeriodData?.financial
                            ? calculatePercentageChange(
                              stats?.financial?.outstanding || 0,
                              previousPeriodData.financial.outstanding
                            )
                            : null
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className='flex items-center justify-between p-2'>
                <AnimatePresence mode="wait">
                  {!isLoadingStats && (
                    <motion.p
                      key="absolute-change"
                      className="text-sm text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="font-medium text-gray-700">
                        {formatAbsoluteChange(
                          calculateAbsoluteChange(
                            stats?.financial?.outstanding || 0,
                            previousPeriodData?.financial?.outstanding
                          ),
                          'currency'
                        )}
                      </span>
                      {' '}From {getFormattedComparisonLabel()}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="absolute bottom-4 right-4">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="col-span-1">
          {/* Top Clients */}
          <TopClients
            clientsData={topClientsData}
            isLoading={isTopClientsLoading || isLoadingJobs}
            period={topClientsPeriod}
            onPeriodChange={setTopClientsPeriod}
            timePeriods={topDataTimePeriods}
          />
        </div>
        <div className="col-span-1">
          <Card className="border border-slate-200/70 overflow-hidden rounded-lg bg-[#EFEFEF]">
            <CardHeader className="p-2">
              <div className="flex items-center justify-between bg-[#FDFDFD] rounded-lg px-2 py-6 border border-gray-200">
                <CardTitle className="text-[15px] font-[500] text[#6C6C6C]">
                  Jobs Activity
                </CardTitle>
                <img
                  src={cellularbars}
                  alt="cellularbars"
                  className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-gray-300 rounded-md p-2"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0 bg-[#FDFDFD] mx-2 rounded-lg border border-gray-200">
              <div className="relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 h-full">

                  <div className="flex items-start justify-between text-left py-6 px-4 bg-[#FDFDFD] cursor-pointer transition-colors duration-200 hover:bg-blue-100 border-b border-gray-300">
                    <div>
                      <p className="text-[15px] font-[500] text-[#1F1F21]">Jobs Created</p>
                      {renderComparisonIndicator(
                        previousPeriodData?.activity
                          ? calculatePercentageChange(
                            jobActivity.jobs_created || 0,
                            previousPeriodData.activity.jobs_created
                          )
                          : null
                      )}
                    </div>
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
                          className="flex items-center justify-between"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <AnimatedNumber
                            value={jobActivity.jobs_created || 0}
                            className="text-[32px] font-[500] text-[#1F1F21] mb-2 block"
                            delay={1100}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>


                  <div className="flex items-start justify-between text-left p-4 bg-[#FDFDFD] cursor-pointer transition-colors duration-200 hover:bg-green-100 border-b border-gray-300">
                    <div>
                      <p className="text-[15px] font-[500] text-[#1F1F21]">Jobs Closed</p>
                      {renderComparisonIndicator(
                        previousPeriodData?.activity
                          ? calculatePercentageChange(
                            jobActivity.jobs_closed || 0,
                            previousPeriodData.activity.jobs_closed
                          )
                          : null
                      )}
                    </div>
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
                          className="flex items-center justify-between"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <AnimatedNumber
                            value={jobActivity.jobs_closed || 0}
                            className="text-[32px] font-[500] text-[#1F1F21] mb-2 block"
                            delay={1200}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div
                    className="flex items-start justify-between text-left p-4 bg-[#FDFDFD] rounded-md cursor-pointer transition-colors duration-200 hover:bg-amber-100"
                    onClick={() => window.location.href = createPageUrl('Jobs?unsigned_affidavit=true')}
                  >
                    <div>
                      <p className="text-[15px] font-[500] text-[#1F1F21]">Unsigned Affidavits</p>
                      {renderComparisonIndicator(
                        previousPeriodData?.activity
                          ? calculatePercentageChange(
                            jobActivity.unsignedAffidavits || 0,
                            previousPeriodData.activity.unsignedAffidavits
                          )
                          : null
                      )}
                    </div>
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
                          className="flex items-center justify-between"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <AnimatedNumber
                            value={jobActivity.unsignedAffidavits || 0}
                            className="text-[32px] font-[500] text-[#1F1F21] mb-2 block"
                            delay={1300}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
      {/* Jobs Activity (Time Period Dependent) */}




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
                  className="text-[15px] font-[500] text-[#1F1F21] mb-2"
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
                  className="text-[15px] font-[500] text-[#1F1F21] mb-2"
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



      {/* New Row with 2 Columns (6-6) */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="col-span-1 lg:col-span-2">
          {/* Jobs Status Summary (Real-time) */}
          <Card className="border border-slate-200/70 overflow-hidden rounded-lg bg-[#EFEFEF]">
            <CardHeader className="p-2">
              <div className="flex items-center justify-between bg-[#FDFDFD] rounded-lg px-2 py-6 border border-gray-200">
                <CardTitle className="text-[15px] font-[500] text[#6C6C6C]">
                  Jobs Status Summary
                </CardTitle>
                <img
                  src={cellularbars}
                  alt="cellularbars"
                  className="w-auto h-auto max-w-[100px] max-h-[100px] object-contain border-2 border-gray-300 rounded-md p-2"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0 bg-[#FDFDFD] mx-2 rounded-lg border border-gray-200">
              <div className="relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 h-full">
                  <div
                    className="flex items-start justify-between text-left py-6 px-4 bg-[#FDFDFD] cursor-pointer transition-colors duration-200 hover:bg-orange-100 
                    border-b border-gray-300"
                    onClick={() => handleJobCountClick('total_open')}
                  >
                    <div>
                      <p className="text-[15px] font-[500] text-[#1F1F21]">Total Open Jobs</p>
                      {renderComparisonIndicator(
                        previousPeriodData?.realTimeCounts
                          ? calculatePercentageChange(
                            realTimeJobCounts.total_open_jobs || 0,
                            previousPeriodData.realTimeCounts.total_open_jobs
                          )
                          : null
                      )}
                    </div>
                    <AnimatePresence mode="wait">
                      {isLoadingJobs || !realTimeJobCounts ? (
                        <motion.div
                          key="loading-open"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto mb-2" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content-open"
                          className="flex items-center justify-between"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <AnimatedNumber
                            value={realTimeJobCounts.total_open_jobs || 0}
                            className="text-[32px] font-[500] text-[#1F1F21] mb-2 block"
                            delay={300}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div
                    className=" flex items-start justify-between text-left p-4 bg-[#FDFDFD] cursor-pointer transition-colors duration-200 hover:bg-red-100
                    border-b border-gray-300"
                    onClick={() => handleJobCountClick('open_rush')}
                  >
                    <div>
                      <p className="text-[15px] font-[500] text-[#1F1F21]">Open Rush Jobs</p>
                      {renderComparisonIndicator(
                        previousPeriodData?.realTimeCounts
                          ? calculatePercentageChange(
                            realTimeJobCounts.open_rush_jobs || 0,
                            previousPeriodData.realTimeCounts.open_rush_jobs
                          )
                          : null
                      )}
                    </div>
                    <AnimatePresence mode="wait">
                      {isLoadingJobs || !realTimeJobCounts ? (
                        <motion.div
                          key="loading-rush"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto mb-2" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content-rush"
                          className="flex items-center justify-between"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <AnimatedNumber
                            value={realTimeJobCounts.open_rush_jobs || 0}
                            className="text-[32px] font-[500] text-[#1F1F21] mb-2 block"
                            delay={400}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div
                    className=" flex items-start justify-between text-left p-4 bg-[#FDFDFD] rounded-md cursor-pointer transition-colors duration-200 hover:bg-purple-100"
                    onClick={() => handleJobCountClick('need_attention')}
                  >
                    <div>
                      <p className="text-[15px] font-[500] text-[#1F1F21]">Need Attention</p>
                      {renderComparisonIndicator(
                        previousPeriodData?.realTimeCounts
                          ? calculatePercentageChange(
                            realTimeJobCounts.jobs_need_attention || 0,
                            previousPeriodData.realTimeCounts.jobs_need_attention
                          )
                          : null
                      )}
                    </div>
                    <AnimatePresence mode="wait">
                      {isLoadingJobs || !realTimeJobCounts ? (
                        <motion.div
                          key="loading-attention"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content-attention"
                          className="flex items-center justify-between"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <AnimatedNumber
                            value={realTimeJobCounts.jobs_need_attention || 0}
                            className="text-[32px] font-[500] text-[#1F1F21] mb-2 block"
                            delay={500}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-1 lg:col-span-3">
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

    </div>
  );
}