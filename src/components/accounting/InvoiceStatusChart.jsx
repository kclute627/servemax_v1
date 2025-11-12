import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

// Duration ranges with colors reflecting urgency
const DURATION_RANGES = {
  recent: {
    min: 0,
    max: 25,
    label: '0-25 days',
    color: 'hsl(142.1 76.2% 36.3%)', // Green - good
    description: 'Recent invoices'
  },
  warning: {
    min: 26,
    max: 36,
    label: '26-36 days',
    color: 'hsl(45 93% 47%)', // Orange/Yellow - warning
    description: 'Aging invoices'
  },
  critical: {
    min: 37,
    max: Infinity,
    label: '37+ days',
    color: 'hsl(346.8 77.2% 49.8%)', // Red - critical
    description: 'Overdue invoices'
  }
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Calculate days since issued
const calculateDaysSinceIssued = (invoice) => {
  const issuedDate = invoice.issued_date || invoice.sent_date || invoice.invoice_date;
  if (!issuedDate) return 0;

  const issued = new Date(issuedDate);
  const today = new Date();
  const diffTime = today - issued;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Categorize invoice by age
const categorizeByAge = (daysSinceIssued) => {
  if (daysSinceIssued >= DURATION_RANGES.critical.min) {
    return 'critical';
  } else if (daysSinceIssued >= DURATION_RANGES.warning.min) {
    return 'warning';
  } else {
    return 'recent';
  }
};

export default function InvoiceStatusChart({ invoices, isLoading, dateRange }) {
  const chartData = React.useMemo(() => {
    // Filter for open invoices only (issued, partial, overdue)
    // NO date filtering - we want to see ALL open invoices and their age regardless of when issued
    const openStatuses = ['issued', 'sent', 'partial', 'partially_paid', 'overdue'];
    const openInvoices = invoices.filter(inv =>
      openStatuses.includes(inv.status?.toLowerCase())
    );

    // Group invoices by age duration
    const durationCounts = {
      recent: 0,
      warning: 0,
      critical: 0
    };

    openInvoices.forEach(invoice => {
      const days = calculateDaysSinceIssued(invoice);
      const category = categorizeByAge(days);
      durationCounts[category]++;
    });

    // Convert to chart data format
    return Object.entries(DURATION_RANGES)
      .map(([key, range]) => ({
        name: range.label,
        value: durationCounts[key],
        color: range.color,
        description: range.description
      }))
      .filter(item => item.value > 0); // Only show ranges that have invoices
  }, [invoices]); // Removed dateRange dependency - chart always shows ALL open invoices

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0">
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="flex justify-center items-center">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  // If no open invoices, show empty state
  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle>Open Invoices by Duration</CardTitle>
          <CardDescription>Age of outstanding invoices awaiting payment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center py-12">
          <div className="text-slate-400 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium">No open invoices</p>
            <p className="text-xs mt-1">All invoices are paid or in draft</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <CardTitle>Open Invoices by Duration</CardTitle>
        <CardDescription>Age of outstanding invoices awaiting payment</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [value, name]}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend
              iconType="circle"
              formatter={(value, entry) => {
                const total = chartData.reduce((sum, item) => sum + item.value, 0);
                const percent = ((entry.payload.value / total) * 100).toFixed(0);
                return `${value} (${percent}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
