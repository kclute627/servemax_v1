import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Receipt,
  Search,
  ChevronRight,
  Calendar,
  DollarSign,
  CreditCard,
  Download,
  X,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

// Status configuration
const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  sent: { label: "Awaiting Payment", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  overdue: { label: "Overdue", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  partially_paid: { label: "Partial", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" }
};

export default function ClientInvoices() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { portalData } = useClientAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const invoices = portalData?.invoices || [];
  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#0f172a';

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchQuery === "" ||
      (invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (invoice.id?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "unpaid" && ['sent', 'pending', 'overdue'].includes(invoice.status?.toLowerCase())) ||
      (statusFilter === "paid" && invoice.status?.toLowerCase() === 'paid') ||
      invoice.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalOwed = invoices
    .filter(i => ['sent', 'pending', 'overdue'].includes(i.status?.toLowerCase()))
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const totalPaid = invoices
    .filter(i => i.status?.toLowerCase() === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Count by status
  const statusCounts = {
    all: invoices.length,
    unpaid: invoices.filter(i => ['sent', 'pending', 'overdue'].includes(i.status?.toLowerCase())).length,
    paid: invoices.filter(i => i.status?.toLowerCase() === 'paid').length,
    overdue: invoices.filter(i => i.status?.toLowerCase() === 'overdue').length
  };

  const hasFilters = searchQuery !== "" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-500 mt-1">
          {invoices.length} total invoice{invoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Outstanding Balance */}
        <div className={`rounded-2xl p-5 ${
          totalOwed > 0
            ? 'bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100'
            : 'bg-white border border-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              totalOwed > 0 ? 'bg-rose-100' : 'bg-slate-100'
            }`}>
              <AlertCircle className={`w-5 h-5 ${totalOwed > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold mb-1 ${totalOwed > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-slate-500">Outstanding Balance</p>
        </div>

        {/* Total Paid */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">
            ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-slate-500">Total Paid</p>
        </div>
      </div>

      {/* Outstanding Balance Alert */}
      {totalOwed > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  {statusCounts.unpaid} invoice{statusCounts.unpaid !== 1 ? 's' : ''} awaiting payment
                </p>
                <p className="text-sm text-amber-700">
                  Total outstanding: ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              onClick={() => {
                // Find first unpaid invoice
                const unpaid = invoices.find(i => ['sent', 'pending', 'overdue'].includes(i.status?.toLowerCase()));
                if (unpaid) navigate(`/portal/${companySlug}/invoices/${unpaid.id}`);
              }}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', count: statusCounts.all },
          { key: 'unpaid', label: 'Unpaid', count: statusCounts.unpaid },
          { key: 'paid', label: 'Paid', count: statusCounts.paid },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all
              ${statusFilter === filter.key
                ? 'text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }
            `}
            style={statusFilter === filter.key ? { backgroundColor: primaryColor } : {}}
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
          placeholder="Search by invoice number..."
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
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Receipt className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {hasFilters ? 'No invoices found' : 'No invoices yet'}
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {hasFilters
              ? "Try adjusting your search or filters."
              : "Invoices will appear here once they are generated."}
          </p>
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
          {filteredInvoices.map((invoice) => {
            const status = statusConfig[invoice.status?.toLowerCase()] || statusConfig.draft;
            const isPending = ['sent', 'pending', 'overdue'].includes(invoice.status?.toLowerCase());
            const isOverdue = invoice.status?.toLowerCase() === 'overdue';

            return (
              <button
                key={invoice.id}
                onClick={() => navigate(`/portal/${companySlug}/invoices/${invoice.id}`)}
                className={`w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left group ${
                  isOverdue ? 'bg-rose-50/30' : ''
                }`}
              >
                {/* Status Dot */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${status.dot}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-semibold text-slate-900">
                      Invoice #{invoice.invoice_number || invoice.id.slice(-6)}
                    </p>
                    {isOverdue && (
                      <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <DollarSign className="w-3.5 h-3.5" />
                      {(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {safeFormatDate(invoice.created_at || invoice.invoice_date)}
                    </span>
                    {invoice.due_date && (
                      <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 font-medium' : ''}`}>
                        Due: {safeFormatDate(invoice.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isPending && (
                    <Button
                      size="sm"
                      className="text-white shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/portal/${companySlug}/invoices/${invoice.id}`);
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Pay
                    </Button>
                  )}

                  {invoice.pdf_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(invoice.pdf_url, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Status Badge (for paid/draft) */}
                  {!isPending && (
                    <Badge className={`border ${status.color}`}>
                      {status.label}
                    </Badge>
                  )}

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      {filteredInvoices.length > 0 && hasFilters && (
        <p className="text-sm text-slate-500 text-center">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </p>
      )}
    </div>
  );
}
