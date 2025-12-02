import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Receipt,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  DollarSign,
  CreditCard,
  Download
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

const getStatusColor = (status) => {
  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    sent: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-800",
    partially_paid: "bg-orange-100 text-orange-800"
  };
  return statusColors[status?.toLowerCase()] || "bg-slate-100 text-slate-800";
};

export default function ClientInvoices() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { portalData } = useClientAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const invoices = portalData?.invoices || [];
  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#1e40af';

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchQuery === "" ||
      (invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (invoice.id?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" ||
      invoice.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalOwed = filteredInvoices
    .filter(i => ['sent', 'pending', 'overdue'].includes(i.status?.toLowerCase()))
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const totalPaid = filteredInvoices
    .filter(i => i.status?.toLowerCase() === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Get unique statuses for filter
  const uniqueStatuses = [...new Set(invoices.map(i => i.status).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-500">View and pay your invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-sm text-slate-500">Outstanding Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  ${totalPaid.toFixed(2)}
                </p>
                <p className="text-sm text-slate-500">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by invoice number..."
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

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No Invoices Found</h3>
            <p className="text-slate-500">
              {searchQuery || statusFilter !== 'all'
                ? "No invoices match your search criteria."
                : "You don't have any invoices yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const isPending = ['sent', 'pending', 'overdue'].includes(invoice.status?.toLowerCase());

            return (
              <Card
                key={invoice.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/portal/${companySlug}/invoices/${invoice.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          Invoice #{invoice.invoice_number || invoice.id.slice(-6)}
                        </h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status?.replace(/_/g, ' ') || 'Draft'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium text-slate-900">
                            ${(invoice.total || 0).toFixed(2)}
                          </span>
                        </div>

                        {invoice.created_at && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(
                                new Date(invoice.created_at.seconds ? invoice.created_at.seconds * 1000 : invoice.created_at),
                                'MMM d, yyyy'
                              )}
                            </span>
                          </div>
                        )}

                        {invoice.due_date && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Due:</span>
                            <span>
                              {format(
                                new Date(invoice.due_date.seconds ? invoice.due_date.seconds * 1000 : invoice.due_date),
                                'MMM d, yyyy'
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <Button
                          size="sm"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(invoice.pdf_url, '_blank');
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}

                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <p className="text-sm text-slate-500 text-center">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </p>
      )}
    </div>
  );
}
