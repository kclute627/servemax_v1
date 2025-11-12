import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths } from 'date-fns';
import { isDateInRange } from '@/utils/dateRangeHelpers';

export default function RevenueChart({ invoices, isLoading, dateRange }) {
  const chartData = React.useMemo(() => {
    // Apply date range filter if provided
    // Always exclude cancelled invoices from revenue calculations
    let filteredInvoices = invoices.filter(inv => inv.status !== 'cancelled');

    if (dateRange) {
      filteredInvoices = filteredInvoices.filter(inv => {
        // Use payment_date for paid invoices, invoice_date for others
        const dateToCheck = inv.status === 'paid'
          ? (inv.payment_date || inv.invoice_date)
          : inv.invoice_date;
        return isDateInRange(dateToCheck, dateRange);
      });
    }

    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM');

      // Invoices issued in this month (for billed and outstanding calculations)
      const monthInvoices = filteredInvoices.filter(inv =>
        format(new Date(inv.invoice_date), 'yyyy-MM') === monthKey
      );

      // Total amount billed (all invoices issued in this month)
      const billed = monthInvoices
        .filter(inv =>
          ['issued', 'sent', 'overdue', 'paid', 'partial', 'partially_paid'].includes(inv.status?.toLowerCase())
        )
        .reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);

      // Revenue collected (invoices paid in this month - based on payment_date)
      const revenue = filteredInvoices
        .filter(inv => {
          if (inv.status !== 'paid' || !inv.payment_date) return false;
          const paymentMonth = format(new Date(inv.payment_date), 'yyyy-MM');
          return paymentMonth === monthKey;
        })
        .reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0);

      // Outstanding balance (unpaid/partially paid invoices issued in this month)
      const outstanding = monthInvoices
        .filter(inv =>
          ['issued', 'sent', 'overdue', 'partial', 'partially_paid'].includes(inv.status?.toLowerCase())
        )
        .reduce((sum, inv) => sum + (inv.balance_due || inv.amount_outstanding || inv.total_amount || inv.total || 0), 0);

      data.push({ name: monthLabel, Billed: billed, Revenue: revenue, Outstanding: outstanding });
    }
    return data;
  }, [invoices, dateRange]);

  if (isLoading) {
    return (
        <Card className="shadow-sm border-0">
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Invoices billed, revenue collected, and outstanding amounts over the last 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value === 0) return '$0';
                if (value < 1000) return `$${value.toFixed(0)}`;
                if (value < 1000000) return `$${(value/1000).toFixed(1)}k`;
                return `$${(value/1000000).toFixed(2)}M`;
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Legend />
            <Bar dataKey="Billed" fill="hsl(210 100% 70%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Revenue" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Outstanding" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}