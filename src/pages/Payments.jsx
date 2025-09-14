import React, { useState, useEffect } from "react";
import { Payment, Invoice, Client } from "@/api/entities";
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
  CreditCard
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const paymentStatusConfig = {
  succeeded: { color: "bg-green-100 text-green-700", label: "Succeeded" },
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending" },
  failed: { color: "bg-red-100 text-red-700", label: "Failed" }
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [paymentsData, invoicesData, clientsData] = await Promise.all([
        Payment.list("-payment_date"),
        Invoice.list(),
        Client.list(),
      ]);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading payment data:", error);
    }
    setIsLoading(false);
  };
  
  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.company_name || 'N/A';
  };

  const getInvoiceNumber = (invoiceId) => {
    return invoices.find(i => i.id === invoiceId)?.invoice_number || 'N/A';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Payments</h1>
              <p className="text-slate-600">View all payment transactions</p>
            </div>
          </div>
          
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
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : payments.length > 0 ? (
                    payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.transaction_id || payment.id}</TableCell>
                        <TableCell>{getClientName(payment.client_id)}</TableCell>
                        <TableCell>{getInvoiceNumber(payment.invoice_id)}</TableCell>
                        <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>{format(new Date(payment.payment_date), "MMM d, yyyy h:mm a")}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge className={paymentStatusConfig[payment.status]?.color || "bg-slate-100"}>
                            {paymentStatusConfig[payment.status]?.label || "Unknown"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center">
                        <CreditCard className="mx-auto w-12 h-12 text-slate-300 mb-4" />
                        <p className="font-medium text-slate-600">No payments have been recorded yet.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}