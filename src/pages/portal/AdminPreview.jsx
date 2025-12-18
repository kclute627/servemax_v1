import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Briefcase,
  Receipt,
  Building2,
  Shield,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Eye,
  FileCheck,
  LockOpen,
  Lock,
  ArrowLeft,
  Calendar,
  DollarSign,
  CreditCard,
  Download,
  Printer,
  Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import JobDetailPanel from "@/components/portal/JobDetailPanel";
import { useToast } from "@/components/ui/use-toast";
import InvoicePreview from "@/components/invoicing/InvoicePreview";
import html2pdf from "html2pdf.js";

export default function AdminPreview() {
  useParams(); // Get company slug from URL (not used but ensures proper routing)
  const { toast } = useToast();

  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Filter state
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");

  useEffect(() => {
    // Get preview data from sessionStorage (set by ClientDetails page)
    const storedData = sessionStorage.getItem("admin_preview_data");
    if (storedData) {
      try {
        setPreviewData(JSON.parse(storedData));
      } catch {
        setError("Invalid preview data");
      }
    } else {
      setError("No preview data found. Please use the Preview Portal button from the client details page.");
    }
  }, []);

  const handleClose = () => {
    sessionStorage.removeItem("admin_preview_data");
    window.close();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Preview Error</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.close()}>
              Close Tab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { clientUser, company, clientCompany, branding, jobs, invoices } = previewData;
  const primaryColor = branding?.primary_color || "#1e40af";

  // Calculate stats
  const activeJobs = jobs?.filter(j => !["completed", "cancelled"].includes(j.status?.toLowerCase()))?.length || 0;
  const completedJobs = jobs?.filter(j => j.status?.toLowerCase() === "completed")?.length || 0;
  const pendingInvoices = invoices?.filter(i => i.status?.toLowerCase() !== "paid")?.length || 0;
  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

  // Filter jobs
  const filteredJobs = (jobs || []).filter(job => {
    const matchesSearch = jobSearch === "" ||
      job.defendant_name?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.case_number?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.job_number?.toString().includes(jobSearch);
    const matchesStatus = jobStatusFilter === "all" ||
      job.status?.toLowerCase() === jobStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Filter invoices
  const filteredInvoices = (invoices || []).filter(inv => {
    const matchesSearch = invoiceSearch === "" ||
      inv.invoice_number?.toString().includes(invoiceSearch);
    const matchesStatus = invoiceStatusFilter === "all" ||
      inv.status?.toLowerCase() === invoiceStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for filters
  const jobStatuses = [...new Set((jobs || []).map(j => j.status).filter(Boolean))];
  const invoiceStatuses = [...new Set((invoices || []).map(i => i.status).filter(Boolean))];

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      // Handle Firestore timestamps
      const d = date.toDate ? date.toDate() :
                date.seconds ? new Date(date.seconds * 1000) :
                date._seconds ? new Date(date._seconds * 1000) :
                new Date(date);
      if (isNaN(d.getTime())) return "—";
      return format(d, "MMM d, yyyy");
    } catch {
      return "—";
    }
  };

  // Get signed affidavit from job
  const getSignedAffidavit = (job) => {
    // Check job.documents array (fetched from documents collection)
    const fromDocuments = job.documents?.find(
      doc => doc.document_category === "affidavit" && doc.is_signed === true
    );
    if (fromDocuments?.file_url) return { url: fromDocuments.file_url };
    if (fromDocuments?.url) return { url: fromDocuments.url };

    // Check uploaded_documents array (legacy)
    const fromUploadedDocs = job.uploaded_documents?.find(
      doc => doc.document_category === "affidavit" && doc.is_signed === true
    );
    if (fromUploadedDocs?.url) return fromUploadedDocs;
    if (fromUploadedDocs?.file_url) return { url: fromUploadedDocs.file_url };

    // Check direct URL fields
    if (job.signed_affidavit_url) return { url: job.signed_affidavit_url };
    if (job.signed_affidavit_pdf_url) return { url: job.signed_affidavit_pdf_url };
    if (job.affidavit_url) return { url: job.affidavit_url };

    return null;
  };

  // Get dynamic job status display based on attempts
  const getJobStatusDisplay = (job) => {
    const attempts = job.attempts || [];
    const status = job.status?.toLowerCase();

    if (status === "served") {
      return { text: "Served", color: "bg-green-100 text-green-700" };
    }
    if (status === "non_served" || status === "unable_to_serve" || status === "failed" || status === "non-service") {
      return { text: "Non Service", color: "bg-red-100 text-red-700" };
    }
    if (attempts.length === 0) {
      return { text: "Out for Service", color: "bg-blue-100 text-blue-700" };
    }
    return { text: `Attempting (${attempts.length})`, color: "bg-amber-100 text-amber-700" };
  };

  // Toggle job selection
  const toggleJobSelection = (jobId) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Toggle all jobs selection
  const toggleAllJobs = () => {
    if (selectedJobIds.length === filteredJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(filteredJobs.map(j => j.id));
    }
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "completed" || statusLower === "paid") {
      return <Badge className="bg-green-100 text-green-700">{status}</Badge>;
    } else if (statusLower === "pending" || statusLower === "in_progress") {
      return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    } else if (statusLower === "cancelled") {
      return <Badge className="bg-red-100 text-red-700">{status}</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700">{status || "Unknown"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Preview Banner */}
      <div className="bg-amber-500 text-white py-2 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="w-4 h-4" />
          <span>Admin Preview - Viewing portal for: {clientCompany?.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-amber-600"
          onClick={handleClose}
        >
          <X className="w-4 h-4 mr-1" />
          Close Preview
        </Button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200">
          <div className="p-4 border-b border-slate-200">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={company?.name}
                className="h-12 max-w-[180px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="w-8 h-8" style={{ color: primaryColor }} />
                <span className="font-semibold text-slate-900 truncate">
                  {company?.name || "Client Portal"}
                </span>
              </div>
            )}
          </div>

          <nav className="p-2 space-y-1">
            {[
              { id: "orders", label: "Orders", icon: Briefcase },
              { id: "submit_order", label: "Submit Order", icon: Plus },
              { id: "invoices", label: "Invoices", icon: Receipt },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                style={activeTab === item.id ? { backgroundColor: primaryColor } : {}}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200 mt-auto">
            <div className="flex items-center gap-2 px-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {clientUser?.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {clientUser?.email}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500">Welcome to {company?.name}&apos;s client portal</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{activeJobs}</p>
                        <p className="text-sm text-slate-500">Active Orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{completedJobs}</p>
                        <p className="text-sm text-slate-500">Completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{pendingInvoices}</p>
                        <p className="text-sm text-slate-500">Pending Invoices</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Receipt className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                        <p className="text-sm text-slate-500">Total Billed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {jobs?.length > 0 ? (
                    <div className="space-y-3">
                      {jobs.slice(0, 5).map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedJob(job);
                            setActiveTab("orders");
                          }}
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {job.defendant_name || job.case_number || `Order #${job.job_number || job.id.slice(0,6)}`}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatDate(job.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(job.status)}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No orders yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "orders" && (
            selectedJob ? (
              <JobDetailPanel
                job={selectedJob}
                invoices={invoices}
                onClose={() => setSelectedJob(null)}
                primaryColor={primaryColor}
                onViewInvoice={(invoice) => {
                  setSelectedJob(null);
                  setSelectedInvoice(invoice);
                  setActiveTab("invoices");
                }}
              />
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
                  <p className="text-slate-500">View all orders for this client. Click a row to see details.</p>
                </div>

                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Search by name, case number..."
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {jobStatuses.map(status => (
                            <SelectItem key={status} value={status.toLowerCase()}>
                              {status.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Jobs Table */}
                {filteredJobs.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0}
                                onCheckedChange={toggleAllJobs}
                              />
                            </TableHead>
                            <TableHead>Order #</TableHead>
                            <TableHead>Client Ref #</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Case #</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-center">Open/Closed</TableHead>
                            <TableHead className="text-center">Affidavit</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Paid</TableHead>
                            <TableHead className="text-center">Invoice</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredJobs.map((job) => {
                            const primaryAddress = job.addresses?.find(a => a.primary) || job.addresses?.[0];
                            const signedAffidavit = getSignedAffidavit(job);
                            const isClosed = job.is_closed === true;
                            const recipientName = job.defendant_name || job.recipient_name || job.recipient?.name;
                            const linkedInvoice = invoices?.find(inv => inv.job_ids?.includes(job.id));
                            return (
                              <TableRow
                                key={job.id}
                                className="cursor-pointer hover:bg-slate-50"
                                onClick={() => setSelectedJob(job)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedJobIds.includes(job.id)}
                                    onCheckedChange={() => toggleJobSelection(job.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {job.job_number || job.id?.slice(0, 6)}
                                </TableCell>
                                <TableCell>
                                  {job.client_job_number || "—"}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{recipientName || "Unknown Recipient"}</p>
                                    {primaryAddress && (
                                      <p className="text-xs text-slate-500">
                                        {primaryAddress.address1}{primaryAddress.city ? `, ${primaryAddress.city}` : ""}{primaryAddress.state ? `, ${primaryAddress.state}` : ""}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {job.case_number || "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getJobStatusDisplay(job).color}>
                                    {getJobStatusDisplay(job).text}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {formatDate(job.created_at)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isClosed ? (
                                    <div className="flex items-center justify-center gap-1 text-slate-500">
                                      <Lock className="w-4 h-4" />
                                      <span className="text-xs">Closed</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1 text-green-600">
                                      <LockOpen className="w-4 h-4" />
                                      <span className="text-xs">Open</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {signedAffidavit?.url ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(signedAffidavit.url, "_blank");
                                      }}
                                      title="View signed affidavit"
                                    >
                                      <FileCheck className="w-5 h-5" />
                                    </Button>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {linkedInvoice ? `$${(linkedInvoice.total || 0).toLocaleString()}` : "—"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {linkedInvoice ? (
                                    <Badge className={linkedInvoice.status?.toLowerCase() === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                      {linkedInvoice.status?.toLowerCase() === 'paid' ? 'Paid' : 'Unpaid'}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {linkedInvoice ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvoice(linkedInvoice);
                                        setActiveTab("invoices");
                                      }}
                                      title="View invoice"
                                    >
                                      <Receipt className="w-5 h-5" />
                                    </Button>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedJob(job);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">
                        {jobSearch || jobStatusFilter !== "all"
                          ? "No orders match your search criteria"
                          : "No orders found for this client"}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                {filteredJobs.length > 0 && (
                  <p className="text-sm text-slate-500 text-center">
                    Showing {filteredJobs.length} of {jobs?.length || 0} orders
                  </p>
                )}
              </div>
            )
          )}

          {activeTab === "submit_order" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Submit New Order</h1>
                <p className="text-slate-500">This is where clients can submit new orders</p>
              </div>

              <Card>
                <CardContent className="py-12 text-center">
                  <Plus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Order Submission Form</h3>
                  <p className="text-slate-500 mb-4 max-w-md mx-auto">
                    In the real client portal, clients can submit single orders, bulk orders via form, or upload a CSV file with multiple orders.
                  </p>
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 inline-block">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Admin Preview Mode - Order submission is disabled
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "invoices" && (
            selectedInvoice ? (
              // Invoice Detail View - Matching InvoiceDetail.jsx layout
              (() => {
                // Find linked jobs for this invoice
                const linkedJobs = (jobs || []).filter(job =>
                  selectedInvoice.job_ids?.includes(job.id) ||
                  selectedInvoice.job_id === job.id
                );
                const balanceDue = selectedInvoice.balance_due ?? (selectedInvoice.total - (selectedInvoice.amount_paid || 0));
                const isPayable = ['sent', 'pending', 'overdue', 'partially_paid', 'issued'].includes(selectedInvoice.status?.toLowerCase()) && balanceDue > 0;

                const statusColors = {
                  draft: 'bg-slate-100 text-slate-700',
                  issued: 'bg-blue-100 text-blue-700',
                  sent: 'bg-blue-100 text-blue-700',
                  paid: 'bg-green-100 text-green-700',
                  overdue: 'bg-red-100 text-red-700',
                  cancelled: 'bg-slate-100 text-slate-500'
                };
                const invoiceStatusColor = statusColors[selectedInvoice.status?.toLowerCase()] || statusColors.draft;

                const handleDownloadPDF = async () => {
                  try {
                    // If pdf_url exists, just open it
                    if (selectedInvoice.pdf_url) {
                      window.open(selectedInvoice.pdf_url, '_blank');
                      return;
                    }

                    // Otherwise generate PDF from InvoicePreview
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
                      filename: `Invoice-${selectedInvoice.invoice_number || selectedInvoice.id?.slice(-6)}.pdf`,
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
                      description: `Invoice ${selectedInvoice.invoice_number || selectedInvoice.id?.slice(-6)} has been downloaded.`
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

                const handlePrint = () => {
                  window.print();
                };

                const handleEmail = () => {
                  toast({
                    title: 'Coming Soon',
                    description: 'Email functionality will be available soon.'
                  });
                };

                return (
                  <div className="h-full flex flex-col -m-6 lg:-m-8">
                    {/* Fixed Header Section */}
                    <div className="bg-white border-b border-slate-300 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedInvoice(null)}>
                            <ArrowLeft className="w-5 h-5" />
                          </Button>
                          <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                              Invoice {selectedInvoice.invoice_number || selectedInvoice.id?.slice(-6)}
                            </h1>
                            <p className="text-slate-600 mt-1">
                              {clientCompany?.name || 'Unknown Client'}
                            </p>
                          </div>
                        </div>
                        <Badge className={invoiceStatusColor}>
                          {selectedInvoice.status?.charAt(0).toUpperCase() + selectedInvoice.status?.slice(1) || 'Draft'}
                        </Badge>
                      </div>
                    </div>

                    {/* Fixed Button Bar Section */}
                    <div className="bg-slate-200/70 border-b border-slate-300 px-6 py-3">
                      <div className="flex gap-3 justify-end">
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
                        {isPayable && (
                          <Button
                            onClick={() => {
                              toast({
                                title: "Online Payment Coming Soon",
                                description: "Please contact us for payment options. We're working on enabling online payments.",
                                duration: 5000,
                              });
                            }}
                            style={{ backgroundColor: primaryColor }}
                            className="text-white gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay ${balanceDue.toFixed(2)}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 bg-slate-100 overflow-y-auto p-6 lg:p-8">
                      {/* Check for PDF URL first */}
                      {selectedInvoice.pdf_url ? (
                        <div className="bg-white rounded-lg shadow-lg">
                          <iframe
                            src={selectedInvoice.pdf_url}
                            className="w-full h-[800px] rounded-lg"
                            title={`Invoice ${selectedInvoice.invoice_number}`}
                          />
                        </div>
                      ) : (
                        /* Otherwise render InvoicePreview */
                        <div className="bg-white rounded-lg shadow-lg">
                          <InvoicePreview
                            invoice={{
                              ...selectedInvoice,
                              invoice_number: selectedInvoice.invoice_number || selectedInvoice.id?.slice(-6),
                              invoice_date: (() => {
                                const d = selectedInvoice.created_at || selectedInvoice.invoice_date;
                                if (!d) return new Date().toISOString().split('T')[0];
                                if (d.toDate) return d.toDate().toISOString().split('T')[0];
                                if (d.seconds) return new Date(d.seconds * 1000).toISOString().split('T')[0];
                                if (d._seconds) return new Date(d._seconds * 1000).toISOString().split('T')[0];
                                if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
                                if (typeof d === 'string') return d;
                                return new Date(d).toISOString().split('T')[0];
                              })(),
                              due_date: (() => {
                                const d = selectedInvoice.due_date;
                                if (!d) return null;
                                if (d.toDate) return d.toDate().toISOString().split('T')[0];
                                if (d.seconds) return new Date(d.seconds * 1000).toISOString().split('T')[0];
                                if (d._seconds) return new Date(d._seconds * 1000).toISOString().split('T')[0];
                                if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
                                if (typeof d === 'string') return d;
                                return new Date(d).toISOString().split('T')[0];
                              })(),
                              line_items: selectedInvoice.line_items || selectedInvoice.items || [],
                              balance_due: balanceDue
                            }}
                            client={{
                              company_name: clientCompany?.name,
                              addresses: clientCompany?.addresses || [],
                              contacts: clientCompany?.contacts || [],
                              primary_contact: clientCompany?.primary_contact,
                              phone: clientCompany?.phone,
                              email: clientCompany?.email
                            }}
                            job={linkedJobs[0] || null}
                            companyInfo={{
                              company_name: company?.name,
                              addresses: company?.addresses || [],
                              address1: company?.addresses?.[0]?.address1 || company?.address?.address1 || company?.address1,
                              address2: company?.addresses?.[0]?.address2 || company?.address?.address2 || company?.address2,
                              city: company?.addresses?.[0]?.city || company?.address?.city || company?.city,
                              state: company?.addresses?.[0]?.state || company?.address?.state || company?.state,
                              zip: company?.addresses?.[0]?.zip || company?.address?.zip || company?.zip,
                              phone: company?.phone,
                              email: company?.email
                            }}
                            isEditing={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              // Invoice List View
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
                  <p className="text-slate-500">View all invoices for this client</p>
                </div>

                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Search by invoice number..."
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {invoiceStatuses.map(status => (
                            <SelectItem key={status} value={status.toLowerCase()}>
                              {status.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoices Table */}
                {filteredInvoices.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvoices.map((invoice) => (
                            <TableRow
                              key={invoice.id}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <TableCell className="font-medium">
                                #{invoice.invoice_number || invoice.id?.slice(0, 6)}
                              </TableCell>
                              <TableCell>
                                {formatDate(invoice.created_at)}
                              </TableCell>
                              <TableCell>
                                {formatDate(invoice.due_date)}
                              </TableCell>
                              <TableCell>
                                ${(invoice.total || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(invoice.status)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoice(invoice);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">
                        {invoiceSearch || invoiceStatusFilter !== "all"
                          ? "No invoices match your search criteria"
                          : "No invoices found for this client"}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                {filteredInvoices.length > 0 && (
                  <p className="text-sm text-slate-500 text-center">
                    Showing {filteredInvoices.length} of {invoices?.length || 0} invoices
                  </p>
                )}
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
