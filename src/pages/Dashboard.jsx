
// FIREBASE TRANSITION: The data fetching logic in this component will be migrated to use the Firebase SDK.
// Each `Promise.all` call fetching data from `Job`, `Client`, `Invoice`, etc., will be replaced with
// calls to Firestore's `getDocs` on the corresponding collections. The data processing and state
// setting logic after the fetch will remain largely the same.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase,
  Plus,
  Calendar
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

  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const timePeriods = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'all_time', label: 'All Time' }
  ];

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6  rounded-xl">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Dashboard</h1>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 my-4 bg-white rounded-full p-2">
                {/* Time Period Selector - Responsive */}
                <div className="flex flex-col gap-4">
                  {/* Large Screen Slider */}
                  <div className="hidden lg:block">
                    <div className="flex items-center gap-1">
                      {timePeriods.map((period) => (
                        <button
                          key={period.value}
                          onClick={() => setSelectedPeriod(period.value)}
                          className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${selectedPeriod === period.value
                            ? 'bg-[#12872F] text-white shadow-sm ring-1 ring-slate-200 rounded-full'
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
            </div>




            <div className="flex gap-2">
              <Link to={createPageUrl("Jobs")}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-3 border-2 border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 shadow-sm hover:shadow-md transition-all duration-300 font-semibold rounded-md"
                >
                  <Briefcase className="w-5 h-5" />
                  View All Jobs
                </Button>
              </Link>
              <Link to={createPageUrl("CreateJob")}>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-800 text-white gap-3 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-md"
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
          <BusinessStatsPanel selectedPeriod={selectedPeriod} />

          {/* Firebase Migration Test */}
          {/* <div className="flex justify-center">
            <FirebaseTest />
          </div> */}

        </div>
      </div>
    </div>
  );
}
