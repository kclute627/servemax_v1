import React from "react";
import { useGlobalData } from "@/components/GlobalDataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default function BillingPanel() {
  const { companyData } = useGlobalData();

  // Real subscription data from company document
  const subscription = {
    plan_name: companyData?.plan_name || "Professional",
    monthly_job_limit: companyData?.monthly_job_limit || 100,
    monthly_rate: 28.99,
    current_period_start: startOfMonth(new Date()),
    current_period_end: endOfMonth(new Date()),
    status: companyData?.subscription_status || "active"
  };

  const currentUsage = companyData?.current_month_job_count || 0;

  // Mock billing history - in a real app this would come from your billing system
  const billingHistory = [
    {
      id: "inv_001",
      date: "2024-12-01",
      amount: 28.99,
      status: "paid",
      description: "Professional Plan - December 2024",
      jobs_used: 87
    },
    {
      id: "inv_002", 
      date: "2024-11-01",
      amount: 28.99,
      status: "paid",
      description: "Professional Plan - November 2024",
      jobs_used: 92
    },
    {
      id: "inv_003",
      date: "2024-10-01", 
      amount: 28.99,
      status: "paid",
      description: "Professional Plan - October 2024",
      jobs_used: 78
    }
  ];

  const usagePercentage = (currentUsage / subscription.monthly_job_limit) * 100;
  const remainingJobs = subscription.monthly_job_limit - currentUsage;

  const getStatusBadge = (status) => {
    const config = {
      paid: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
      pending: { color: "bg-amber-100 text-amber-700", icon: Clock },
      failed: { color: "bg-red-100 text-red-700", icon: AlertTriangle }
    };
    
    const { color, icon: Icon } = config[status] || config.pending;
    
    return (
      <Badge className={`${color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              Your subscription details and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{subscription.plan_name}</h3>
                <p className="text-slate-600">
                  {subscription.monthly_job_limit} jobs per month
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${subscription.monthly_rate}</p>
                <p className="text-sm text-slate-500">per month</p>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Billing Period</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Active
                </Badge>
              </div>
              <p className="text-slate-600">
                {format(subscription.current_period_start, "MMM d")} - {format(subscription.current_period_end, "MMM d, yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{currentUsage}</div>
              <div className="text-sm text-slate-500">
                of {subscription.monthly_job_limit} jobs used
              </div>
            </div>
            
            <Progress value={usagePercentage} className="h-2" />
            
            <div className="text-center">
              <p className="text-sm text-slate-600">
                {remainingJobs} jobs remaining
              </p>
              {usagePercentage > 80 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Approaching limit
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Billing History
              </CardTitle>
              <CardDescription>
                Your past invoices and payment history
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Jobs Used</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    {format(new Date(invoice.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <span className="font-mono">{invoice.jobs_used}</span>
                      <span className="text-slate-400">/{subscription.monthly_job_limit}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">${invoice.amount}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Management */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Management</CardTitle>
          <CardDescription>
            Manage your subscription and billing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Need more jobs?</p>
              <p className="text-sm text-slate-600">Upgrade to handle more volume</p>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Payment Method</p>
              <p className="text-sm text-slate-600">•••• •••• •••• 4242</p>
            </div>
            <Button variant="outline">Update</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}