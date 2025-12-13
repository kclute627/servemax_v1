import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Download,
  CreditCard,
  Receipt,
  Building2,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

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

export default function ClientInvoiceDetail() {
  const { companySlug, invoiceId } = useParams();
  const navigate = useNavigate();
  const { portalData } = useClientAuth();
  const { toast } = useToast();

  const invoices = portalData?.invoices || [];
  const branding = portalData?.branding || {};
  const company = portalData?.company || {};
  const primaryColor = branding.primary_color || '#1e40af';

  // Find the invoice by ID
  const invoice = invoices.find(inv => inv.id === invoiceId);

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const d = date.toDate ? date.toDate() :
                date.seconds ? new Date(date.seconds * 1000) :
                new Date(date);
      return format(d, "MMM d, yyyy");
    } catch {
      return "N/A";
    }
  };

  const handlePayInvoice = () => {
    // TODO: Stripe PaymentIntent integration
    console.log('[Pay Invoice] Invoice ID:', invoiceId);
    console.log('[Pay Invoice] Amount:', invoice?.total || invoice?.balance_due);

    toast({
      title: "Online Payment Coming Soon",
      description: "Please contact us for payment options. We're working on enabling online payments.",
      duration: 5000,
    });
  };

  const handleDownloadPdf = () => {
    if (invoice?.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    }
  };

  const handleBack = () => {
    navigate(`/portal/${companySlug}/invoices`);
  };

  // Show not found if invoice doesn't exist
  if (!invoice) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoices
        </Button>

        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Invoice Not Found</h3>
            <p className="text-slate-500">
              The invoice you're looking for doesn't exist or you don't have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine if invoice is payable
  const isPayable = ['sent', 'pending', 'overdue', 'partially_paid', 'issued'].includes(invoice.status?.toLowerCase());
  const balanceDue = invoice.balance_due ?? invoice.amount_outstanding ?? (invoice.total - (invoice.amount_paid || 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                Invoice #{invoice.invoice_number || invoice.id?.slice(-6)}
              </h1>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status?.replace(/_/g, ' ') || 'Draft'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.pdf_url && (
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}

          {isPayable && (
            <Button
              onClick={handlePayInvoice}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Invoice Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Invoice Total */}
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-2xl font-bold text-slate-900">
                ${(invoice.total || 0).toFixed(2)}
              </p>
            </div>

            {/* Amount Paid */}
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">
                ${(invoice.amount_paid || 0).toFixed(2)}
              </p>
            </div>

            {/* Balance Due */}
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Balance Due</p>
              <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                ${balanceDue.toFixed(2)}
              </p>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Due Date</p>
              <p className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* From Company */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              From
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-slate-900">{company.name || 'Company Name'}</p>
            {company.email && <p className="text-sm text-slate-500">{company.email}</p>}
            {company.phone && <p className="text-sm text-slate-500">{company.phone}</p>}
          </CardContent>
        </Card>

        {/* Invoice Dates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Invoice Date</span>
              <span className="text-sm font-medium">{formatDate(invoice.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Due Date</span>
              <span className="text-sm font-medium">{formatDate(invoice.due_date)}</span>
            </div>
            {invoice.last_payment_date && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Last Payment</span>
                <span className="text-sm font-medium">{formatDate(invoice.last_payment_date)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 text-sm font-medium text-slate-500">Description</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-slate-500">Qty</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-slate-500">Rate</th>
                    <th className="text-right py-2 px-2 text-sm font-medium text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={item.id || index} className="border-b border-slate-100">
                      <td className="py-3 px-2 text-sm text-slate-900">
                        {item.description || item.name || 'Service'}
                      </td>
                      <td className="py-3 px-2 text-sm text-slate-600 text-right">
                        {item.quantity || 1}
                      </td>
                      <td className="py-3 px-2 text-sm text-slate-600 text-right">
                        ${(item.rate || item.unit_price || item.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-slate-900 text-right">
                        ${(item.total || item.amount || (item.quantity || 1) * (item.rate || item.unit_price || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {invoice.subtotal && invoice.subtotal !== invoice.total && (
                    <tr className="border-t border-slate-200">
                      <td colSpan={3} className="py-2 px-2 text-sm text-slate-500 text-right">Subtotal</td>
                      <td className="py-2 px-2 text-sm font-medium text-slate-900 text-right">
                        ${(invoice.subtotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {invoice.tax_amount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 px-2 text-sm text-slate-500 text-right">
                        Tax {invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}
                      </td>
                      <td className="py-2 px-2 text-sm font-medium text-slate-900 text-right">
                        ${(invoice.tax_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-2 text-base font-semibold text-slate-900 text-right">Total</td>
                    <td className="py-3 px-2 text-base font-bold text-slate-900 text-right">
                      ${(invoice.total || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Pay Now CTA for unpaid invoices */}
      {isPayable && balanceDue > 0 && (
        <Card className="border-2" style={{ borderColor: primaryColor }}>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">Ready to pay?</p>
                <p className="text-slate-500">
                  Balance due: <span className="font-bold text-slate-900">${balanceDue.toFixed(2)}</span>
                </p>
              </div>
              <Button
                size="lg"
                onClick={handlePayInvoice}
                style={{ backgroundColor: primaryColor }}
                className="text-white"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Pay ${balanceDue.toFixed(2)} Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
