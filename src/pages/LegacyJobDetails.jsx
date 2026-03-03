import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  User,
  MapPin,
  FileText,
  Calendar,
  Building2,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  Download,
  ExternalLink,
  Scale,
  DollarSign,
  MessageSquare,
  Target,
  Loader2,
  AlertCircle,
  Printer,
  Navigation,
  Archive
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { format } from "date-fns";

export default function LegacyJobDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const jobId = searchParams.get("id");

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  // Collapsible sections
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [affidavitsOpen, setAffidavitsOpen] = useState(true);
  const [attemptsOpen, setAttemptsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "legacy_jobs", jobId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setJob({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast({
          title: "Not Found",
          description: "This legacy job could not be found.",
          variant: "destructive"
        });
        navigate("/LegacyJobs");
      }
    } catch (error) {
      console.error("Failed to load legacy job:", error);
      toast({
        title: "Error",
        description: "Failed to load job details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (amount) => {
    if (!amount && amount !== 0) return "—";
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getServiceStatusBadge = (status) => {
    const config = {
      "Served": { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
      "Non-Service": { color: "bg-red-100 text-red-700", icon: XCircle },
      "Attempted": { color: "bg-amber-100 text-amber-700", icon: Clock },
    };
    const { color, icon: Icon } = config[status] || { color: "bg-slate-100 text-slate-700", icon: Clock };
    return (
      <Badge className={`${color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status || "Unknown"}
      </Badge>
    );
  };

  const handleOpenDocument = (url) => {
    if (!url) {
      toast({
        title: "Document Unavailable",
        description: "This document link is not available or may have expired.",
        variant: "destructive"
      });
      return;
    }
    window.open(url, "_blank");
  };

  const handleOpenMap = (lat, lng) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Job not found</p>
          <Button className="mt-4" onClick={() => navigate("/LegacyJobs")}>
            Back to Legacy Jobs
          </Button>
        </div>
      </div>
    );
  }

  const recipient = job.recipient || {};
  const primaryAddress = job.addresses?.find(a => a.primary) || job.addresses?.[0];
  const courtCase = job.court_case;
  const clientCompany = job.client_company;
  const clientContact = job.client_contact;
  const serverCompany = job.process_server_company;
  const serverContact = job.process_server_contact || job.employee_process_server;
  const documents = job.documents_to_be_served || [];
  const attachments = job.misc_attachments || [];
  const affidavits = job.affidavits || [];
  const attempts = job.attempts || [];
  const notes = job.notes || [];
  const invoice = job.invoice;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => navigate("/LegacyJobs")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Archive
            </Button>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Archive className="w-6 h-6 text-slate-500" />
                  <h1 className="text-2xl font-bold text-slate-900">
                    Job #{job.servemanager_job_number || job._serveManagerId}
                  </h1>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    Read-Only
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  {getServiceStatusBadge(job.service_status)}
                  <Badge variant="outline">
                    {job.job_status || "Unknown Status"}
                  </Badge>
                  {job.rush && (
                    <Badge className="bg-red-100 text-red-700">Rush</Badge>
                  )}
                </div>
              </div>

              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recipient */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Recipient
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900">
                        {recipient.name || "Unknown Recipient"}
                      </h3>
                      {recipient.description && (
                        <p className="text-sm text-slate-600 mt-1">
                          {recipient.description}
                        </p>
                      )}
                    </div>

                    {/* Physical Description */}
                    {(recipient.age || recipient.gender || recipient.ethnicity || recipient.height || recipient.weight || recipient.hair || recipient.eyes) && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {recipient.gender && <Badge variant="outline">{recipient.gender}</Badge>}
                        {recipient.age && <Badge variant="outline">Age: {recipient.age}</Badge>}
                        {recipient.ethnicity && <Badge variant="outline">{recipient.ethnicity}</Badge>}
                        {recipient.height && <Badge variant="outline">{recipient.height}</Badge>}
                        {recipient.weight && <Badge variant="outline">{recipient.weight}</Badge>}
                        {recipient.hair && <Badge variant="outline">Hair: {recipient.hair}</Badge>}
                        {recipient.eyes && <Badge variant="outline">Eyes: {recipient.eyes}</Badge>}
                      </div>
                    )}

                    {/* Address */}
                    {primaryAddress && (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                          <div>
                            <p className="font-medium">{primaryAddress.address1}</p>
                            {primaryAddress.address2 && <p>{primaryAddress.address2}</p>}
                            <p className="text-slate-600">
                              {primaryAddress.city}, {primaryAddress.state} {primaryAddress.postal_code}
                            </p>
                            {primaryAddress.county && (
                              <p className="text-sm text-slate-500">County: {primaryAddress.county}</p>
                            )}
                            {primaryAddress.lat && primaryAddress.lng && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-blue-600"
                                onClick={() => handleOpenMap(primaryAddress.lat, primaryAddress.lng)}
                              >
                                <Navigation className="w-3 h-3 mr-1" />
                                View on Map
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Court Case */}
              {courtCase && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Scale className="w-5 h-5" />
                      Court Case
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {courtCase.case_number && (
                        <div>
                          <label className="text-sm text-slate-500">Case Number</label>
                          <p className="font-medium">{courtCase.case_number}</p>
                        </div>
                      )}
                      {courtCase.plaintiff && (
                        <div>
                          <label className="text-sm text-slate-500">Plaintiff</label>
                          <p className="font-medium">{courtCase.plaintiff}</p>
                        </div>
                      )}
                      {courtCase.defendant && (
                        <div>
                          <label className="text-sm text-slate-500">Defendant</label>
                          <p className="font-medium">{courtCase.defendant}</p>
                        </div>
                      )}
                      {courtCase.filed_on && (
                        <div>
                          <label className="text-sm text-slate-500">Filed On</label>
                          <p className="font-medium">{formatDate(courtCase.filed_on)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              {(documents.length > 0 || attachments.length > 0) && (
                <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-slate-50">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Documents ({documents.length + attachments.length})
                          </span>
                          {documentsOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-2">
                          {documents.map((doc, idx) => (
                            <div
                              key={`doc-${idx}`}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <div>
                                  <p className="font-medium text-sm">{doc.title || doc.filename}</p>
                                  <p className="text-xs text-slate-500">
                                    {doc.page_count && `${doc.page_count} pages • `}
                                    Received: {formatDate(doc.received_at)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDocument(doc.download_url)}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {attachments.map((att, idx) => (
                            <div
                              key={`att-${idx}`}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Paperclip className="w-4 h-4 text-slate-400" />
                                <div>
                                  <p className="font-medium text-sm">{att.title || att.filename}</p>
                                  <p className="text-xs text-slate-500">Attachment</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDocument(att.download_url)}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Affidavits */}
              {affidavits.length > 0 && (
                <Collapsible open={affidavitsOpen} onOpenChange={setAffidavitsOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-slate-50">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Affidavits ({affidavits.length})
                          </span>
                          {affidavitsOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-2">
                          {affidavits.map((aff, idx) => (
                            <div
                              key={`aff-${idx}`}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <div>
                                  <p className="font-medium text-sm">
                                    Affidavit {aff.reference_number || `#${idx + 1}`}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {aff.signed ? (
                                      <span className="text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Signed
                                      </span>
                                    ) : (
                                      <span className="text-amber-600">Unsigned</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDocument(aff.download_url)}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Service Attempts */}
              {attempts.length > 0 && (
                <Collapsible open={attemptsOpen} onOpenChange={setAttemptsOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-slate-50">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Service Attempts ({attempts.length})
                          </span>
                          {attemptsOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-4">
                          {attempts.map((attempt, idx) => (
                            <div
                              key={`attempt-${idx}`}
                              className="p-4 border rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {attempt.success ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                  )}
                                  <span className="font-medium">
                                    {attempt.success ? "Served" : "Unsuccessful"}
                                  </span>
                                  {attempt.serve_type && (
                                    <Badge variant="outline">{attempt.serve_type}</Badge>
                                  )}
                                </div>
                                <span className="text-sm text-slate-500">
                                  {formatDateTime(attempt.served_at || attempt.created_at)}
                                </span>
                              </div>

                              {attempt.description && (
                                <p className="text-slate-700 text-sm mb-3">
                                  {attempt.description}
                                </p>
                              )}

                              {attempt.gps && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto text-blue-600 text-xs"
                                  onClick={() => handleOpenMap(attempt.gps.lat, attempt.gps.lng)}
                                >
                                  <Navigation className="w-3 h-3 mr-1" />
                                  GPS: {attempt.gps.lat.toFixed(4)}, {attempt.gps.lng.toFixed(4)}
                                </Button>
                              )}

                              {attempt.attachments && attempt.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {attempt.attachments.map((att, attIdx) => (
                                    <Button
                                      key={attIdx}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenDocument(att.download_url)}
                                    >
                                      <Paperclip className="w-3 h-3 mr-1" />
                                      {att.filename || `Attachment ${attIdx + 1}`}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Notes */}
              {notes.length > 0 && (
                <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-slate-50">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Notes ({notes.length})
                          </span>
                          {notesOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-3">
                          {notes.map((note, idx) => (
                            <div
                              key={`note-${idx}`}
                              className="p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {note.label && (
                                    <Badge variant="outline" className="text-xs">
                                      {note.label}
                                    </Badge>
                                  )}
                                  {note.created_by && (
                                    <span className="text-xs text-slate-500">
                                      by {note.created_by}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">
                                  {formatDateTime(note.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {note.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Invoice */}
              {invoice && (
                <Collapsible open={invoiceOpen} onOpenChange={setInvoiceOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-slate-50">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Invoice
                          </span>
                          {invoiceOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b">
                            <span className="text-slate-600">Issued:</span>
                            <span className="font-medium">{formatDate(invoice.issued_on)}</span>
                          </div>

                          {/* Line Items */}
                          {invoice.line_items && invoice.line_items.length > 0 && (
                            <div className="space-y-2">
                              {invoice.line_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-slate-600">
                                    {item.name}
                                    {item.quantity > 1 && ` x${item.quantity}`}
                                  </span>
                                  <span>{formatMoney(item.unit_cost * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-3 border-t space-y-2">
                            <div className="flex justify-between font-medium">
                              <span>Total</span>
                              <span>{formatMoney(invoice.balance_due + invoice.total_paid)}</span>
                            </div>
                            {invoice.total_paid > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Paid</span>
                                <span>-{formatMoney(invoice.total_paid)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg">
                              <span>Balance Due</span>
                              <span className={invoice.balance_due > 0 ? "text-red-600" : "text-green-600"}>
                                {formatMoney(invoice.balance_due)}
                              </span>
                            </div>
                          </div>

                          {invoice.paid_on && (
                            <div className="pt-3 border-t text-center">
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Paid on {formatDate(invoice.paid_on)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5" />
                    Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created</span>
                    <span className="font-medium">{formatDate(job.created_at)}</span>
                  </div>
                  {job.due_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due</span>
                      <span className="font-medium">{formatDate(job.due_date)}</span>
                    </div>
                  )}
                  {job.archived_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Archived</span>
                      <span className="font-medium">{formatDate(job.archived_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client */}
              {(clientCompany || clientContact) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="w-5 h-5" />
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {clientCompany?.name && (
                      <p className="font-medium">{clientCompany.name}</p>
                    )}
                    {clientContact && (
                      <div className="text-sm space-y-1">
                        {(clientContact.first_name || clientContact.last_name) && (
                          <p>{clientContact.first_name} {clientContact.last_name}</p>
                        )}
                        {clientContact.email && (
                          <p className="flex items-center gap-1 text-slate-500">
                            <Mail className="w-3 h-3" /> {clientContact.email}
                          </p>
                        )}
                        {clientContact.phone && (
                          <p className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-3 h-3" /> {clientContact.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Server */}
              {(serverCompany || serverContact) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-5 h-5" />
                      Process Server
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {serverCompany?.name && (
                      <p className="font-medium">{serverCompany.name}</p>
                    )}
                    {serverContact && (
                      <div className="text-sm space-y-1">
                        {(serverContact.first_name || serverContact.last_name) && (
                          <p>{serverContact.first_name} {serverContact.last_name}</p>
                        )}
                        {serverContact.email && (
                          <p className="flex items-center gap-1 text-slate-500">
                            <Mail className="w-3 h-3" /> {serverContact.email}
                          </p>
                        )}
                        {serverContact.phone && (
                          <p className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-3 h-3" /> {serverContact.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              {(job.service_instructions || job.instructions_from_client) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {job.service_instructions && (
                      <div>
                        <label className="text-xs text-slate-500 uppercase">Service Instructions</label>
                        <p className="text-sm whitespace-pre-wrap">{job.service_instructions}</p>
                      </div>
                    )}
                    {job.instructions_from_client && (
                      <div>
                        <label className="text-xs text-slate-500 uppercase">Client Instructions</label>
                        <p className="text-sm whitespace-pre-wrap">{job.instructions_from_client}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              {job.client_job_number && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reference Numbers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Client Job #</span>
                      <span className="font-medium">{job.client_job_number}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
