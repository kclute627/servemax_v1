
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
import NotificationCenter from "../components/dashboard/NotificationCenter";
// import FirebaseTest from "../components/FirebaseTest";
// import TrialStatusBanner from "../components/trial/TrialStatusBanner"; // Disabled for now - will work on subscriptions later
import SuperAdminDashboard from "./SuperAdminDashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSuperAdmin } from "@/utils/permissions";

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white rounded-xl p-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Dashboard</h1>
              <p className="text-slate-600 text-sm">Welcome back! Here's what's happening with your process serving operations.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link to={createPageUrl("Jobs")}>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-3 border-2 border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 shadow-sm hover:shadow-md transition-all duration-300 font-semibold rounded-full"
                >
                  <Briefcase className="w-5 h-5" />
                  View All Jobs
                </Button>
              </Link>
              <Link to={createPageUrl("CreateJob")}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-3 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-full"
                >
                  <Plus className="w-5 h-5" />
                  New Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Trial Status Banner - Disabled for now, will work on subscriptions later */}
          {/* <TrialStatusBanner
            onUpgrade={() => {
              // Navigate to settings/billing or open upgrade modal
              console.log('Navigate to upgrade');
            }}
            dismissible={true}
          /> */}

          {/* Notification Center - Partnership & Job Share Requests */}
          {user?.company_id && (
            <NotificationCenter companyId={user.company_id} />
          )}

          {/* Business Intelligence Stats */}
          <BusinessStatsPanel />

          {/* Firebase Migration Test */}
          {/* <div className="flex justify-center">
            <FirebaseTest />
          </div> */}

        </div>
      </div>
    </div>
  );
}
