import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSuperAdmin } from "@/utils/permissions";
import { Navigate } from "react-router-dom";
import UsersOverviewPanel from "../components/admin/UsersOverviewPanel";

export default function Companies() {
  const { user } = useAuth();

  // Only super admins can access this page
  if (!user || !isSuperAdmin(user)) {
    return <Navigate to="/Dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="p-6 md:p-8">
        <div className="max-w-full mx-auto">
          <UsersOverviewPanel />
        </div>
      </div>
    </div>
  );
}
