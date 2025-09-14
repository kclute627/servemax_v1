
import React, { useState, useEffect, useCallback } from "react";
import { Job, Client, Employee, Invoice } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight } from
"lucide-react";
import { Badge } from "@/components/ui/badge";

import StatsGrid from "../components/dashboard/StatsGrid";
import RecentJobs from "../components/dashboard/RecentJobs";
import QuickActions from "../components/dashboard/QuickActions";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    overdueJobs: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobs, clients, invoices] = await Promise.all([
      Job.list("-created_date", 50),
      Client.list(),
      Invoice.list("-created_date", 20)]
      );

      // Calculate stats
      const pendingJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'assigned').length;
      const completedJobs = jobs.filter((j) => j.status === 'served').length;
      const activeClients = clients.filter((c) => c.status === 'active').length;

      // Calculate monthly revenue from paid invoices
      const currentMonth = new Date().getMonth();
      const monthlyRevenue = invoices.
      filter((inv) => inv.status === 'paid' && new Date(inv.payment_date).getMonth() === currentMonth).
      reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      // Calculate overdue jobs
      const today = new Date();
      const overdueJobs = jobs.filter((j) =>
      j.due_date &&
      new Date(j.due_date) < today &&
      j.status !== 'served' &&
      j.status !== 'cancelled'
      ).length;

      setStats({
        totalJobs: jobs.length,
        pendingJobs,
        completedJobs,
        activeClients,
        monthlyRevenue,
        overdueJobs
      });

      setRecentJobs(jobs.slice(0, 6));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  }, []); // Empty dependency array makes this function stable

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // Add stable function as dependency

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
              <p className="text-slate-600">Overview of your process serving operations</p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl("Jobs")}>
                <Button variant="outline" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  View All Jobs
                </Button>
              </Link>
              <Link to={createPageUrl("CreateJob")}>
                <Button className="bg-slate-900 hover:bg-slate-800 gap-2">
                  <Plus className="w-4 h-4" />
                  New Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <StatsGrid stats={stats} isLoading={isLoading} />

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            {/* Recent Jobs - Takes 2 columns */}
            <div className="lg:col-span-2">
              <RecentJobs jobs={recentJobs} isLoading={isLoading} />
            </div>

            {/* Quick Actions - Takes 1 column */}
            <div>
              <QuickActions stats={stats} />
            </div>
          </div>
        </div>
      </div>
    </div>);

}
