import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const paymentStatusConfig = {
  succeeded: { color: "bg-green-100 text-green-700", label: "Succeeded" },
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending" },
  failed: { color: "bg-red-100 text-red-700", label: "Failed" }
};

export default function PaymentsTable({ payments, invoices, clients, isLoading }) {
  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.company_name || 'N/A';
  };

  const getInvoiceNumber = (invoiceId) => {
    return invoices.find(i => i.id === invoiceId)?.invoice_number || 'N/A';
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Transaction ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
  
  if (payments.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No payments found</h3>
          <p className="text-slate-500">Recorded payments will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Transaction ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(payment => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-xs">{payment.transaction_id || payment.id}</TableCell>
                <TableCell>{getClientName(payment.client_id)}</TableCell>
                <TableCell>{getInvoiceNumber(payment.invoice_id)}</TableCell>
                <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                <TableCell>
                  {(() => {
                    if (!payment.payment_date) return 'N/A';
                    const date = new Date(payment.payment_date);
                    return isNaN(date.getTime())
                      ? 'Invalid Date'
                      : format(date, "MMM d, yyyy h:mm a");
                  })()}
                </TableCell>
                <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ')}</TableCell>
                <TableCell>
                  <Badge className={paymentStatusConfig[payment.status]?.color || "bg-slate-100"}>
                    {paymentStatusConfig[payment.status]?.label || "Unknown"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}