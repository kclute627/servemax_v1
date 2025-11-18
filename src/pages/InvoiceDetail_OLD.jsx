import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Invoice, Client, Payment, Job } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  FileText,
  Download,
  CreditCard,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const statusConfig = {
  draft: { color: 'bg-slate-100 text-slate-700', label: 'Draft' },
  sent: { color: 'bg-blue-100 text-blue-700', label: 'Sent' },
  paid: { color: 'bg-green-100 text-green-700', label: 'Paid' },
  overdue: { color: 'bg-red-100 text-red-700', label: 'Overdue' },
  cancelled: { color: 'bg-slate-100 text-slate-500', label: 'Cancelled' }
};

export default function InvoiceDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [location.search]);

  const loadInvoiceData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(location.search);
      const invoiceId = params.get('id');

      if (!invoiceId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No invoice ID provided'
        });
        navigate(createPageUrl('Accounting'));
        return;
      }

      // Load invoice
      const invoiceData = await Invoice.findById(invoiceId);
      setInvoice(invoiceData);

      // Load client
      if (invoiceData.client_id) {
        const clientData = await Client.findById(invoiceData.client_id);
        setClient(clientData);
      }

      // Load associated jobs
      if (invoiceData.job_ids && invoiceData.job_ids.length > 0) {
        const jobPromises = invoiceData.job_ids.map(jobId => Job.findById(jobId));
        const jobsData = await Promise.all(jobPromises);
        setJobs(jobsData.filter(Boolean));
      }

      // Load payments
      const paymentsData = await Payment.filter({ invoice_id: invoiceId });
      setPayments(paymentsData);

    } catch (error) {
      console.error('Error loading invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load invoice details'
      });
    }
    setIsLoading(false);
  };

  const handleApplyPayment = () => {
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
    setIsSubmitting(true);

    try {
      const paymentAmount = parseFloat(paymentForm.amount);

      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid Amount',
          description: 'Please enter a valid payment amount.'
        });
        setIsSubmitting(false);
        return;
      }

      const currentUser = await user;

      const paymentData = {
        invoice_id: invoice.id,
        client_id: invoice.client_id,
        amount: paymentAmount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes,
        created_by: currentUser?.id
      };

      await Payment.create(paymentData);

      // Update invoice amounts
      const newAmountPaid = (invoice.amount_paid || 0) + paymentAmount;
      const newBalanceDue = invoice.total_amount - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'paid' : invoice.status;

      await Invoice.update(invoice.id, {
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus
      });

      toast({
        title: 'Payment Applied',
        description: `Payment of $${paymentAmount.toFixed(2)} has been successfully applied.`
      });

      setIsPaymentDialogOpen(false);
      loadInvoiceData(); // Reload to show updated data
    } catch (error) {
      console.error('Error applying payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to apply payment. Please try again.'
      });
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-slate-600">Invoice not found</p>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[invoice.status] || statusConfig.draft;

  // Determine back navigation URL based on query params
  const params = new URLSearchParams(location.search);
  const returnTo = params.get('returnTo');
  const jobId = params.get('jobId');
  const backUrl = returnTo === 'JobDetails' && jobId
    ? createPageUrl(`JobDetails?id=${jobId}`)
    : createPageUrl('Accounting');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={backUrl}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Invoice {invoice.invoice_number}
                </h1>
                <p className="text-slate-600 mt-1">
                  {client?.company_name || 'Unknown Client'}
                </p>
              </div>
            </div>
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Invoice Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invoice Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-slate-600">Invoice Number</Label>
                  <p className="text-lg font-semibold">{invoice.invoice_number}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Invoice Date</Label>
                  <p className="text-lg">
                    {invoice.invoice_date
                      ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Due Date</Label>
                  <p className="text-lg">
                    {invoice.due_date
                      ? format(new Date(invoice.due_date), 'MMM dd, yyyy')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Status</Label>
                  <Badge className={`${statusInfo.color} mt-1`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Client Info */}
              {client && (
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">Bill To</Label>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="font-semibold">{client.company_name}</p>
                    {client.billing_address && (
                      <div className="mt-2 text-sm text-slate-600">
                        <p>{client.billing_address.address1}</p>
                        {client.billing_address.address2 && <p>{client.billing_address.address2}</p>}
                        <p>
                          {client.billing_address.city}, {client.billing_address.state}{' '}
                          {client.billing_address.postal_code}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Line Items */}
              <div>
                <Label className="text-sm text-slate-600 mb-3 block">Invoice Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.line_items && invoice.line_items.length > 0 ? (
                      invoice.line_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.rate?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.amount?.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500">
                          No line items
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full md:w-1/2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">${invoice.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Amount Paid:</span>
                    <span className="font-medium">-${invoice.amount_paid?.toFixed(2) || '0.00'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Balance Due:</span>
                    <span className="text-slate-900">${invoice.balance_due?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button onClick={handleApplyPayment} className="gap-2">
                    <CreditCard className="w-4 h-4" />
                    Apply Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Associated Jobs */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Associated Jobs ({jobs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {jobs.map(job => (
                    <Link
                      key={job.id}
                      to={createPageUrl(`JobDetails?id=${job.id}`)}
                      className="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{job.job_number}</p>
                          <p className="text-sm text-slate-600">{job.recipient_name}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">
                          ${job.service_fee?.toFixed(2) || '0.00'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.payment_date
                            ? format(new Date(payment.payment_date), 'MMM dd, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="capitalize">{payment.payment_method}</TableCell>
                        <TableCell className="text-slate-600">{payment.notes || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          ${payment.amount?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Add any additional notes..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Apply Payment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
