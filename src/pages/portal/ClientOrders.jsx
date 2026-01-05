import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Briefcase,
  Search,
  ChevronRight,
  MapPin,
  Calendar,
  FileText,
  Plus,
  X,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import { format } from "date-fns";
import JobDetailPanel from "@/components/portal/JobDetailPanel";

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

// Status configuration
const statusConfig = {
  pending: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  served: { label: "Served", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  failed: { label: "Failed", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" }
};

export default function ClientOrders() {
  const { companySlug, orderId } = useParams();
  const navigate = useNavigate();
  const { clientUser, portalData } = useClientAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const jobs = portalData?.jobs || [];
  const invoices = portalData?.invoices || [];
  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#0f172a';

  // Find the selected job if orderId is present
  const selectedJob = orderId ? jobs.find(j => j.id === orderId) : null;

  // If viewing a specific order, show the detail panel
  if (orderId && selectedJob) {
    return (
      <JobDetailPanel
        job={selectedJob}
        invoices={invoices}
        onClose={() => navigate(`/portal/${companySlug}/orders`)}
        primaryColor={primaryColor}
        onViewInvoice={(invoice) => navigate(`/portal/${companySlug}/invoices/${invoice.id}`)}
      />
    );
  }

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === "" ||
      (job.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.defendant_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.case_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.job_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.id?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" ||
      job.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = {
    all: jobs.length,
    active: jobs.filter(j => ['pending', 'in_progress'].includes(j.status?.toLowerCase())).length,
    completed: jobs.filter(j => ['completed', 'served'].includes(j.status?.toLowerCase())).length,
    failed: jobs.filter(j => j.status?.toLowerCase() === 'failed').length
  };

  const hasFilters = searchQuery !== "" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">
            {jobs.length} total order{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>

        {clientUser?.role !== 'viewer' && (
          <Button
            className="gap-2 text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
            onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
          >
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', count: statusCounts.all },
          { key: 'active', label: 'Active', count: statusCounts.active },
          { key: 'completed', label: 'Completed', count: statusCounts.completed },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key === 'active' ? 'pending' : filter.key === 'completed' ? 'served' : filter.key)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all
              ${(statusFilter === filter.key ||
                 (filter.key === 'active' && ['pending', 'in_progress'].includes(statusFilter)) ||
                 (filter.key === 'completed' && ['completed', 'served'].includes(statusFilter)))
                ? 'text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }
            `}
            style={(statusFilter === filter.key ||
                    (filter.key === 'active' && ['pending', 'in_progress'].includes(statusFilter)) ||
                    (filter.key === 'completed' && ['completed', 'served'].includes(statusFilter)))
              ? { backgroundColor: primaryColor }
              : {}
            }
          >
            {filter.label}
            <span className="ml-1.5 opacity-70">{filter.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search by name, case number, or order ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 bg-white border-slate-200 rounded-xl text-base"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Results */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {hasFilters ? 'No orders found' : 'No orders yet'}
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {hasFilters
              ? "Try adjusting your search or filters."
              : "Submit your first order to get started with process serving."}
          </p>
          {!hasFilters && clientUser?.role !== 'viewer' && (
            <Button
              style={{ backgroundColor: primaryColor }}
              className="text-white"
              onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit First Order
            </Button>
          )}
          {hasFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
          {filteredJobs.map((job) => {
            const status = statusConfig[job.status?.toLowerCase()] || statusConfig.pending;
            const primaryAddress = job.addresses?.find(a => a.primary) || job.addresses?.[0];

            return (
              <button
                key={job.id}
                onClick={() => navigate(`/portal/${companySlug}/orders/${job.id}`)}
                className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left group"
              >
                {/* Status Dot */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${status.dot}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-semibold text-slate-900 truncate">
                      {job.recipient_name || job.defendant_name || `Order #${job.job_number || job.id.slice(-6)}`}
                    </p>
                    {job.priority === 'rush' && (
                      <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">
                        Rush
                      </Badge>
                    )}
                    {job.priority === 'same_day' && (
                      <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                        Same Day
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    {job.case_number && (
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {job.case_number}
                      </span>
                    )}
                    {primaryAddress && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {primaryAddress.city}, {primaryAddress.state}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {safeFormatDate(job.created_at)}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <Badge className={`shrink-0 border ${status.color}`}>
                  {status.label}
                </Badge>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      {filteredJobs.length > 0 && hasFilters && (
        <p className="text-sm text-slate-500 text-center">
          Showing {filteredJobs.length} of {jobs.length} orders
        </p>
      )}
    </div>
  );
}
