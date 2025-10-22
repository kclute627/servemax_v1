import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSuperAdmin } from "@/utils/permissions";
import { Navigate } from "react-router-dom";
import RevenueMetricsPanel from "../components/admin/RevenueMetricsPanel";
import SubscriberMetricsPanel from "../components/admin/SubscriberMetricsPanel";

export default function Subscriptions() {
  const { user } = useAuth();

  // Only super admins can access this page
  if (!user || !isSuperAdmin(user)) {
    return <Navigate to="/Dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="p-6 md:p-8">
        <div className="max-w-full mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Subscriptions & Revenue</h1>
            <p className="text-slate-600 text-lg">
              Platform-wide subscription analytics and revenue metrics
            </p>
          </div>

          {/* Revenue Metrics */}
          <RevenueMetricsPanel />

          {/* Subscriber Details */}
          <SubscriberMetricsPanel />
        </div>
      </div>
    </div>
  );
}
