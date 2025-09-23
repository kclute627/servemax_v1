import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const StatCard = ({ title, value, icon, description, isLoading }) => {
  const Icon = icon;
  return (
    <Card className="shadow-sm border-0">
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
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-slate-500">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default function AccountingStats({ invoices, isLoading }) {
  const stats = React.useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return { totalOutstanding: 0, totalRevenue30d: 0, overdueAmount: 0, avgTimeToPay: 0 };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const unpaidInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalRevenue30d = paidInvoices
      .filter(inv => new Date(inv.payment_date) >= thirtyDaysAgo)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
      
    const overdueAmount = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
      
    const paidDurations = paidInvoices
      .map(inv => differenceInDays(new Date(inv.payment_date), new Date(inv.invoice_date)))
      .filter(days => days >= 0);
      
    const avgTimeToPay = paidDurations.length > 0
      ? Math.round(paidDurations.reduce((sum, days) => sum + days, 0) / paidDurations.length)
      : 0;

    return { totalOutstanding, totalRevenue30d, overdueAmount, avgTimeToPay };
  }, [invoices]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Outstanding"
        value={`$${stats.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign}
        description="All unpaid and sent invoices"
        isLoading={isLoading}
      />
      <StatCard
        title="Revenue (Last 30 Days)"
        value={`$${stats.totalRevenue30d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={TrendingUp}
        description="Total amount from paid invoices"
        isLoading={isLoading}
      />
      <StatCard
        title="Overdue"
        value={`$${stats.overdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={AlertCircle}
        description="Total amount past due date"
        isLoading={isLoading}
      />
      <StatCard
        title="Avg. Time to Pay"
        value={`${stats.avgTimeToPay} Days`}
        icon={Clock}
        description="From invoice date to payment"
        isLoading={isLoading}
      />
    </div>
  );
}