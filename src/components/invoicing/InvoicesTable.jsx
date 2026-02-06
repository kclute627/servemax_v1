import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Eye,
  CreditCard,
  Receipt,
  Send,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Payment, Invoice, User } from "@/api/entities";
import { useToast } from "@/components/ui/use-toast";

const statusConfig = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  issued: { color: "bg-indigo-100 text-indigo-700", label: "Issued" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  paid: { color: "bg-green-100 text-green-700", label: "Paid" },
  partial: { color: "bg-orange-100 text-orange-700", label: "Partial" },
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

  // Bulk payment state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    notes: ''
  });
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const payableStatuses = ['issued', 'sent', 'overdue', 'partial', 'partially_paid', 'draft'];

  const isPayable = (invoice) =>
    invoice.status !== 'paid' && invoice.status !== 'cancelled' && (invoice.balance_due || 0) > 0;

  const selectedInvoices = useMemo(() =>
    invoices.filter(inv => selectedIds.has(inv.id)),
    [invoices, selectedIds]
  );

  const selectedTotal = useMemo(() =>
    selectedInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0),
    [selectedInvoices]
  );

  const payableInvoices = useMemo(() =>
    invoices.filter(isPayable),
    [invoices]
  );

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "Unknown Client";
  };

  // --- Issue Invoice ---
  const handleIssueInvoice = async (invoice) => {
    try {
      await Invoice.update(invoice.id, {
        status: 'issued',
        issued_date: new Date().toISOString()
      });
      toast({
        variant: "success",
        title: "Invoice Issued",
        description: `Invoice ${invoice.invoice_number} has been issued.`
      });
      if (onPaymentApplied) onPaymentApplied();
    } catch (error) {
      console.error('Error issuing invoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to issue invoice. Please try again."
      });
    }
  };

  // --- Single Payment ---
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

      const currentUser = await User.me();

      await Payment.create({
        invoice_id: selectedInvoice.id,
        client_id: selectedInvoice.client_id,
        company_id: currentUser.company_id,
        amount: paymentAmount,
        payment_date: new Date(paymentForm.payment_date).toISOString(),
        payment_method: paymentForm.payment_method,
        transaction_id: `PMT-${Date.now()}`,
        status: 'succeeded',
        notes: paymentForm.notes,
        created_at: new Date().toISOString()
      });

      const newTotalPaid = (selectedInvoice.total_paid || 0) + paymentAmount;
      const newBalanceDue = (selectedInvoice.total || 0) - newTotalPaid;

      let newStatus = selectedInvoice.status;
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newTotalPaid > 0 && newBalanceDue > 0) {
        newStatus = 'partial';
      }

      const invoiceUpdate = {
        total_paid: newTotalPaid,
        balance_due: Math.max(0, newBalanceDue),
        status: newStatus
      };

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
      if (onPaymentApplied) onPaymentApplied();

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

  // --- Bulk Payment ---
  const toggleSelect = (invoiceId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === payableInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payableInvoices.map(inv => inv.id)));
    }
  };

  const handleOpenBulkPayment = () => {
    setBulkPaymentForm({
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'check',
      notes: ''
    });
    setIsBulkPaymentOpen(true);
  };

  const handleBulkPaymentSubmit = async (e) => {
    e.preventDefault();
    setIsBulkSubmitting(true);

    try {
      const currentUser = await User.me();
      const now = new Date().toISOString();

      for (const invoice of selectedInvoices) {
        const paymentAmount = invoice.balance_due || 0;
        if (paymentAmount <= 0) continue;

        // Create payment record
        await Payment.create({
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          company_id: currentUser.company_id,
          amount: paymentAmount,
          payment_date: new Date(bulkPaymentForm.payment_date).toISOString(),
          payment_method: bulkPaymentForm.payment_method,
          transaction_id: `PMT-${Date.now()}-${invoice.id.slice(-4)}`,
          status: 'succeeded',
          notes: bulkPaymentForm.notes,
          created_at: now
        });

        // Mark invoice as paid
        await Invoice.update(invoice.id, {
          total_paid: invoice.total || 0,
          balance_due: 0,
          status: 'paid',
          payment_date: now
        });
      }

      toast({
        variant: "success",
        title: "Bulk Payment Applied",
        description: `${selectedInvoices.length} invoices marked as paid ($${selectedTotal.toFixed(2)} total).`
      });

      setIsBulkPaymentOpen(false);
      setSelectedIds(new Set());
      if (onPaymentApplied) onPaymentApplied();

    } catch (error) {
      console.error('Error applying bulk payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply bulk payment. Some invoices may have been updated."
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // --- Loading State ---
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-10"></TableHead>
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
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
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

  // --- Empty State ---
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
    {/* Bulk Selection Action Bar - Fixed at bottom */}
    {selectedIds.size > 0 && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
        <span className="text-sm font-medium">
          {selectedIds.size} invoice{selectedIds.size !== 1 ? 's' : ''} selected — ${selectedTotal.toFixed(2)} total
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-white hover:bg-white/10"
          >
            Clear
          </Button>
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
            onClick={handleOpenBulkPayment}
          >
            <CreditCard className="w-4 h-4" />
            Apply Payment
          </Button>
        </div>
      </div>
    )}

    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-10">
                  <Checkbox
                    checked={payableInvoices.length > 0 && selectedIds.size === payableInvoices.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
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
                <TableRow
                  key={invoice.id}
                  className={`hover:bg-slate-50 transition-colors ${selectedIds.has(invoice.id) ? 'bg-blue-50/50' : ''}`}
                >
                  <TableCell>
                    {isPayable(invoice) ? (
                      <Checkbox
                        checked={selectedIds.has(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                      />
                    ) : (
                      <div className="w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to={createPageUrl(`InvoiceDetail?id=${invoice.id}`)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </TableCell>
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
                        <DropdownMenuItem className="gap-2" asChild>
                          <Link to={createPageUrl(`InvoiceDetail?id=${invoice.id}`)}>
                            <Eye className="w-4 h-4" />
                            View Invoice
                          </Link>
                        </DropdownMenuItem>
                        {invoice.status === 'draft' && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleIssueInvoice(invoice)}
                          >
                            <Send className="w-4 h-4" />
                            Issue Invoice
                          </DropdownMenuItem>
                        )}
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.status !== 'draft' && (
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

    {/* Single Payment Dialog */}
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {selectedInvoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>

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
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

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

    {/* Bulk Payment Dialog */}
    <Dialog open={isBulkPaymentOpen} onOpenChange={setIsBulkPaymentOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Apply Bulk Payment</DialogTitle>
          <DialogDescription>
            Mark {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} as paid
          </DialogDescription>
        </DialogHeader>

        {/* Selected invoices summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[200px] overflow-y-auto">
          {selectedInvoices.map((inv) => (
            <div key={inv.id} className="flex justify-between items-center px-4 py-2.5">
              <div>
                <span className="font-medium text-sm text-slate-900">{inv.invoice_number}</span>
                <span className="text-xs text-slate-500 ml-2">{getClientName(inv.client_id)}</span>
              </div>
              <span className="font-semibold text-sm text-slate-900">
                ${(inv.balance_due || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center px-1 py-1">
          <span className="font-semibold text-slate-700">Total</span>
          <span className="text-lg font-bold text-green-700">${selectedTotal.toFixed(2)}</span>
        </div>

        <form onSubmit={handleBulkPaymentSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_payment_date">Payment Date *</Label>
              <Input
                id="bulk_payment_date"
                type="date"
                required
                value={bulkPaymentForm.payment_date}
                onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, payment_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk_payment_method">Payment Method *</Label>
              <select
                id="bulk_payment_method"
                required
                value={bulkPaymentForm.payment_method}
                onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk_notes">Notes</Label>
              <textarea
                id="bulk_notes"
                value={bulkPaymentForm.notes}
                onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="e.g. Check #1234 from ABC Law"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkPaymentOpen(false)}
              disabled={isBulkSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isBulkSubmitting}
              className="bg-green-600 hover:bg-green-700 gap-1.5"
            >
              {isBulkSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Mark ${selectedInvoices.length} Paid`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
