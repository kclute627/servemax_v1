import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { FirebaseFunctions } from "@/firebase/functions";

const getStatusColor = (status) => {
  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    sent: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-800",
    partially_paid: "bg-orange-100 text-orange-800"
  };
  return statusColors[status?.toLowerCase()] || "bg-slate-100 text-slate-800";
};

export default function PublicInvoice() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentJustCompleted, setPaymentJustCompleted] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [token]);

  // Handle payment success/cancel from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setPaymentJustCompleted(true);
      toast({
        title: "Payment Successful!",
        description: "Thank you for your payment. A confirmation email will be sent shortly.",
        duration: 8000,
      });
      // Reload to show updated status
      loadInvoice();
    } else if (paymentStatus === 'canceled') {
      toast({
        title: "Payment Canceled",
        description: "Your payment was not completed. You can try again when you're ready.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [searchParams]);

  const loadInvoice = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await FirebaseFunctions.getInvoiceByPaymentToken(token);

      if (result.invoice) {
        setInvoice(result.invoice);
        setCompany(result.company);
      } else {
        setError("Invoice not found");
      }
    } catch (err) {
      console.error("Error loading invoice:", err);
      setError(err.message || "Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const d = date.toDate ? date.toDate() :
                date.seconds ? new Date(date.seconds * 1000) :
                date._seconds ? new Date(date._seconds * 1000) :
                new Date(date);
      return format(d, "MMM d, yyyy");
    } catch {
      return "N/A";
    }
  };

  const handlePayInvoice = async () => {
    if (!company?.stripe_connect_account_id || company?.stripe_connect_status !== 'connected') {
      toast({
        title: "Online Payment Not Available",
        description: "This company hasn't set up online payments yet. Please contact them for alternative payment options.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const result = await FirebaseFunctions.createInvoicePaymentCheckout({
        invoiceId: invoice.id,
        companyId: company.id,
        successUrl: `${window.location.origin}/pay/${token}?payment=success`,
        cancelUrl: `${window.location.origin}/pay/${token}?payment=canceled`
      });

      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start payment. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Invoice Not Found</h2>
            <p className="text-slate-600">
              This invoice link is invalid or has expired. Please contact the company for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate balance
  const balanceDue = invoice.balance_due ?? invoice.amount_outstanding ??
    ((invoice.total_amount || invoice.total || 0) - (invoice.amount_paid || 0));
  const totalAmount = invoice.total_amount || invoice.total || 0;
  const isPaid = invoice.status?.toLowerCase() === 'paid' || (balanceDue <= 0 && totalAmount > 0);
  // Show pay button for any non-cancelled invoice with a balance due
  const isPayable = !isPaid && invoice.status?.toLowerCase() !== 'cancelled' && balanceDue > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Payment Success Banner - shown when returning from Stripe */}
      {paymentJustCompleted && (
        <div className="bg-green-600 text-white py-4 px-6">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <div className="text-center">
              <p className="font-semibold text-lg">Payment Successful!</p>
              <p className="text-green-100 text-sm">
                Thank you for your payment. Your invoice will be updated shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Company Header */}
        <div className="text-center mb-8">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-12 mx-auto mb-3" />
          ) : (
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          )}
          <h1 className="text-2xl font-bold text-slate-900">{company?.name || "Invoice"}</h1>
          {company?.email && (
            <p className="text-slate-500 text-sm mt-1">{company.email}</p>
          )}
        </div>

        {/* Invoice Status Banner */}
        {isPaid ? (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div className="text-center">
                  <h2 className="text-xl font-bold text-green-800">Invoice Paid</h2>
                  <p className="text-green-600">Thank you for your payment!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Main Invoice Card */}
        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-slate-400" />
                <div>
                  <CardTitle>Invoice #{invoice.invoice_number || invoice.id?.slice(-8)}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Issued {formatDate(invoice.created_at || invoice.invoice_date)}
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status?.replace(/_/g, ' ') || 'Pending'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="py-6">
            {/* Amount Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(invoice.amount_paid || 0).toFixed(2)}
                </p>
              </div>

              <div className={`text-center p-4 rounded-lg ${balanceDue > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500 mb-1">Balance Due</p>
                <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  ${balanceDue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Due Date */}
            {invoice.due_date && (
              <div className="flex items-center justify-center gap-2 text-slate-600 mb-6">
                <Calendar className="w-4 h-4" />
                <span>Due by {formatDate(invoice.due_date)}</span>
              </div>
            )}

            {/* Invoice Details */}
            {(invoice.description || invoice.job_reference || invoice.reference) && (
              <div className="border-t pt-6">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Details
                </h3>
                {invoice.description && (
                  <p className="text-slate-600 mb-2">{invoice.description}</p>
                )}
                {(invoice.job_reference || invoice.reference) && (
                  <p className="text-sm text-slate-500">
                    Reference: {invoice.job_reference || invoice.reference}
                  </p>
                )}
              </div>
            )}

            {/* Line Items if available */}
            {invoice.line_items && invoice.line_items.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-medium text-slate-900 mb-3">Line Items</h3>
                <div className="space-y-2">
                  {invoice.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-slate-900">{item.description || item.name}</p>
                        {item.quantity && (
                          <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                        )}
                      </div>
                      <p className="font-medium text-slate-900">
                        ${(item.amount || item.total || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pay Now Button */}
            {isPayable && (
              <div className="border-t pt-6 mt-6">
                <Button
                  onClick={handlePayInvoice}
                  disabled={isProcessingPayment}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay ${balanceDue.toFixed(2)} Now
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-slate-500 mt-3">
                  Secure payment powered by Stripe
                </p>
                {company?.credit_card_fee_enabled && company?.credit_card_fee_percent > 0 && (
                  <p className="text-center text-xs text-slate-400 mt-1">
                    A {company.credit_card_fee_percent}% credit card processing fee will be applied
                  </p>
                )}
              </div>
            )}

            {/* Contact Info */}
            {!isPayable && !isPaid && (
              <div className="border-t pt-6 mt-6 text-center">
                <p className="text-slate-600">
                  Questions about this invoice? Contact{" "}
                  <a href={`mailto:${company?.email}`} className="text-blue-600 hover:underline">
                    {company?.email || "the company"}
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-400">
          <p>Powered by Diligence</p>
        </div>
      </div>
    </div>
  );
}
