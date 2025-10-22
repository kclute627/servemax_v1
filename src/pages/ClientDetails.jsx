
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Client, Job, Invoice } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Edit,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  User,
  Briefcase,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  Plus,
  Trash2,
  Loader2,
  FileText, // Added FileText icon
  AlertCircle // Added AlertCircle icon
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  inactive: { color: "bg-slate-100 text-slate-700", label: "Inactive" },
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending" }
};

const jobStatusConfig = {
  pending: { color: "bg-slate-100 text-slate-700", label: "Pending" },
  assigned: { color: "bg-blue-100 text-blue-700", label: "Assigned" },
  in_progress: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
  served: { color: "bg-green-100 text-green-700", label: "Served" },
  needs_affidavit: { color: "bg-purple-100 text-purple-700", label: "Needs Affidavit" },
  unable_to_serve: { color: "bg-red-100 text-red-700", label: "Unable to Serve" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

const invoiceStatusConfig = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  paid: { color: "bg-green-100 text-green-700", label: "Paid" },
  overdue: { color: "bg-red-100 text-red-700", label: "Overdue" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

const clientTypeConfig = {
  law_firm: { color: "bg-blue-100 text-blue-700", label: "Law Firm" },
  insurance: { color: "bg-green-100 text-green-700", label: "Insurance" },
  corporate: { color: "bg-purple-100 text-purple-700", label: "Corporate" },
  government: { color: "bg-amber-100 text-amber-700", label: "Government" },
  individual: { color: "bg-slate-100 text-slate-700", label: "Individual" },
  process_server: { color: "bg-orange-100 text-orange-700", label: "Process Server" }
};

export default function ClientDetails() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const clientId = searchParams.get('id');

  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ open: false, type: null, index: -1 });

  const loadClientData = useCallback(async () => {
    if (!isEditing) setIsLoading(true); // Only show loading spinner if not already editing
    try {
      const [clientData, jobsData, invoicesData] = await Promise.all([
        Client.findById(clientId),
        Job.filter({ client_id: clientId }),
        Invoice.filter({ client_id: clientId })
      ]);

      if (!clientData) {
        console.error('Client not found');
        setClient(null); // Ensure client is null if not found
        setJobs([]);
        setInvoices([]);
      } else {
        setClient(clientData);
        setFormData(clientData); // Initialize form data with fetched client
        setJobs(jobsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setInvoices(invoicesData.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)));
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      setClient(null); // Reset client state on error
      setJobs([]);
      setInvoices([]);
    }
    setIsLoading(false);
  }, [clientId, isEditing]);

  useEffect(() => {
    if (clientId) {
      loadClientData();
    } else {
      // If clientId becomes null (e.g., URL changes or component unmounts quickly),
      // reset state to avoid displaying stale data.
      setClient(null);
      setJobs([]);
      setInvoices([]);
      setIsLoading(false);
    }
  }, [clientId, loadClientData]);

  // --- FORM HANDLERS FOR EDIT MODE ---
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...(formData.contacts || [])];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, contacts: updatedContacts }));
  };

  const handleAddressChange = (index, field, value) => {
    const updatedAddresses = [...(formData.addresses || [])];
    updatedAddresses[index] = { ...updatedAddresses[index], [field]: value };
    setFormData(prev => ({ ...prev, addresses: updatedAddresses }));
  };

  const setPrimaryContact = (index) => {
    const updatedContacts = (formData.contacts || []).map((contact, i) => ({
      ...contact,
      primary: i === index
    }));
    setFormData(prev => ({ ...prev, contacts: updatedContacts }));
  };

  const setPrimaryAddress = (index) => {
    const updatedAddresses = (formData.addresses || []).map((address, i) => ({
      ...address,
      primary: i === index
    }));
    setFormData(prev => ({ ...prev, addresses: updatedAddresses }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), { first_name: "", last_name: "", email: "", phone: "", title: "", primary: false }]
    }));
  };

  const removeContact = (index) => {
    setFormData(prev => ({
      ...prev,
      contacts: (prev.contacts || []).filter((_, i) => i !== index)
    }));
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...(prev.addresses || []), { label: "", address1: "", city: "", state: "", postal_code: "", primary: false }]
    }));
  };

  const removeAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      addresses: (prev.addresses || []).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await Client.update(clientId, formData);
      await loadClientData(); // Reload fresh data from DB
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating client:", error);
      // Potentially show an error message to the user
    }
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setFormData(client); // Revert changes to original client data
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (showDeleteConfirm.type === 'contact') {
      removeContact(showDeleteConfirm.index);
    } else if (showDeleteConfirm.type === 'address') {
      removeAddress(showDeleteConfirm.index);
    }
    setShowDeleteConfirm({ open: false, type: null, index: -1 });
  };

  const getPrimaryContact = () => {
    return client?.contacts?.find(c => c.primary) || client?.contacts?.[0];
  };

  const getPrimaryAddress = () => {
    return client?.addresses?.find(a => a.primary) || client?.addresses?.[0];
  };

  const getJobStats = () => {
    if (!jobs) return { total: 0, completed: 0, overdue: 0 };
    const total = jobs.length;
    const completed = jobs.filter(job => job.status === 'served').length;
    const overdue = jobs.filter(job =>
      job.due_date &&
      new Date(job.due_date) < new Date() &&
      job.status !== 'served' &&
      job.status !== 'cancelled'
    ).length;

    return { total, completed, overdue };
  };

  const getInvoiceStats = () => {
    if (!invoices) return { total: 0, paid: 0, overdue: 0, totalRevenue: 0, openInvoices: 0, totalBilled: 0, totalPaid: 0, outstandingBalance: 0 };
    const total = invoices.length;
    const paid = invoices.filter(inv => inv.status === 'paid' || inv.status === 'Paid').length;
    const openInvoices = invoices.filter(inv =>
      inv.status !== 'paid' &&
      inv.status !== 'Paid' &&
      inv.status !== 'cancelled' &&
      inv.status !== 'Cancelled'
    ).length;
    const overdue = invoices.filter(inv =>
      inv.status !== 'paid' &&
      inv.status !== 'Paid' &&
      inv.due_date &&
      new Date(inv.due_date) < new Date()
    ).length;

    // Calculate financial totals with new invoice schema support
    const totalBilled = invoices.reduce((sum, inv) => {
      const amount = inv.total || inv.total_amount || 0;
      return sum + amount;
    }, 0);

    const totalPaid = invoices.reduce((sum, inv) => {
      return sum + (inv.total_paid || 0);
    }, 0);

    const outstandingBalance = invoices
      .filter(inv => inv.status !== 'paid' && inv.status !== 'Paid' && inv.status !== 'cancelled' && inv.status !== 'Cancelled')
      .reduce((sum, inv) => {
        const balance = inv.balance_due || ((inv.total || inv.total_amount || 0) - (inv.total_paid || 0));
        return sum + balance;
      }, 0);

    const totalRevenue = totalPaid; // Revenue is what's actually been paid

    return { total, paid, overdue, totalRevenue, openInvoices, totalBilled, totalPaid, outstandingBalance };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Client Not Found</h1>
          <p className="text-slate-600 mb-4">The requested client could not be found.</p>
          <Link to={createPageUrl("Clients")}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const jobStats = getJobStats();
  const invoiceStats = getInvoiceStats();
  const primaryContact = getPrimaryContact();
  const primaryAddress = getPrimaryAddress();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Clients")}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{client.company_name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={clientTypeConfig[client.company_type]?.color}>
                    {clientTypeConfig[client.company_type]?.label || client.company_type}
                  </Badge>
                  <Badge className={statusConfig[client.status]?.color}>
                    {statusConfig[client.status]?.label || client.status}
                  </Badge>
                  {client.collaborating && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      <Star className="w-3 h-3 mr-1" />
                      Collaborating
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Client
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Link to={`${createPageUrl("Jobs")}?client_id=${client.id}`} className="hover:scale-105 transition-transform">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Jobs</p>
                      <p className="text-2xl font-bold text-slate-900">{jobStats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={`${createPageUrl("Jobs")}?client_id=${client.id}&status=served`} className="hover:scale-105 transition-transform">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Completed Jobs</p>
                      <p className="text-2xl font-bold text-slate-900">{jobStats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Open Invoices</p>
                    <p className="text-2xl font-bold text-slate-900">{invoiceStats.openInvoices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to={`${createPageUrl("Accounting")}?client_id=${client.id}`} className="hover:scale-105 transition-transform">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-slate-900">${invoiceStats.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${invoiceStats.outstandingBalance > 0 ? 'bg-red-100' : 'bg-slate-100'} rounded-lg flex items-center justify-center`}>
                    <AlertCircle className={`w-5 h-5 ${invoiceStats.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Outstanding</p>
                    <p className={`text-2xl font-bold ${invoiceStats.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      ${invoiceStats.outstandingBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Client Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && formData ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="company_name">Company Name</Label>
                          <Input id="company_name" value={formData.company_name || ''} onChange={(e) => handleInputChange('company_name', e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="website">Website</Label>
                          <Input id="website" value={formData.website || ''} onChange={(e) => handleInputChange('website', e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="company_type">Company Type</Label>
                          <Select value={formData.company_type} onValueChange={(v) => handleInputChange('company_type', v)}>
                            <SelectTrigger id="company_type"><SelectValue placeholder="Select type"/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="law_firm">Law Firm</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                              <SelectItem value="corporate">Corporate</SelectItem>
                              <SelectItem value="government">Government</SelectItem>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="process_server">Process Server</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                            <SelectTrigger id="status"><SelectValue placeholder="Select status"/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="private_note">Private Notes</Label>
                        <Textarea id="private_note" value={formData.private_note || ''} onChange={(e) => handleInputChange('private_note', e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600">Company Name</label>
                          <p className="text-slate-900">{client.company_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">Company Type</label>
                          <p className="text-slate-900">{clientTypeConfig[client.company_type]?.label || client.company_type}</p>
                        </div>
                        {client.website && (
                          <div>
                            <label className="text-sm font-medium text-slate-600">Website</label>
                            <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              <Globe className="w-4 h-4" />
                              {client.website}
                            </a>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-slate-600">Status</label>
                          <Badge className={statusConfig[client.status]?.color}>
                            {statusConfig[client.status]?.label || client.status}
                          </Badge>
                        </div>
                        {client.created_date && (
                          <div>
                            <label className="text-sm font-medium text-slate-600">Client Since</label>
                            <p className="text-slate-900">{format(new Date(client.created_date), "MMM d, yyyy")}</p>
                          </div>
                        )}
                      </div>

                      {client.private_note && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">Private Notes</label>
                          <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{client.private_note}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Jobs and Invoices Tabs */}
              <Card>
                <Tabs defaultValue="jobs">
                  <CardHeader>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="jobs">Recent Jobs ({jobs.length})</TabsTrigger>
                      <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="jobs" className="space-y-4">
                      {jobs.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No jobs found for this client.</p>
                      ) : (
                        <div className="space-y-3">
                          {jobs.slice(0, 10).map((job) => (
                            <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                                    {job.job_number}
                                  </Link>
                                  <Badge className={jobStatusConfig[job.status]?.color}>
                                    {jobStatusConfig[job.status]?.label || job.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600">{job.recipient?.name}</p>
                                {job.due_date && (
                                  <p className="text-xs text-slate-500">Due: {format(new Date(job.due_date), "MMM d, yyyy")}</p>
                                )}
                              </div>
                              {job.service_fee && (
                                <div className="text-right">
                                  <p className="text-sm font-medium text-slate-900">${job.service_fee}</p>
                                </div>
                              )}
                            </div>
                          ))}
                          {jobs.length > 10 && (
                            <div className="text-center pt-4">
                              <Link to={`${createPageUrl("Jobs")}?client_id=${client.id}`}>
                                <Button variant="outline">View All Jobs ({jobs.length})</Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="invoices" className="space-y-4">
                      {invoices.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No invoices found for this client.</p>
                      ) : (
                        <>
                          {/* Invoice Summary */}
                          <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div>
                              <p className="text-xs font-medium text-blue-600">Total Billed</p>
                              <p className="text-lg font-bold text-blue-900">${invoiceStats.totalBilled.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-green-600">Paid</p>
                              <p className="text-lg font-bold text-green-900">${invoiceStats.totalPaid.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-red-600">Outstanding</p>
                              <p className="text-lg font-bold text-red-900">${invoiceStats.outstandingBalance.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {invoices.slice(0, 10).map((invoice) => {
                              const total = invoice.total || invoice.total_amount || 0;
                              const paid = invoice.total_paid || 0;
                              const balance = invoice.balance_due || (total - paid);
                              const isPaid = invoice.status === 'paid' || invoice.status === 'Paid';

                              return (
                                <Link
                                  key={invoice.id}
                                  to={`${createPageUrl("Invoices")}?id=${invoice.id}`}
                                  className="block"
                                >
                                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border hover:border-blue-200">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                                        <Badge className={invoiceStatusConfig[invoice.status?.toLowerCase()]?.color || invoiceStatusConfig[invoice.status]?.color}>
                                          {invoiceStatusConfig[invoice.status?.toLowerCase()]?.label || invoiceStatusConfig[invoice.status]?.label || invoice.status}
                                        </Badge>
                                        {invoice.locked && (
                                          <Badge variant="outline" className="text-xs">
                                            Locked
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-600">
                                        {format(new Date(invoice.invoice_date), "MMM d, yyyy")} - Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}
                                      </p>
                                      {!isPaid && paid > 0 && (
                                        <div className="mt-2">
                                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                                            <div
                                              className="bg-green-600 h-1.5 rounded-full"
                                              style={{ width: `${(paid / total) * 100}%` }}
                                            ></div>
                                          </div>
                                          <p className="text-xs text-slate-500 mt-1">
                                            ${paid.toFixed(2)} of ${total.toFixed(2)} paid
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-sm font-medium text-slate-900">${total.toFixed(2)}</p>
                                      {!isPaid && balance > 0 && (
                                        <p className="text-xs text-red-600 font-medium">Due: ${balance.toFixed(2)}</p>
                                      )}
                                      {isPaid && (
                                        <p className="text-xs text-green-600 font-medium">✓ Paid</p>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                            {invoices.length > 10 && (
                              <div className="text-center pt-4">
                                <Link to={`${createPageUrl("Accounting")}?client_id=${client.id}`}>
                                  <Button variant="outline">View All Invoices ({invoices.length})</Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            {/* Right Column - Contact & Address Info */}
            <div className="space-y-6">
              {/* Contacts */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Contacts ({formData?.contacts?.length || client?.contacts?.length || 0})</CardTitle>
                  {isEditing && <Button type="button" variant="outline" size="sm" onClick={addContact}><Plus className="w-4 h-4 mr-2" />Add</Button>}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && formData ? (
                    formData.contacts && formData.contacts.length > 0 ? (
                      formData.contacts.map((contact, index) => (
                        <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-4 relative border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label htmlFor={`contact-first_name-${index}`}>First Name</Label><Input id={`contact-first_name-${index}`} value={contact.first_name || ''} onChange={(e) => handleContactChange(index, 'first_name', e.target.value)} /></div>
                            <div><Label htmlFor={`contact-last_name-${index}`}>Last Name</Label><Input id={`contact-last_name-${index}`} value={contact.last_name || ''} onChange={(e) => handleContactChange(index, 'last_name', e.target.value)} /></div>
                            <div><Label htmlFor={`contact-email-${index}`}>Email</Label><Input id={`contact-email-${index}`} type="email" value={contact.email || ''} onChange={(e) => handleContactChange(index, 'email', e.target.value)} /></div>
                            <div><Label htmlFor={`contact-phone-${index}`}>Phone</Label><Input id={`contact-phone-${index}`} type="tel" value={contact.phone || ''} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} /></div>
                            <div className="col-span-2"><Label htmlFor={`contact-title-${index}`}>Title</Label><Input id={`contact-title-${index}`} value={contact.title || ''} onChange={(e) => handleContactChange(index, 'title', e.target.value)} /></div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPrimaryContact(index)}
                              disabled={contact.primary}
                              className="gap-2"
                            >
                              <Star className={`w-3 h-3 ${contact.primary ? 'text-yellow-400 fill-current' : 'text-slate-400'}`} />
                              {contact.primary ? 'Primary Contact' : 'Set as Primary'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
                              onClick={() => setShowDeleteConfirm({ open: true, type: 'contact', index })}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">No contacts defined. Add one to start.</p>
                    )
                  ) : (
                    client.contacts && client.contacts.length > 0 ? (
                      client.contacts.map((contact, index) => (
                        <div key={index} className="pb-3 border-b border-slate-200 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900">
                              {contact.first_name} {contact.last_name}
                            </p>
                            {contact.primary && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                <Star className="w-3 h-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          {contact.title && (
                            <p className="text-sm text-slate-600 mb-1">{contact.title}</p>
                          )}
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                                  {contact.email}
                                </a>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <a href={`tel:${contact.phone}`} className="text-sm text-blue-600 hover:text-blue-800">
                                  {contact.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">No contacts found.</p>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Addresses */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Addresses ({formData?.addresses?.length || client?.addresses?.length || 0})</CardTitle>
                  {isEditing && <Button type="button" variant="outline" size="sm" onClick={addAddress}><Plus className="w-4 h-4 mr-2" />Add</Button>}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && formData ? (
                    formData.addresses && formData.addresses.length > 0 ? (
                      formData.addresses.map((address, index) => (
                        <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-4 relative border">
                          <div><Label htmlFor={`address-label-${index}`}>Label</Label><Input id={`address-label-${index}`} value={address.label || ''} onChange={(e) => handleAddressChange(index, 'label', e.target.value)} /></div>
                          <div><Label htmlFor={`address-address1-${index}`}>Address 1</Label><Input id={`address-address1-${index}`} value={address.address1 || ''} onChange={(e) => handleAddressChange(index, 'address1', e.target.value)} /></div>
                          <div><Label htmlFor={`address-address2-${index}`}>Address 2 (Optional)</Label><Input id={`address-address2-${index}`} value={address.address2 || ''} onChange={(e) => handleAddressChange(index, 'address2', e.target.value)} /></div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label htmlFor={`address-city-${index}`}>City</Label><Input id={`address-city-${index}`} value={address.city || ''} onChange={(e) => handleAddressChange(index, 'city', e.target.value)} /></div>
                            <div><Label htmlFor={`address-state-${index}`}>State</Label><Input id={`address-state-${index}`} value={address.state || ''} onChange={(e) => handleAddressChange(index, 'state', e.target.value)} /></div>
                            <div><Label htmlFor={`address-postal_code-${index}`}>ZIP</Label><Input id={`address-postal_code-${index}`} value={address.postal_code || ''} onChange={(e) => handleAddressChange(index, 'postal_code', e.target.value)} /></div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t">
                             <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPrimaryAddress(index)}
                              disabled={address.primary}
                              className="gap-2"
                            >
                              <Star className={`w-3 h-3 ${address.primary ? 'text-yellow-400 fill-current' : 'text-slate-400'}`} />
                              {address.primary ? 'Primary Address' : 'Set as Primary'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
                              onClick={() => setShowDeleteConfirm({ open: true, type: 'address', index })}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">No addresses defined. Add one to start.</p>
                    )
                  ) : (
                    client.addresses && client.addresses.length > 0 ? (
                      client.addresses.map((address, index) => (
                        <div key={index} className="pb-3 border-b border-slate-200 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-1">
                            {address.label && (
                              <p className="text-sm font-medium text-slate-700">{address.label}</p>
                            )}
                            {address.primary && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                <Star className="w-3 h-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">
                            <p>{address.address1}</p>
                            {address.address2 && <p>{address.address2}</p>}
                            <p>{address.city}, {address.state} {address.postal_code}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">No addresses found.</p>
                    )
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-12 h-12 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-slate-900 mb-1">Are you sure?</h3>
                <p className="text-sm text-slate-600">
                  This will permanently delete this {showDeleteConfirm.type}. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm({ open: false, type: null, index: -1 })}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
