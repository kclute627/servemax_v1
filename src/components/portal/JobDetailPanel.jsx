import React from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  Download,
  Printer,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function JobDetailPanel({
  job,
  invoices = [],
  onClose,
  primaryColor = "#1e40af",
  onViewInvoice,
  onPrintInvoice
}) {
  if (!job) return null;

  // Find linked invoice for this job
  const linkedInvoice = invoices.find(inv =>
    inv.job_id === job.id ||
    inv.job_ids?.includes(job.id) ||
    inv.items?.some(item => item.job_id === job.id)
  );

  // Get signed affidavit from documents collection (attached by getClientPortalData)
  // or fall back to uploaded_documents for backwards compatibility
  const signedAffidavit = job.documents?.find(
    doc => doc.document_category === 'affidavit' && doc.is_signed === true
  ) || job.uploaded_documents?.find(
    doc => doc.document_category === 'affidavit' && doc.is_signed === true
  );

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const d = date.toDate ? date.toDate() :
                date.seconds ? new Date(date.seconds * 1000) :
                new Date(date);
      return format(d, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "N/A";
    }
  };

  const formatDateShort = (date) => {
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

  // Map status to portal-friendly display labels
  const getStatusLabel = (status) => {
    const labels = {
      pending: "Out For Service",
      in_progress: "In Progress",
      assigned: "Assigned",
      served: "Served",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled"
    };
    return labels[status?.toLowerCase()] || status?.replace(/_/g, ' ') || 'Out For Service';
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "completed" || statusLower === "served") {
      return <Badge className="bg-green-100 text-green-700">{getStatusLabel(status)}</Badge>;
    } else if (statusLower === "pending" || statusLower === "in_progress" || statusLower === "assigned") {
      return <Badge className="bg-blue-100 text-blue-700">{getStatusLabel(status)}</Badge>;
    } else if (statusLower === "cancelled" || statusLower === "failed") {
      return <Badge className="bg-red-100 text-red-700">{getStatusLabel(status)}</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700">{getStatusLabel(status)}</Badge>;
  };

  const getAttemptIcon = (result) => {
    const resultLower = result?.toLowerCase() || "";
    if (resultLower === "served" || resultLower === "completed" || resultLower === "successful") {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    } else if (resultLower === "no_answer" || resultLower === "not_home" || resultLower === "no answer") {
      return <Clock className="w-5 h-5 text-amber-600" />;
    } else if (resultLower === "failed" || resultLower === "bad_address" || resultLower === "bad address") {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    return <AlertCircle className="w-5 h-5 text-slate-400" />;
  };

  const primaryAddress = job.addresses?.find(a => a.primary) || job.addresses?.[0];

  const handleDownloadAffidavit = () => {
    if (signedAffidavit?.url) {
      window.open(signedAffidavit.url, '_blank');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-lg font-semibold text-slate-900">Job Details</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Job Info Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {job.defendant_name || `Job #${job.job_number || job.id?.slice(0, 6)}`}
                </h3>
                {job.case_number && (
                  <p className="text-sm text-slate-500">Case: {job.case_number}</p>
                )}
              </div>
              {getStatusBadge(job.status)}
            </div>

            <div className="space-y-2 text-sm">
              {primaryAddress && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {primaryAddress.address1}
                    {primaryAddress.address2 && `, ${primaryAddress.address2}`}
                    <br />
                    {primaryAddress.city}, {primaryAddress.state} {primaryAddress.postal_code}
                  </span>
                </div>
              )}

              {job.created_at && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Created: {formatDateShort(job.created_at)}</span>
                </div>
              )}

              {job.plaintiff && (
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 shrink-0" />
                  <span>Plaintiff: {job.plaintiff}</span>
                </div>
              )}

              {job.court_name && (
                <div className="flex items-center gap-2 text-slate-600">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Court: {job.court_name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Attempts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Service Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.attempts && job.attempts.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-200" />

                <div className="space-y-4">
                  {job.attempts.map((attempt, index) => (
                    <div key={attempt.id || index} className="relative flex gap-3 pl-7">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-0.5">
                        {getAttemptIcon(attempt.result || attempt.attempt_result)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 capitalize">
                            {(attempt.result || attempt.attempt_result)?.replace(/_/g, ' ') || 'Attempted'}
                          </span>
                          <span className="text-sm text-slate-500">
                            {formatDate(attempt.attempt_date || attempt.created_at)}
                          </span>
                        </div>
                        {(attempt.notes || attempt.attempt_notes) && (
                          <p className="text-sm text-slate-600 mt-1">
                            {attempt.notes || attempt.attempt_notes}
                          </p>
                        )}
                        {attempt.server_name && (
                          <p className="text-xs text-slate-400 mt-1">
                            Server: {attempt.server_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                No service attempts recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Affidavit Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Affidavit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.has_signed_affidavit || signedAffidavit ? (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Signed Affidavit Available</p>
                    <p className="text-sm text-green-600">
                      {signedAffidavit?.name || 'Affidavit of Service'}
                    </p>
                  </div>
                </div>
                {signedAffidavit?.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAffidavit}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Clock className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Pending</p>
                  <p className="text-sm text-slate-500">
                    Affidavit will be available after service is completed
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            {linkedInvoice ? (
              <div className={`p-3 rounded-lg border ${
                linkedInvoice.status?.toLowerCase() === 'paid'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">
                        Invoice #{linkedInvoice.invoice_number || linkedInvoice.id?.slice(0, 6)}
                      </p>
                      <Badge className={
                        linkedInvoice.status?.toLowerCase() === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }>
                        {linkedInvoice.status || 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Amount: ${(linkedInvoice.total || linkedInvoice.amount || 0).toLocaleString()}
                    </p>
                    {linkedInvoice.due_date && (
                      <p className="text-xs text-slate-500">
                        Due: {formatDateShort(linkedInvoice.due_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onViewInvoice && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewInvoice(linkedInvoice)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    )}
                    {onPrintInvoice && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPrintInvoice(linkedInvoice)}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Receipt className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">No Invoice</p>
                  <p className="text-sm text-slate-500">
                    No invoice has been created for this job yet
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
