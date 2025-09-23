import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = {
  paid: 'hsl(142.1 76.2% 36.3%)',
  sent: 'hsl(221.2 83.2% 53.3%)',
  overdue: 'hsl(346.8 77.2% 49.8%)',
  draft: 'hsl(215.4 16.3% 46.9%)',
  cancelled: 'hsl(210 40% 96.1%)',
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

export default function InvoiceStatusChart({ invoices, isLoading }) {
  const chartData = React.useMemo(() => {
    const statusCounts = invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [invoices]);

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
    )
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <CardTitle>Invoice Status</CardTitle>
        <CardDescription>Distribution of all invoices by status.</CardDescription>
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
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}