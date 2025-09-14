
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  Users,
  UserPlus,
  FileText,
  Calendar,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickActions({ stats }) {
  const actions = [
    {
      title: "Create New Job",
      description: "Add a new process serving job",
      icon: Plus,
      href: createPageUrl("CreateJob"), // Changed from "Jobs" to "CreateJob"
      color: "bg-slate-900 hover:bg-slate-800 text-white"
    },
    {
      title: "Add Client",
      description: "Register a new client",
      icon: UserPlus,
      href: createPageUrl("Clients"),
      color: "bg-blue-600 hover:bg-blue-700 text-white"
    },
    {
      title: "View Reports",
      description: "Analytics and insights",
      icon: TrendingUp,
      href: createPageUrl("Dashboard"),
      color: "bg-green-600 hover:bg-green-700 text-white"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-bold text-slate-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {actions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Button className={`w-full justify-start gap-3 h-auto p-4 ${action.color}`}>
                <action.icon className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-semibold">{action.title}</p>
                  <p className="text-xs opacity-90">{action.description}</p>
                </div>
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Alerts Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-bold text-slate-900">Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {stats.overdueJobs > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-red-900">Overdue Jobs</p>
                    <p className="text-sm text-red-700">
                      {stats.overdueJobs} job{stats.overdueJobs > 1 ? 's' : ''} past due date
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {stats.pendingJobs > 5 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-amber-900">High Pending Volume</p>
                    <p className="text-sm text-amber-700">
                      {stats.pendingJobs} jobs awaiting assignment
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.overdueJobs === 0 && stats.pendingJobs <= 5 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-green-900">All Clear</p>
                    <p className="text-sm text-green-700">
                      No urgent issues requiring attention
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
