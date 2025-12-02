import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Invoice, Client, Payment, Job } from '@/api/entities';
import { entities } from '@/firebase/database';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Printer,
  Mail,
  Edit,
  Save,
  CreditCard,
  Send,
  Loader2,
  X,
  Download,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import InvoicePreview from '../components/invoicing/InvoicePreview';
import html2pdf from 'html2pdf.js';

const statusConfig = {
  draft: { color: 'bg-slate-100 text-slate-700', label: 'Draft' },
  issued: { color: 'bg-blue-100 text-blue-700', label: 'Issued' },
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
  const [job, setJob] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [invoiceSettings, setInvoiceSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    notes: ''
  });
  const [invoiceModified, setInvoiceModified] = useState(false); // Track if invoice was modified during session

  useEffect(() => {
    loadInvoiceData();
    loadCompanyInfo();
  }, [location.search]);

  const loadInvoiceData = async (isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    }
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

      const invoiceData = await Invoice.findById(invoiceId);
      setInvoice(invoiceData);

      if (invoiceData.client_id) {
        const clientData = await Client.findById(invoiceData.client_id);
        setClient(clientData);
      }

      // Load job data to get contact and reference information
      if (invoiceData.job_ids && invoiceData.job_ids.length > 0) {
        const jobData = await Job.findById(invoiceData.job_ids[0]);
        setJob(jobData);
      }

    } catch (error) {
      console.error('Error loading invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load invoice details'
      });
    }
    if (!isRefresh) {
      setIsLoading(false);
    }
    setIsInitialLoading(false);
  };

  const loadCompanyInfo = async () => {
    try {
      // Load company data from companies collection using entities
      if (user?.company_id) {
        const companyData = await entities.Company.findById(user.company_id);
        if (companyData) {
          // Get primary address from addresses array or fallback to legacy fields
          const primaryAddress = companyData.addresses?.find(addr => addr.primary) || companyData.addresses?.[0];

          // Map company data to match InvoicePreview expected format
          const mappedCompanyInfo = {
            company_name: companyData.name || '',
            address1: primaryAddress?.address1 || companyData.address || '',
            address2: primaryAddress?.address2 || '',
            city: primaryAddress?.city || companyData.city || '',
            state: primaryAddress?.state || companyData.state || '',
            zip: primaryAddress?.postal_code || companyData.zip || '',
            phone: companyData.phone || '',
            email: companyData.email || ''
          };

          console.log('[InvoiceDetail] Company Info Loaded:', mappedCompanyInfo);
          setCompanyInfo(mappedCompanyInfo);

          // Load invoice settings from company document (not CompanySettings table)
          if (companyData.invoice_settings) {
            console.log('[InvoiceDetail] Invoice Settings Loaded:', companyData.invoice_settings);
            setInvoiceSettings(companyData.invoice_settings);
          }
        } else {
          console.log('[InvoiceDetail] No company data found for company_id:', user.company_id);
        }
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  const handleSaveEdit = async (updatedData) => {
    setIsSaving(true);
    try {
      await Invoice.update(invoice.id, {
        invoice_date: updatedData.invoice_date || invoice.invoice_date,
        due_date: updatedData.due_date || invoice.due_date,
        tax_rate: updatedData.tax_rate,
        tax_amount: updatedData.tax_amount,
        total_tax_amount: updatedData.tax_amount, // For compatibility
        line_items: updatedData.line_items,
        subtotal: updatedData.subtotal,
        total_amount: updatedData.total_amount,
        total: updatedData.total_amount, // For compatibility
        balance_due: updatedData.balance_due
      });

      // Log to job activity
      if (invoice.job_ids && invoice.job_ids.length > 0) {
        const jobData = await Job.findById(invoice.job_ids[0]);
        const newLogEntry = {
          timestamp: new Date().toISOString(),
          event_type: 'invoice_updated',
          description: `Invoice ${invoice.invoice_number} updated`,
          user_name: user?.displayName || user?.email || 'Unknown'
        };
        const currentActivityLog = Array.isArray(jobData?.activity_log) ? jobData.activity_log : [];
        await Job.update(jobData.id, {
          activity_log: [...currentActivityLog, newLogEntry]
        });
      }

      toast({
        title: 'Invoice Updated',
        description: 'Your changes have been saved successfully.'
      });

      setIsEditing(false);
      loadInvoiceData();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save invoice changes.'
      });
    }
    setIsSaving(false);
  };

  const handleIssueInvoice = async () => {
    setIsIssuing(true);
    try {
      await Invoice.update(invoice.id, {
        status: 'issued',
        issued_date: new Date().toISOString()
      });

      // Log to job activity
      if (invoice.job_ids && invoice.job_ids.length > 0) {
        const jobData = await Job.findById(invoice.job_ids[0]);
        const newLogEntry = {
          timestamp: new Date().toISOString(),
          event_type: 'invoice_issued',
          description: `Invoice ${invoice.invoice_number} issued`,
          user_name: user?.displayName || user?.email || 'Unknown'
        };
        const currentActivityLog = Array.isArray(jobData?.activity_log) ? jobData.activity_log : [];
        await Job.update(jobData.id, {
          activity_log: [...currentActivityLog, newLogEntry]
        });
      }

      toast({
        title: 'Invoice Issued',
        description: `Invoice ${invoice.invoice_number} has been issued successfully.`
      });

      setInvoiceModified(true); // Mark invoice as modified for back navigation refresh
      await loadInvoiceData(true); // Pass true to prevent skeleton flash
    } catch (error) {
      console.error('Error issuing invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to issue invoice.'
      });
    }
    setIsIssuing(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const element = document.querySelector('.invoice-preview');
      if (!element) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invoice preview not found.'
        });
        return;
      }

      const opt = {
        margin: 0.5,
        filename: `Invoice-${invoice.invoice_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      toast({
        title: 'Generating PDF',
        description: 'Please wait while we generate your PDF...'
      });

      await html2pdf().set(opt).from(element).save();

      toast({
        title: 'PDF Downloaded',
        description: `Invoice ${invoice.invoice_number} has been downloaded.`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.'
      });
    }
  };

  const handleEmail = () => {
    toast({
      title: 'Coming Soon',
      description: 'Email functionality will be available soon.'
    });
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
    setIsSaving(true);

    try {
      const paymentAmount = parseFloat(paymentForm.amount);

      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid Amount',
          description: 'Please enter a valid payment amount.'
        });
        setIsSaving(false);
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

      const newAmountPaid = (invoice.amount_paid || 0) + paymentAmount;
      const newBalanceDue = invoice.total_amount - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'paid' : invoice.status;

      await Invoice.update(invoice.id, {
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus
      });

      // Log to job activity
      if (invoice.job_ids && invoice.job_ids.length > 0) {
        const jobData = await Job.findById(invoice.job_ids[0]);
        const newLogEntry = {
          timestamp: new Date().toISOString(),
          event_type: 'payment_applied',
          description: `Payment of $${paymentAmount.toFixed(2)} applied to invoice ${invoice.invoice_number}`,
          user_name: user?.displayName || user?.email || 'Unknown'
        };
        const currentActivityLog = Array.isArray(jobData?.activity_log) ? jobData.activity_log : [];
        await Job.update(jobData.id, {
          activity_log: [...currentActivityLog, newLogEntry]
        });
      }

      toast({
        title: 'Payment Applied',
        description: `Payment of $${paymentAmount.toFixed(2)} has been successfully applied.`
      });

      setIsPaymentDialogOpen(false);
      loadInvoiceData();
    } catch (error) {
      console.error('Error applying payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to apply payment.'
      });
    }
    setIsSaving(false);
  };

  if (isInitialLoading) {
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

  const statusInfo = statusConfig[invoice.status?.toLowerCase()] || statusConfig.draft;

  // Determine back navigation URL
  const params = new URLSearchParams(location.search);
  const returnTo = params.get('returnTo');
  const jobId = params.get('jobId');
  const backUrl = returnTo === 'JobDetails' && jobId
    ? createPageUrl(`JobDetails?id=${jobId}`)
    : createPageUrl('Accounting');

  // Handle back navigation with refresh signal if invoice was modified
  const handleBackNavigation = () => {
    if (returnTo === 'JobDetails' && jobId && invoiceModified) {
      // Navigate with refresh signal so JobDetails refreshes invoice data
      navigate(createPageUrl(`JobDetails?id=${jobId}`), { state: { refreshInvoice: true } });
    } else {
      navigate(backUrl);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Header Section */}
      <div className="bg-white border-b border-slate-300 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="no-print" onClick={handleBackNavigation}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Invoice {invoice.invoice_number}
                </h1>
                <p className="text-slate-600 mt-1">
                  {client?.company_name || 'Unknown Client'}
                </p>
              </div>
            </div>
            <Badge className={`${statusInfo.color} transition-all duration-300`}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Fixed Button Bar Section */}
      <div className="bg-slate-200/70 border-b border-slate-300 px-6 py-3 no-print">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-3 justify-end transition-all duration-300">
            {/* Draft invoices: Edit + Issue buttons */}
            {(invoice.status?.toLowerCase() === 'draft' || !invoice.status) && !isEditing && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Invoice
                </Button>
                <Button
                  onClick={handleIssueInvoice}
                  disabled={isIssuing}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isIssuing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Issue Invoice
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Issued/Sent invoices: Edit, Download, Print, Email, Payment buttons */}
            {(invoice.status?.toLowerCase() === 'issued' || invoice.status?.toLowerCase() === 'sent') && !isEditing && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Invoice
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleEmail} className="gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
                <Button onClick={handleApplyPayment} className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  Apply Payment
                </Button>
              </>
            )}

            {/* Paid invoices: Download, Print + Email (no editing) */}
            {invoice.status?.toLowerCase() === 'paid' && (
              <>
                <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleEmail} className="gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 bg-slate-100 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          {/* Invoice Content in White Box with Shadow */}
          <div className="bg-white rounded-lg shadow-lg">
            <InvoicePreview
              invoice={invoice}
              client={client}
              job={job}
              companyInfo={companyInfo}
              isEditing={isEditing}
              onSave={handleSaveEdit}
              onCancel={() => setIsEditing(false)}
              isSaving={isSaving}
              invoiceSettings={invoiceSettings}
            />
          </div>
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
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
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
