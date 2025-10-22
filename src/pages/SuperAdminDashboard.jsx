import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import PlatformStatsPanel from "../components/admin/PlatformStatsPanel";
import QuickActionsPanel from "../components/admin/QuickActionsPanel";
import ActivityFeedPanel from "../components/admin/ActivityFeedPanel";
import GrowthChartPanel from "../components/admin/GrowthChartPanel";
import RevenueChartPanel from "../components/admin/RevenueChartPanel";

export default function SuperAdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="p-6 md:p-8">
        <div className="max-w-full mx-auto space-y-8">
          {/* Header with Admin Badge */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900">Platform Admin</h1>
              </div>
              <p className="text-slate-600 text-lg">
                System-wide metrics and administration for ServerMax
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("Settings")}>
                <Button variant="outline" size="lg" className="gap-3 border-2">
                  <Settings className="w-5 h-5" />
                  System Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Platform-wide Stats */}
          <PlatformStatsPanel />

          {/* Quick Actions */}
          <QuickActionsPanel />

          {/* Two Column Layout for Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* User Growth Chart */}
            <GrowthChartPanel />

            {/* Revenue Growth Chart */}
            <RevenueChartPanel />
          </div>

          {/* Activity Feed */}
          <ActivityFeedPanel />
        </div>
      </div>
    </div>
  );
}
