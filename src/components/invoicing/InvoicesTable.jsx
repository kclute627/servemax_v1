import React, { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal,
  Eye,
  CreditCard,
  Receipt
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Payment, Invoice, User } from "@/api/entities";
import { useToast } from "@/components/ui/use-toast";

const statusConfig = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  paid: { color: "bg-green-100 text-green-700", label: "Paid" },
  overdue: { color: "bg-red-100 text-red-700", label: "Overdue" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

export default function InvoicesTable({ invoices, clients, isLoading, onPaymentApplied }) {
  const { toast } = useToast();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleApplyPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.balance_due?.toFixed(2) || '0.00',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'check',
      notes: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setIsSubmitting(true);

    try {
      const paymentAmount = parseFloat(paymentForm.amount);

      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Amount",
          description: "Please enter a valid payment amount."
        });
        setIsSubmitting(false);
        return;
      }

      // Get current user for company_id
      const currentUser = await User.me();

      // Create payment record
      const paymentData = {
        invoice_id: selectedInvoice.id,
        client_id: selectedInvoice.client_id,
        company_id: currentUser.company_id, // Required for Firestore security rules
        amount: paymentAmount,
        payment_date: new Date(paymentForm.payment_date).toISOString(),
        payment_method: paymentForm.payment_method,
        transaction_id: `PMT-${Date.now()}`,
        status: 'succeeded',
        notes: paymentForm.notes,
        created_at: new Date().toISOString()
      };

      await Payment.create(paymentData);

      // Update invoice
      const newTotalPaid = (selectedInvoice.total_paid || 0) + paymentAmount;
      const newBalanceDue = (selectedInvoice.total || 0) - newTotalPaid;

      let newStatus = selectedInvoice.status;
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newTotalPaid > 0 && newBalanceDue > 0) {
        newStatus = 'partial';
      }

      // Build update object - only include payment_date when fully paid
      const invoiceUpdate = {
        total_paid: newTotalPaid,
        balance_due: Math.max(0, newBalanceDue),
        status: newStatus
      };

      // Only set payment_date when invoice is fully paid
      if (newBalanceDue <= 0) {
        invoiceUpdate.payment_date = new Date().toISOString();
      }

      await Invoice.update(selectedInvoice.id, invoiceUpdate);

      toast({
        variant: "success",
        title: "Payment Applied",
        description: `$${paymentAmount.toFixed(2)} payment recorded successfully.`
      });

      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);

      // Refresh data to show updated invoices and payments
      if (onPaymentApplied) {
        onPaymentApplied();
      }

    } catch (error) {
      console.error('Error applying payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply payment. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
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
    <>
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
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleApplyPayment(invoice)}
                          >
                            <CreditCard className="w-4 h-4" />
                            Apply Payment
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {/* Payment Dialog */}
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {selectedInvoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Amount Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600">Invoice Amount:</span>
            <span className="text-lg font-semibold text-slate-900">
              ${selectedInvoice?.total?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Balance Due:</span>
            <span className="text-lg font-semibold text-blue-600">
              ${selectedInvoice?.balance_due?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>

        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <select
                id="payment_method"
                required
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="Optional payment notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Apply Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}