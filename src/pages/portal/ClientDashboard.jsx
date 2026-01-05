import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Briefcase,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Calendar,
  FileText,
  CreditCard,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import { format } from "date-fns";

// Safe date formatter
const safeFormatDate = (timestamp, formatStr = 'MMM d, yyyy') => {
  if (!timestamp) return '';
  try {
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return '';
    return format(date, formatStr);
  } catch {
    return '';
  }
};

// Time-based greeting
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Status configuration
const statusConfig = {
  pending: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  served: { label: "Served", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", color: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-200" }
};

const invoiceStatusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", color: "bg-blue-50 text-blue-700" },
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "Overdue", color: "bg-rose-50 text-rose-700" }
};

export default function ClientDashboard() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { clientUser, portalData } = useClientAuth();

  const jobs = portalData?.jobs || [];
  const invoices = portalData?.invoices || [];
  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#0f172a';

  // Calculate stats
  const activeJobs = jobs.filter(j => !['completed', 'served', 'cancelled'].includes(j.status?.toLowerCase())).length;
  const completedJobs = jobs.filter(j => ['completed', 'served'].includes(j.status?.toLowerCase())).length;
  const pendingInvoices = invoices.filter(i => ['sent', 'pending', 'overdue'].includes(i.status?.toLowerCase()));
  const totalOwed = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Recent items
  const recentJobs = jobs.slice(0, 4);
  const recentInvoices = invoices.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            {getTimeBasedGreeting()}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {clientUser?.name?.split(' ')[0] || 'Welcome'}
          </h1>
        </div>

        {clientUser?.role !== 'viewer' && (
          <Button
            size="lg"
            className="gap-2 text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
            onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
          >
            <Plus className="w-5 h-5" />
            New Order
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Orders */}
        <button
          onClick={() => navigate(`/portal/${companySlug}/orders`)}
          className="bg-white rounded-2xl p-5 text-left hover:shadow-md transition-shadow border border-slate-100 group"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <Clock className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{activeJobs}</p>
          <p className="text-sm text-slate-500">Active Orders</p>
        </button>

        {/* Completed */}
        <button
          onClick={() => navigate(`/portal/${companySlug}/orders`)}
          className="bg-white rounded-2xl p-5 text-left hover:shadow-md transition-shadow border border-slate-100 group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{completedJobs}</p>
          <p className="text-sm text-slate-500">Completed</p>
        </button>

        {/* Pending Invoices */}
        <button
          onClick={() => navigate(`/portal/${companySlug}/invoices`)}
          className="bg-white rounded-2xl p-5 text-left hover:shadow-md transition-shadow border border-slate-100 group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{pendingInvoices.length}</p>
          <p className="text-sm text-slate-500">Open Invoices</p>
        </button>

        {/* Amount Due */}
        <button
          onClick={() => navigate(`/portal/${companySlug}/invoices`)}
          className={`rounded-2xl p-5 text-left hover:shadow-md transition-shadow group ${
            totalOwed > 0
              ? 'bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100'
              : 'bg-white border border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              totalOwed > 0 ? 'bg-rose-100' : 'bg-emerald-50'
            }`}>
              <CreditCard className={`w-5 h-5 ${totalOwed > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className={`text-3xl font-bold mb-1 ${totalOwed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-slate-500">Amount Due</p>
        </button>
      </div>

      {/* Outstanding Balance Alert */}
      {totalOwed > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })} outstanding
                </p>
                <p className="text-sm text-amber-700">
                  You have {pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''} awaiting payment
                </p>
              </div>
            </div>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              onClick={() => navigate(`/portal/${companySlug}/invoices`)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-slate-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900 gap-1 -mr-2"
              onClick={() => navigate(`/portal/${companySlug}/orders`)}
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {recentJobs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-slate-300" />
              </div>
              <p className="font-medium text-slate-900 mb-1">No orders yet</p>
              <p className="text-sm text-slate-500 mb-4">Submit your first order to get started</p>
              {clientUser?.role !== 'viewer' && (
                <Button
                  size="sm"
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                  onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Order
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentJobs.map((job) => {
                const status = statusConfig[job.status?.toLowerCase()] || statusConfig.pending;
                return (
                  <button
                    key={job.id}
                    onClick={() => navigate(`/portal/${companySlug}/orders/${job.id}`)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate mb-1">
                        {job.recipient_name || job.defendant_name || `Order #${job.job_number || job.id.slice(-6)}`}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {job.case_number && (
                          <span className="flex items-center gap-1 truncate">
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            {job.case_number}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {safeFormatDate(job.created_at)}
                        </span>
                      </div>
                    </div>
                    <Badge className={`shrink-0 border ${status.color}`}>
                      {status.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-slate-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900 gap-1 -mr-2"
              onClick={() => navigate(`/portal/${companySlug}/invoices`)}
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-slate-300" />
              </div>
              <p className="font-medium text-slate-900 mb-1">No invoices yet</p>
              <p className="text-sm text-slate-500">Invoices will appear here once generated</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInvoices.map((invoice) => {
                const status = invoiceStatusConfig[invoice.status?.toLowerCase()] || invoiceStatusConfig.draft;
                const isPending = ['sent', 'pending', 'overdue'].includes(invoice.status?.toLowerCase());

                return (
                  <button
                    key={invoice.id}
                    onClick={() => navigate(`/portal/${companySlug}/invoices/${invoice.id}`)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 mb-1">
                        Invoice #{invoice.invoice_number || invoice.id.slice(-6)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {safeFormatDate(invoice.created_at || invoice.invoice_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-slate-900 tabular-nums">
                        ${(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge className={`mt-1 ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Tip */}
      {jobs.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="font-medium text-slate-900 mb-1">Track your orders</p>
              <p className="text-sm text-slate-600">
                Click on any order to view detailed status updates, service attempts, and related documents.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
