
import React, { useState, useEffect, useCallback } from "react";
import { Job, Client, Invoice, Employee } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  FileText,
  Receipt,
  CreditCard,
  Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  startOfDay, 
  subDays, 
  startOfMonth, 
  subMonths, 
  startOfQuarter, 
  startOfYear,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  isWithinInterval,
} from "date-fns";

import TopClients from "../components/dashboard/TopClients";
import TopServers from "../components/dashboard/TopServers"; // New import

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    overdueJobs: 0,
    openJobs: 0,
    pastDueJobs: 0,
    rushJobsOpen: 0
  });
  
  const [invoiceStats, setInvoiceStats] = useState({
    totalInvoices: 0,
    totalPaid: 0,
    pastDueInvoices: 0
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);

  // State for Top Clients
  const [topClientsData, setTopClientsData] = useState([]);
  const [isTopClientsLoading, setIsTopClientsLoading] = useState(true);
  const [topClientsPeriod, setTopClientsPeriod] = useState('this_month');

  // New state for Top Servers
  const [topServersData, setTopServersData] = useState([]);
  const [isTopServersLoading, setIsTopServersLoading] = useState(true);
  const [topServersPeriod, setTopServersPeriod] = useState('this_month');

  // Time period options for Invoices
  const timePeriods = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'all_time', label: 'All Time' }
  ];

  // Time period options for Top Clients and Top Servers
  const topDataTimePeriods = [
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'all_time', label: 'All Time' },
  ];

  const getDateRange = (period) => {
    const now = new Date();
    
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'last_7_days':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
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

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobs, clients, invoices] = await Promise.all([
        Job.list("-created_date", 500), // Increased limit for better stats
        Client.list(),
        Invoice.list("-created_date", 500) // Increased limit for better stats
      ]);

      // Calculate job stats
      const pendingJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'assigned').length;
      const completedJobs = jobs.filter((j) => j.status === 'served').length;
      const activeClients = clients.filter((c) => c.status === 'active').length;
      const openJobs = jobs.filter((j) => !j.is_closed).length;

      // Calculate rush jobs that are still open
      const rushJobsOpen = jobs.filter((j) => !j.is_closed && j.priority === 'rush').length;

      // Calculate overdue/past due jobs
      const today = new Date();
      const pastDueJobs = jobs.filter((j) =>
        j.due_date &&
        new Date(j.due_date) < today &&
        j.status !== 'served' &&
        j.status !== 'cancelled' &&
        !j.is_closed
      ).length;

      // Calculate monthly revenue from paid invoices
      const currentMonth = new Date().getMonth();
      const monthlyRevenue = invoices
        .filter((inv) => inv.status === 'paid' && inv.payment_date && new Date(inv.payment_date).getMonth() === currentMonth)
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      setStats({
        totalJobs: jobs.length,
        pendingJobs,
        completedJobs,
        activeClients,
        monthlyRevenue,
        overdueJobs: pastDueJobs, // Legacy name
        openJobs,
        pastDueJobs,
        rushJobsOpen // Added for new card
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  }, []);

  const loadInvoiceStats = useCallback(async () => {
    setIsInvoiceLoading(true);
    try {
      const invoices = await Invoice.list("-created_date");
      const dateRange = getDateRange(selectedPeriod);

      let filteredInvoices = invoices;
      
      if (dateRange) {
        filteredInvoices = invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.invoice_date);
          return isWithinInterval(invoiceDate, dateRange);
        });
      }

      const totalInvoices = filteredInvoices.length;
      const totalPaid = filteredInvoices.filter(inv => inv.status === 'paid').length;
      const pastDueInvoices = filteredInvoices.filter(inv => {
        if (inv.status === 'paid') return false;
        const dueDate = new Date(inv.due_date);
        return dueDate < new Date();
      }).length;

      setInvoiceStats({
        totalInvoices,
        totalPaid,
        pastDueInvoices
      });
    } catch (error) {
      console.error("Error loading invoice stats:", error);
    }
    setIsInvoiceLoading(false);
  }, [selectedPeriod]);

  // New function to load Top Clients data
  const loadTopClientsData = useCallback(async () => {
    setIsTopClientsLoading(true);
    try {
        const [allJobs, allInvoices, allClients] = await Promise.all([
            Job.list(),
            Invoice.list(),
            Client.list()
        ]);
        
        const dateRange = getDateRange(topClientsPeriod);

        const clientStats = allClients.reduce((acc, client) => {
            acc[client.id] = { client, jobs: 0, revenue: 0 };
            return acc;
        }, {});

        // Calculate jobs
        const jobsToConsider = dateRange 
            ? allJobs.filter(job => job.created_date && isWithinInterval(new Date(job.created_date), dateRange))
            : allJobs;

        jobsToConsider.forEach(job => {
            if (job.client_id && clientStats[job.client_id]) {
                clientStats[job.client_id].jobs += 1;
            }
        });

        // Calculate revenue from paid invoices
        const invoicesToConsider = dateRange
            ? allInvoices.filter(inv => inv.status === 'paid' && inv.payment_date && isWithinInterval(new Date(inv.payment_date), dateRange))
            : allInvoices.filter(inv => inv.status === 'paid');

        invoicesToConsider.forEach(invoice => {
            if (invoice.client_id && clientStats[invoice.client_id]) {
                clientStats[invoice.client_id].revenue += invoice.total_amount || 0;
            }
        });

        // Filter out clients with no activity and sort
        const statsArray = Object.values(clientStats)
                                .filter(item => item.jobs > 0 || item.revenue > 0)
                                .sort((a, b) => b.revenue - a.revenue || b.jobs - a.jobs); // Sort by revenue desc, then jobs desc
                                
        setTopClientsData(statsArray);

    } catch (error) {
        console.error("Error loading top clients data:", error);
    }
    setIsTopClientsLoading(false);
  }, [topClientsPeriod]);

  // New function to load Top Servers data
  const loadTopServersData = useCallback(async () => {
    setIsTopServersLoading(true);
    try {
        const [allJobs, allEmployees] = await Promise.all([
            Job.list(), // This gets ALL jobs (open and closed)
            Employee.list()
        ]);
        
        const dateRange = getDateRange(topServersPeriod);

        // Filter employees to only process servers
        const processServers = allEmployees.filter(emp => emp.role === 'process_server');

        const serverStats = processServers.reduce((acc, server) => {
            acc[server.id] = { 
                server, 
                jobs: 0, 
                completedJobs: 0,
                rating: 0
            };
            return acc;
        }, {});

        // Filter jobs by date range if specified
        // NOTE: This includes ALL jobs (both open and closed) for complete server performance history
        const jobsToConsider = dateRange 
            ? allJobs.filter(job => job.created_date && isWithinInterval(new Date(job.created_date), dateRange))
            : allJobs;

        // Calculate job counts and completion rates for each server
        // Counting ALL assigned jobs regardless of open/closed status
        jobsToConsider.forEach(job => {
            if (job.assigned_server_id && serverStats[job.assigned_server_id]) {
                serverStats[job.assigned_server_id].jobs += 1;
                if (job.status === 'served') {
                    serverStats[job.assigned_server_id].completedJobs += 1;
                }
            }
        });

        // Calculate ratings based on completion rate and job volume
        const statsArray = Object.values(serverStats).map(stat => {
            // A server must have jobs to have a rating.
            if (stat.jobs === 0) {
              return { ...stat, rating: 0 };
            }

            const completionRate = stat.completedJobs / stat.jobs;
            
            // Rating formula: 
            // - Up to 4 stars for completion rate.
            // - Up to 1 star for job volume (maxes out at 20 completed jobs).
            const completionBonus = completionRate * 4;
            const volumeBonus = Math.min(stat.completedJobs / 20, 1);
            const rating = completionBonus + volumeBonus;
            
            return {
                ...stat,
                rating: Number(rating.toFixed(1))
            };
        }).sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs); // Sort by rating desc, then completed jobs desc
        
        setTopServersData(statsArray);

    } catch (error) {
        console.error("Error loading top servers data:", error);
    }
    setIsTopServersLoading(false);
  }, [topServersPeriod]);

  // Existing useEffect hooks
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadInvoiceStats();
  }, [loadInvoiceStats]);

  useEffect(() => {
    loadTopClientsData();
  }, [loadTopClientsData]);

  // New useEffect for Top Servers
  useEffect(() => {
    loadTopServersData();
  }, [loadTopServersData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 md:p-8">
        <div className="max-w-full mx-auto space-y-8">
          {/* Header with Action Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Dashboard</h1>
              <p className="text-slate-600 text-lg">Welcome back! Here's what's happening with your process serving operations.</p>
            </div>
            <div className="flex gap-4">
              <Link to={createPageUrl("Jobs")}>
                <Button variant="outline" size="lg" className="gap-3 border-2 hover:border-slate-300 hover:bg-slate-50">
                  <Briefcase className="w-5 h-5" />
                  View All Jobs
                </Button>
              </Link>
              <Link to={createPageUrl("CreateJob")}>
                <Button size="lg" className="bg-slate-800 hover:bg-slate-900 gap-3 shadow-lg">
                  <Plus className="w-5 h-5" />
                  New Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Job Overview Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Job Overview</h2>
                <p className="text-slate-600">Current job status and urgent items</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Open Jobs Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-xl transition-all duration-300 border border-slate-200">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-medium mb-2">Total Open Jobs</p>
                      {isLoading ? (
                        <Skeleton className="h-12 w-24 bg-slate-200" />
                      ) : (
                        <p className="text-4xl font-bold mb-4 text-slate-800">{stats.openJobs}</p>
                      )}
                      <Link to={`${createPageUrl("Jobs")}?status=open`}>
                        <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100 hover:text-slate-800 gap-2 p-0 h-auto">
                          View All Open Jobs <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Clock className="w-8 h-8 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Rush Jobs Open Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50 hover:shadow-xl transition-all duration-300 border border-purple-100">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-700 text-sm font-medium mb-2">Total Rush Jobs Open</p>
                      {isLoading ? (
                        <Skeleton className="h-12 w-24 bg-purple-200" />
                      ) : (
                        <p className="text-4xl font-bold mb-4 text-purple-800">{stats.rushJobsOpen}</p>
                      )}
                      <Link to={`${createPageUrl("Jobs")}?status=open&priority=rush`}>
                        <Button variant="ghost" size="sm" className="text-purple-700 hover:bg-purple-100 hover:text-purple-800 gap-2 p-0 h-auto">
                          View Rush Jobs <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                      <Clock className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Past Due Jobs Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-xl transition-all duration-300 border border-orange-100">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-700 text-sm font-medium mb-2">Total Past Due Jobs</p>
                      {isLoading ? (
                        <Skeleton className="h-12 w-24 bg-orange-200" />
                      ) : (
                        <p className="text-4xl font-bold mb-4 text-orange-800">{stats.pastDueJobs}</p>
                      )}
                      <Link to={`${createPageUrl("Jobs")}?filter=overdue`}>
                        <Button variant="ghost" size="sm" className="text-orange-700 hover:bg-orange-100 hover:text-orange-800 gap-2 p-0 h-auto">
                          View Past Due Jobs <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Invoice Overview Section */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Invoice Overview</h2>
                  <p className="text-slate-600">Financial metrics and billing status</p>
                </div>
              </div>
              
              {/* Time Period Selector */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-500" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="flex h-10 w-48 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  {timePeriods.map(period => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Invoices Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-xl transition-all duration-300 border border-slate-200">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-medium mb-2">Total Invoices</p>
                      {isInvoiceLoading ? (
                        <Skeleton className="h-12 w-16 bg-slate-200" />
                      ) : (
                        <p className="text-4xl font-bold mb-2 text-slate-800">{invoiceStats.totalInvoices}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {timePeriods.find(p => p.value === selectedPeriod)?.label}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Paid Invoices Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-xl transition-all duration-300 border border-emerald-100">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-700 text-sm font-medium mb-2">Total Paid</p>
                      {isInvoiceLoading ? (
                        <Skeleton className="h-12 w-16 bg-emerald-200" />
                      ) : (
                        <p className="text-4xl font-bold mb-2 text-emerald-800">{invoiceStats.totalPaid}</p>
                      )}
                      <p className="text-xs text-emerald-600">
                        {timePeriods.find(p => p.value === selectedPeriod)?.label}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Past Due Invoices Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50 hover:shadow-xl transition-all duration-300 border border-amber-100">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-700 text-sm font-medium mb-2">Past Due Invoices</p>
                      {isInvoiceLoading ? (
                        <Skeleton className="h-12 w-16 bg-amber-200" />
                      ) : (
                        <p className="text-4xl font-bold mb-2 text-amber-800">{invoiceStats.pastDueInvoices}</p>
                      )}
                      <p className="text-xs text-amber-600">
                        {timePeriods.find(p => p.value === selectedPeriod)?.label}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Top Clients and Top Servers Section */}
          <div className="grid grid-cols-1 gap-8">
            {/* Top Clients */}
            <TopClients
              clientsData={topClientsData}
              isLoading={isTopClientsLoading}
              period={topClientsPeriod}
              onPeriodChange={setTopClientsPeriod}
              timePeriods={topDataTimePeriods}
            />

            {/* Top Servers */}
            <TopServers
              serversData={topServersData}
              isLoading={isTopServersLoading}
              period={topServersPeriod}
              onPeriodChange={setTopServersPeriod}
              timePeriods={topDataTimePeriods}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
