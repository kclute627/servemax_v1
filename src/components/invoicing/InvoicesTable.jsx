import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal,
  Eye,
  CreditCard,
  Receipt
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const statusConfig = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  paid: { color: "bg-green-100 text-green-700", label: "Paid" },
  overdue: { color: "bg-red-100 text-red-700", label: "Overdue" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

export default function InvoicesTable({ invoices, clients, isLoading }) {
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "Unknown Client";
  };

  const handlePayNow = (invoiceId) => {
    // This is where the Stripe payment flow would be initiated.
    // For now, it will just log a message.
    console.log(`Initiating payment for invoice ID: ${invoiceId}`);
    alert("Stripe integration is not yet active. This is a placeholder.");
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No invoices found</h3>
          <p className="text-slate-500">Create your first invoice to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">Invoice #</TableHead>
                <TableHead className="font-semibold text-slate-700">Client</TableHead>
                <TableHead className="font-semibold text-slate-700">Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Due Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Paid</TableHead>
                <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                <TableHead className="font-semibold text-slate-700">Balance</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{invoice.invoice_number}</TableCell>
                  <TableCell className="text-slate-700">{getClientName(invoice.client_id)}</TableCell>
                  <TableCell className="text-slate-700">{format(new Date(invoice.invoice_date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-slate-700">{format(new Date(invoice.due_date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium text-green-600">${(invoice.total_paid || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-medium text-slate-900">${(invoice.total || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-medium text-slate-900">${(invoice.balance_due || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={statusConfig[invoice.status]?.color || "bg-slate-100 text-slate-700"}>
                      {statusConfig[invoice.status]?.label || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(invoice.status === 'sent' || invoice.status === 'overdue') ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handlePayNow(invoice.id)}
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="w-4 h-4" />
                            View Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}