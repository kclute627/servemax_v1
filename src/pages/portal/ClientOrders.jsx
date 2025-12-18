import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Briefcase,
  Search,
  Filter,
  ChevronRight,
  MapPin,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// Safe date formatter that handles Firestore Timestamps and various formats
const safeFormatDate = (timestamp, formatStr = 'MMM d, yyyy') => {
  if (!timestamp) return 'No date';
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
    if (isNaN(date.getTime())) return 'No date';
    return format(date, formatStr);
  } catch {
    return 'No date';
  }
};

const getStatusColor = (status) => {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    pending_review: "bg-orange-100 text-orange-800",
    in_progress: "bg-blue-100 text-blue-800",
    out_for_service: "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    served: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-800"
  };
  return statusColors[status?.toLowerCase()] || "bg-slate-100 text-slate-800";
};

export default function ClientOrders() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { clientUser, portalData } = useClientAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const jobs = portalData?.jobs || [];
  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#1e40af';

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === "" ||
      (job.defendant_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.case_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.id?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" ||
      job.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for filter
  const uniqueStatuses = [...new Set(jobs.map(j => j.status).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500">View and track your service requests</p>
        </div>

        {clientUser?.role !== 'viewer' && (
          <Button
            onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
            style={{ backgroundColor: primaryColor }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Submit New Order
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, case number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No Orders Found</h3>
            <p className="text-slate-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? "No orders match your search criteria."
                : "You don't have any orders yet."}
            </p>
            {clientUser?.role !== 'viewer' && (
              <Button
                onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
                style={{ backgroundColor: primaryColor }}
              >
                Submit Your First Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const primaryAddress = job.addresses?.find(a => a.primary) || job.addresses?.[0];

            return (
              <Card
                key={job.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/portal/${companySlug}/orders/${job.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {job.defendant_name || `Order #${job.id.slice(-6)}`}
                        </h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status?.replace(/_/g, ' ') || 'Pending'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500">
                        {job.case_number && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            <span>Case: {job.case_number}</span>
                          </div>
                        )}

                        {primaryAddress && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">
                              {primaryAddress.city}, {primaryAddress.state}
                            </span>
                          </div>
                        )}

                        {job.created_at && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{safeFormatDate(job.created_at)}</span>
                          </div>
                        )}

                        {job.assigned_server && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>Assigned</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {filteredJobs.length > 0 && (
        <p className="text-sm text-slate-500 text-center">
          Showing {filteredJobs.length} of {jobs.length} orders
        </p>
      )}
    </div>
  );
}
