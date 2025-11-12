import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, AlertCircle, Send, FileText } from 'lucide-react';
import { isDateInRange } from '@/utils/dateRangeHelpers';

const StatCard = ({ title, value, icon, description, isLoading, count }) => {
  const Icon = icon;
  return (
    <Card className="shadow-sm border-0 transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <Icon className="h-5 w-5 text-slate-400" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4 mt-1" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">{description}</p>
              {count !== undefined && (
                <p className="text-xs font-medium text-slate-600">
                  {count} {count === 1 ? 'invoice' : 'invoices'}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default function AccountingStats({ invoices, isLoading, dateRange }) {
  const stats = React.useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        totalIssued: 0,
        issuedCount: 0,
        totalPaid: 0,
        paidCount: 0,
        outstandingBalance: 0,
        outstandingCount: 0,
        draftTotal: 0,
        draftCount: 0
      };
    }

    // Always exclude cancelled invoices from all financial calculations
    let allActiveInvoices = invoices.filter(inv => inv.status?.toLowerCase() !== 'cancelled');

    // Total Issued: sum of all currently issued and overdue invoices (NO date filter - shows current state)
    const issuedInvoices = allActiveInvoices.filter(inv =>
      ['issued', 'sent', 'overdue'].includes(inv.status?.toLowerCase())
    );
    const totalIssued = issuedInvoices.reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);
    const issuedCount = issuedInvoices.length;

    // Total Paid: sum of paid invoices (WITH date filter - shows payments in selected period)
    let paidInvoices = allActiveInvoices.filter(inv => inv.status?.toLowerCase() === 'paid');
    if (dateRange) {
      paidInvoices = paidInvoices.filter(inv => {
        const paymentDate = inv.payment_date || inv.updated_at || inv.invoice_date;
        return isDateInRange(paymentDate, dateRange);
      });
    }
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);
    const paidCount = paidInvoices.length;

    // Outstanding Balance: sum of balance_due from ALL unpaid invoices (NO date filter - shows what's owed NOW)
    const outstandingInvoices = allActiveInvoices.filter(inv =>
      ['issued', 'sent', 'overdue', 'partial', 'partially_paid'].includes(inv.status?.toLowerCase())
    );
    const outstandingBalance = outstandingInvoices.reduce((sum, inv) =>
      sum + (inv.balance_due || inv.amount_outstanding || inv.total_amount || inv.total || 0), 0
    );
    const outstandingCount = outstandingInvoices.length;

    // Draft Invoices: sum of all draft invoices (not date-filtered)
    const draftInvoices = invoices.filter(inv => inv.status?.toLowerCase() === 'draft');
    const draftTotal = draftInvoices.reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);
    const draftCount = draftInvoices.length;

    return {
      totalIssued,
      issuedCount,
      totalPaid,
      paidCount,
      outstandingBalance,
      outstandingCount,
      draftTotal,
      draftCount
    };
  }, [invoices, dateRange]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Issued"
        value={`$${stats.totalIssued.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={Send}
        description="Sent to clients"
        count={stats.issuedCount}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Paid"
        value={`$${stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign}
        description="Received payments"
        count={stats.paidCount}
        isLoading={isLoading}
      />
      <StatCard
        title="Outstanding Balance"
        value={`$${stats.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={AlertCircle}
        description="Awaiting payment"
        count={stats.outstandingCount}
        isLoading={isLoading}
      />
      <StatCard
        title="Draft Invoices"
        value={`$${stats.draftTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={FileText}
        description="Not yet issued"
        count={stats.draftCount}
        isLoading={isLoading}
      />
    </div>
  );
}