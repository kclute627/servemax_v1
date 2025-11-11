
// FIREBASE TRANSITION: The data fetching logic in this component will be migrated to use the Firebase SDK.
// Each `Promise.all` call fetching data from `Job`, `Client`, `Invoice`, etc., will be replaced with
// calls to Firestore's `getDocs` on the corresponding collections. The data processing and state
// setting logic after the fetch will remain largely the same.

import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase,
  Plus
} from "lucide-react";

import BusinessStatsPanel from "../components/dashboard/BusinessStatsPanel";
// import FirebaseTest from "../components/FirebaseTest";
import TrialStatusBanner from "../components/trial/TrialStatusBanner";
import SuperAdminDashboard from "./SuperAdminDashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSuperAdmin } from "@/utils/permissions";
import { PendingShareRequests, PartnershipRequests } from "@/components/JobSharing";

export default function Dashboard() {
  const { user } = useAuth();

  // Super admin gets their own dashboard
  if (user && isSuperAdmin(user)) {
    return <SuperAdminDashboard />;
  }

  // Regular user dashboard continues below
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
            <div className="flex gap-2 flex-wrap">
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

          {/* Trial Status Banner */}
          <TrialStatusBanner
            onUpgrade={() => {
              // Navigate to settings/billing or open upgrade modal
              console.log('Navigate to upgrade');
            }}
            dismissible={true}
          />

          {/* Business Intelligence Stats */}
          <BusinessStatsPanel />

          {/* Partnership Requests */}
          {user?.company_id && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Partnership Requests</h2>
              <PartnershipRequests companyId={user.company_id} />
            </div>
          )}

          {/* Pending Job Share Requests */}
          {user?.company_id && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Pending Job Share Requests</h2>
              <PendingShareRequests companyId={user.company_id} />
            </div>
          )}

          {/* Firebase Migration Test */}
          {/* <div className="flex justify-center">
            <FirebaseTest />
          </div> */}

        </div>
      </div>
    </div>
  );
}
