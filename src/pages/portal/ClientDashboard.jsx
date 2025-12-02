import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Briefcase,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  FileText,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import { format } from "date-fns";

const getStatusColor = (status) => {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    served: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-800"
  };
  return statusColors[status?.toLowerCase()] || "bg-slate-100 text-slate-800";
};

const getInvoiceStatusColor = (status) => {
  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    sent: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800"
  };
  return statusColors[status?.toLowerCase()] || "bg-slate-100 text-slate-800";
};

export default function ClientDashboard() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { clientUser, portalData } = useClientAuth();

  const jobs = portalData?.jobs || [];
  const invoices = portalData?.invoices || [];
  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#1e40af';

  // Calculate stats
  const activeJobs = jobs.filter(j => !['completed', 'served', 'cancelled'].includes(j.status?.toLowerCase())).length;
  const completedJobs = jobs.filter(j => ['completed', 'served'].includes(j.status?.toLowerCase())).length;
  const pendingInvoices = invoices.filter(i => ['sent', 'pending'].includes(i.status?.toLowerCase()));
  const totalOwed = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Recent items
  const recentJobs = jobs.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {clientUser?.name?.split(' ')[0] || 'Client'}
        </h1>
        <p className="text-slate-500">Here's an overview of your account activity.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                <Clock className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeJobs}</p>
                <p className="text-sm text-slate-500">Active Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedJobs}</p>
                <p className="text-sm text-slate-500">Completed Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50">
                <Receipt className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pendingInvoices.length}</p>
                <p className="text-sm text-slate-500">Pending Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  ${totalOwed.toFixed(2)}
                </p>
                <p className="text-sm text-slate-500">Amount Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Jobs</CardTitle>
                <CardDescription>Your latest service requests</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/portal/${companySlug}/jobs`)}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No jobs yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/portal/${companySlug}/jobs/${job.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {job.defendant_name || job.case_number || `Job #${job.id.slice(-6)}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {job.created_at
                          ? format(new Date(job.created_at.seconds ? job.created_at.seconds * 1000 : job.created_at), 'MMM d, yyyy')
                          : 'No date'}
                      </p>
                    </div>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status?.replace(/_/g, ' ') || 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Invoices</CardTitle>
                <CardDescription>Your billing history</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/portal/${companySlug}/invoices`)}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No invoices yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/portal/${companySlug}/invoices/${invoice.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">
                        Invoice #{invoice.invoice_number || invoice.id.slice(-6)}
                      </p>
                      <p className="text-sm text-slate-500">
                        ${(invoice.total || 0).toFixed(2)}
                      </p>
                    </div>
                    <Badge className={getInvoiceStatusColor(invoice.status)}>
                      {invoice.status || 'Draft'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {clientUser?.role !== 'viewer' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate(`/portal/${companySlug}/jobs/new`)}
                style={{ backgroundColor: primaryColor }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Submit New Job
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
