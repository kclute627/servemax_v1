
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Client, Job, Invoice } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useGlobalData } from '@/components/GlobalDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
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
  FileText,
  AlertCircle,
  Handshake,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Filter,
  ChevronDown,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import AddressAutocomplete from '@/components/jobs/AddressAutocomplete';
import { useToast } from '@/components/ui/use-toast';
import { FirebaseFunctions } from '@/firebase/functions';
import { InvoiceManager } from '@/firebase/invoiceManager';

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

const getJobStatusDisplay = (status, kanbanColumns) => {
  if (jobStatusConfig[status]) {
    return jobStatusConfig[status];
  }
  if (kanbanColumns && kanbanColumns.length > 0) {
    const column = kanbanColumns.find(col => col.id === status);
    if (column) {
      let color = "bg-slate-100 text-slate-700";
      const title = column.title.toLowerCase();
      if (title.includes('pending') || title.includes('new')) {
        color = "bg-slate-100 text-slate-700";
      } else if (title.includes('assigned') || title.includes('active')) {
        color = "bg-blue-100 text-blue-700";
      } else if (title.includes('progress') || title.includes('working')) {
        color = "bg-amber-100 text-amber-700";
      } else if (title.includes('served') || title.includes('complete')) {
        color = "bg-green-100 text-green-700";
      } else if (title.includes('unable') || title.includes('failed')) {
        color = "bg-red-100 text-red-700";
      }
      return { color, label: column.title };
    }
  }
  return { color: "bg-slate-100 text-slate-700", label: "Unknown" };
};

const invoiceStatusConfig = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  issued: { color: "bg-blue-100 text-blue-700", label: "Issued" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  partial: { color: "bg-amber-100 text-amber-700", label: "Partial" },
  partially_paid: { color: "bg-amber-100 text-amber-700", label: "Partial" },
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
  process_serving: { color: "bg-orange-100 text-orange-700", label: "Process Serving Company" },
  independent_process_server: { color: "bg-indigo-100 text-indigo-700", label: "Independent Process Server" }
};

export default function ClientDetails() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { companySettings, companyData, employees } = useGlobalData();
  const kanbanColumns = companySettings?.kanbanBoard?.columns || [];
  const location = useLocation();
  const navigate = useNavigate();
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
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ open: false, type: null, index: -1 });

  // State for portal preview
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Filter state for jobs and invoices tables
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState('');
  const [invoiceDateTo, setInvoiceDateTo] = useState('');
  const [invoiceAmountMin, setInvoiceAmountMin] = useState('');
  const [invoiceAmountMax, setInvoiceAmountMax] = useState('');
  const [invoiceShowFilters, setInvoiceShowFilters] = useState(false);

  // Pagination state
  const [jobsPage, setJobsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const JOBS_PER_PAGE = 15;
  const INVOICES_PER_PAGE = 15;

  // Selection state for jobs and invoices
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState(new Set());

  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailContactToggles, setEmailContactToggles] = useState({});
  const [emailEmployeeToggles, setEmailEmployeeToggles] = useState({});
  const [emailAdditional, setEmailAdditional] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Helper function to safely convert Firestore timestamps to Date objects
  const toDate = (dateValue) => {
    if (!dateValue) return null;

    // If it's already a Date object
    if (dateValue instanceof Date) return dateValue;

    // If it's a Firestore Timestamp (has toDate method)
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }

    // If it's a string or number, try to convert
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  };

  // Helper to safely format dates
  const formatDate = (dateValue, formatString) => {
    const date = toDate(dateValue);
    if (!date) return 'N/A';

    try {
      return format(date, formatString);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const loadClientData = useCallback(async () => {
    if (!isEditing) setIsLoading(true); // Only show loading spinner if not already editing
    try {
      const [clientData, jobsData, invoicesData] = await Promise.all([
        Client.findById(clientId),
        Job.filter({ client_id: clientId, company_id: user?.company_id }),
        Invoice.filter({ client_id: clientId, company_id: user?.company_id })
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
  }, [clientId, isEditing, user]);

  useEffect(() => {
    if (clientId && user?.company_id) {
      loadClientData();
    } else if (clientId && !user?.company_id) {
      // Waiting for user data
      setIsLoading(true);
    } else {
      // If clientId becomes null (e.g., URL changes or component unmounts quickly),
      // reset state to avoid displaying stale data.
      setClient(null);
      setJobs([]);
      setInvoices([]);
      setIsLoading(false);
    }
  }, [clientId, loadClientData, user]);

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

  const handleAddressAutocompleteSelect = (index, addressDetails) => {
    setFormData(prev => ({
      ...prev,
      addresses: (prev.addresses || []).map((address, i) =>
        i === index ? {
          ...address,
          address1: addressDetails.address1 || '',
          city: addressDetails.city || '',
          state: addressDetails.state || '',
          postal_code: addressDetails.postal_code || '',
          county: addressDetails.county || '',
          latitude: addressDetails.latitude || null,
          longitude: addressDetails.longitude || null
        } : address
      )
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await Client.update(clientId, formData);
      await loadClientData(); // Reload fresh data from DB
      setIsEditing(false);
      toast({
        title: "Client updated successfully",
        description: "All changes have been saved.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Error updating client",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
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

  const handlePreviewPortal = async () => {
    setIsGeneratingPreview(true);
    try {
      const result = await FirebaseFunctions.generateClientPortalPreview(client.id);
      if (result.success) {
        sessionStorage.setItem('admin_preview_data', JSON.stringify(result.previewData));
        window.open(result.portalUrl, '_blank');
      }
    } catch (error) {
      console.error('Portal preview error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate portal preview'
      });
    } finally {
      setIsGeneratingPreview(false);
    }
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
      return sum + (inv.amount_paid || inv.total_paid || 0);
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

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesStatus = jobStatusFilter === 'all' || job.status === jobStatusFilter;
      const searchLower = jobSearch.toLowerCase();
      const matchesSearch = !jobSearch ||
        job.job_number?.toLowerCase().includes(searchLower) ||
        job.recipient?.name?.toLowerCase().includes(searchLower);
      return matchesStatus && matchesSearch;
    });
  }, [jobs, jobStatusFilter, jobSearch]);

  // Derive effective status from payment data (handles stale DB status)
  const getEffectiveInvoiceStatus = (inv) => {
    const total = inv.total || inv.total_amount || 0;
    const paid = inv.amount_paid || inv.total_paid || 0;
    const raw = inv.status?.toLowerCase() || 'draft';
    if (paid > 0 && total > 0 && paid >= total) return 'paid';
    if (paid > 0 && total > 0 && paid < total) return 'partially_paid';
    return raw;
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const effectiveStatus = getEffectiveInvoiceStatus(inv);

      // Status filter — "unpaid" is a virtual group
      let matchesStatus = true;
      if (invoiceStatusFilter === 'unpaid') {
        matchesStatus = effectiveStatus !== 'paid' && effectiveStatus !== 'cancelled' && effectiveStatus !== 'draft';
      } else if (invoiceStatusFilter !== 'all') {
        matchesStatus = effectiveStatus === invoiceStatusFilter;
      }

      // Search
      const searchLower = invoiceSearch.toLowerCase();
      const matchesSearch = !invoiceSearch ||
        inv.invoice_number?.toLowerCase().includes(searchLower);

      // Date range (invoice date)
      let matchesDate = true;
      if (invoiceDateFrom) {
        const invDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
        if (invDate) matchesDate = invDate >= new Date(invoiceDateFrom + 'T00:00:00');
        else matchesDate = false;
      }
      if (matchesDate && invoiceDateTo) {
        const invDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
        if (invDate) matchesDate = invDate <= new Date(invoiceDateTo + 'T23:59:59');
        else matchesDate = false;
      }

      // Amount range
      let matchesAmount = true;
      const invTotal = inv.total || inv.total_amount || 0;
      if (invoiceAmountMin !== '') {
        matchesAmount = invTotal >= parseFloat(invoiceAmountMin);
      }
      if (matchesAmount && invoiceAmountMax !== '') {
        matchesAmount = invTotal <= parseFloat(invoiceAmountMax);
      }

      return matchesStatus && matchesSearch && matchesDate && matchesAmount;
    });
  }, [invoices, invoiceStatusFilter, invoiceSearch, invoiceDateFrom, invoiceDateTo, invoiceAmountMin, invoiceAmountMax]);

  // Stats derived from filtered invoices
  const filteredInvoiceStats = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((sum, inv) => sum + (inv.total || inv.total_amount || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_paid || inv.total_paid || 0), 0);
    const outstandingBalance = filteredInvoices
      .filter(inv => getEffectiveInvoiceStatus(inv) !== 'paid' && getEffectiveInvoiceStatus(inv) !== 'cancelled')
      .reduce((sum, inv) => {
        const total = inv.total || inv.total_amount || 0;
        const paid = inv.amount_paid || inv.total_paid || 0;
        const balance = inv.balance_due ?? (total - paid);
        return sum + (isNaN(balance) ? 0 : Math.max(0, balance));
      }, 0);
    return { totalBilled, totalPaid, outstandingBalance };
  }, [filteredInvoices]);

  // Reset pages when filters change
  useEffect(() => { setJobsPage(1); }, [jobStatusFilter, jobSearch]);
  useEffect(() => { setInvoicesPage(1); }, [invoiceStatusFilter, invoiceSearch, invoiceDateFrom, invoiceDateTo, invoiceAmountMin, invoiceAmountMax]);

  // Pagination computations
  const jobsTotalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = filteredJobs.slice((jobsPage - 1) * JOBS_PER_PAGE, jobsPage * JOBS_PER_PAGE);

  const invoicesTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / INVOICES_PER_PAGE));
  const paginatedInvoices = filteredInvoices.slice((invoicesPage - 1) * INVOICES_PER_PAGE, invoicesPage * INVOICES_PER_PAGE);

  // Active filter count for invoices badge
  const invoiceActiveFilterCount = [
    invoiceStatusFilter !== 'all',
    invoiceDateFrom || invoiceDateTo,
    invoiceAmountMin !== '' || invoiceAmountMax !== '',
  ].filter(Boolean).length;

  // Selection helpers for jobs
  const allJobsSelected = filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.has(j.id));
  const someJobsSelected = filteredJobs.some(j => selectedJobIds.has(j.id));

  const toggleJobSelection = (jobId) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleAllJobs = () => {
    if (allJobsSelected) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(filteredJobs.map(j => j.id)));
    }
  };

  // Selection helpers for invoices
  const allInvoicesSelected = filteredInvoices.length > 0 && filteredInvoices.every(i => selectedInvoiceIds.has(i.id));
  const someInvoicesSelected = filteredInvoices.some(i => selectedInvoiceIds.has(i.id));

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  const toggleAllInvoices = () => {
    if (allInvoicesSelected) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  // Open the email dialog for selected invoices
  const openEmailDialog = () => {
    // Initialize client contact toggles (all with email enabled by default)
    const contactToggles = {};
    (client?.contacts || []).forEach((contact, idx) => {
      if (contact.email) {
        contactToggles[idx] = true;
      }
    });
    setEmailContactToggles(contactToggles);
    setEmailEmployeeToggles({});
    setEmailMessage('');
    setEmailAdditional('');
    setShowEmailDialog(true);
  };

  // Send bulk invoice email
  const handleSendInvoiceEmail = async () => {
    // Collect recipients
    const recipients = [];
    (client?.contacts || []).forEach((contact, idx) => {
      if (emailContactToggles[idx] && contact.email) {
        recipients.push(contact.email);
      }
    });
    (employees || []).forEach((emp) => {
      if (emailEmployeeToggles[emp.id] && emp.email) {
        recipients.push(emp.email);
      }
    });
    // Add manual emails (comma or space separated)
    if (emailAdditional.trim()) {
      emailAdditional.split(/[,;\s]+/).filter(e => e.includes('@')).forEach(e => recipients.push(e.trim()));
    }

    if (recipients.length === 0) {
      toast({ title: 'No recipients', description: 'Please select at least one recipient.', variant: 'destructive' });
      return;
    }

    const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.has(inv.id));
    if (selectedInvoices.length === 0) return;

    setIsSendingEmail(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.usediligence.com';

      const companyName = companyData?.name || user?.company?.name || 'Our Company';
      const companyEmail = companyData?.email || '';
      const companyPhone = companyData?.phone || '';
      const brandColor = companyData?.branding?.primary_color || '#1e40af';

      // Ensure each selected invoice has a payment token and build link data
      const invoiceLinkData = [];
      for (const inv of selectedInvoices) {
        let token = inv.payment_token;
        if (!token) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
          token = '';
          for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          await Invoice.update(inv.id, { payment_token: token, updated_at: new Date() });
        }
        const total = inv.total || inv.total_amount || 0;
        const paid = inv.amount_paid || inv.total_paid || 0;
        const balance = Math.max(0, total - paid);
        const isPaid = paid >= total && total > 0;
        invoiceLinkData.push({
          invoice_number: inv.invoice_number,
          total: total.toFixed(2),
          paid: paid.toFixed(2),
          balance: balance.toFixed(2),
          isPaid,
          due_date: inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : 'N/A',
          url: `${baseUrl}/pay/${token}`,
        });
      }

      const totalOutstanding = invoiceLinkData.reduce((sum, d) => sum + parseFloat(d.balance), 0);
      const totalBilled = invoiceLinkData.reduce((sum, d) => sum + parseFloat(d.total), 0);
      const totalPaidAmount = invoiceLinkData.reduce((sum, d) => sum + parseFloat(d.paid), 0);
      const hasUnpaid = invoiceLinkData.some(d => !d.isPaid);

      // Build professional statement-style HTML email
      const invoiceRowsHtml = invoiceLinkData.map(d => {
        const statusBadge = d.isPaid
          ? `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:#dcfce7;color:#166534;">Paid</span>`
          : `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e;">Outstanding</span>`;
        const actionBtn = d.isPaid
          ? `<a href="${d.url}" style="display:inline-block;padding:6px 16px;border-radius:6px;font-size:12px;font-weight:600;color:${brandColor};border:1px solid ${brandColor};text-decoration:none;">View</a>`
          : `<a href="${d.url}" style="display:inline-block;padding:6px 16px;border-radius:6px;font-size:12px;font-weight:600;color:#ffffff;background:${brandColor};text-decoration:none;">Pay $${d.balance}</a>`;
        return `<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#0f172a;">${d.invoice_number}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#334155;">$${d.total}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#334155;">${d.due_date}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;">${statusBadge}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">${actionBtn}</td>
        </tr>`;
      }).join('');

      const messageHtml = emailMessage
        ? `<div style="padding:16px 24px;color:#334155;font-size:14px;line-height:1.6;">${emailMessage.replace(/\n/g, '<br/>')}</div>`
        : '';

      const body = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">
          <!-- Header -->
          <div style="background:${brandColor};padding:32px 24px;border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px 0;font-weight:700;">${companyName}</h1>
            <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">Account Statement</p>
          </div>

          <!-- Client info bar -->
          <div style="background:#f8fafc;padding:16px 24px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;font-size:13px;color:#64748b;">Prepared for</p>
            <p style="margin:2px 0 0 0;font-size:15px;font-weight:600;color:#0f172a;">${client?.company_name || 'Client'}</p>
            <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">${format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          ${messageHtml}

          <!-- Summary cards -->
          <div style="padding:20px 24px 0 24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="text-align:center;padding:16px;background:#f8fafc;border-radius:8px;width:33%;">
                  <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Total Billed</p>
                  <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;color:#0f172a;">$${totalBilled.toFixed(2)}</p>
                </td>
                <td style="width:8px;"></td>
                <td style="text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;width:33%;">
                  <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#166534;font-weight:600;">Paid</p>
                  <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;color:#166534;">$${totalPaidAmount.toFixed(2)}</p>
                </td>
                <td style="width:8px;"></td>
                <td style="text-align:center;padding:16px;background:${totalOutstanding > 0 ? '#fef2f2' : '#f0fdf4'};border-radius:8px;width:33%;">
                  <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${totalOutstanding > 0 ? '#991b1b' : '#166534'};font-weight:600;">Balance Due</p>
                  <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;color:${totalOutstanding > 0 ? '#dc2626' : '#166534'};">$${totalOutstanding.toFixed(2)}</p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Invoice table -->
          <div style="padding:20px 24px;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid #e2e8f0;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Invoice</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Amount</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Due Date</th>
                  <th style="padding:10px 16px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Status</th>
                  <th style="padding:10px 16px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;"></th>
                </tr>
              </thead>
              <tbody>
                ${invoiceRowsHtml}
              </tbody>
            </table>
          </div>

          ${hasUnpaid ? `
          <!-- Outstanding notice -->
          <div style="padding:0 24px 20px 24px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#64748b;">Click the pay button next to each invoice to make a secure payment via credit card.</p>
          </div>` : ''}

          <!-- Footer -->
          <div style="background:#f8fafc;padding:24px;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">${companyName}</p>
            ${companyPhone ? `<p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">${companyPhone}</p>` : ''}
            ${companyEmail ? `<p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">${companyEmail}</p>` : ''}
            <p style="margin:12px 0 0 0;font-size:11px;color:#94a3b8;">Powered by Diligence</p>
          </div>
        </div>
      `;

      const uniqueRecipients = [...new Set(recipients)];
      const subject = selectedInvoices.length === 1
        ? `Invoice #${selectedInvoices[0].invoice_number} from ${companyName}`
        : `Statement from ${companyName} — ${selectedInvoices.length} Invoices`;

      await FirebaseFunctions.sendEmail(
        uniqueRecipients.join(','),
        subject,
        body,
        { companyId: user?.company_id }
      );

      // Mark invoices as emailed
      await Promise.all(selectedInvoices.map(inv =>
        Invoice.update(inv.id, {
          email_sent: true,
          email_sent_at: new Date(),
          updated_at: new Date(),
        })
      ));

      // Update activity log on each linked job
      const jobIdsToUpdate = [...new Set(selectedInvoices.map(inv => inv.job_id).filter(Boolean))];
      if (jobIdsToUpdate.length > 0) {
        const jobsToUpdate = jobs.filter(j => jobIdsToUpdate.includes(j.id));
        await Promise.all(jobsToUpdate.map(job => {
          const relatedInvs = selectedInvoices.filter(inv => inv.job_id === job.id);
          const invoiceLabel = relatedInvs.map(inv => `#${inv.invoice_number}`).join(', ');
          const newEntry = {
            timestamp: new Date().toISOString(),
            event_type: 'invoice_emailed',
            description: `Invoice ${invoiceLabel} emailed to ${uniqueRecipients.join(', ')}`,
            user_name: user?.full_name || user?.email || 'System',
          };
          const currentLog = Array.isArray(job.activity_log) ? job.activity_log : [];
          return Job.update(job.id, { activity_log: [...currentLog, newEntry] });
        }));
      }

      toast({ title: 'Email sent', description: `Sent to ${uniqueRecipients.length} recipient${uniqueRecipients.length !== 1 ? 's' : ''}.` });
      setShowEmailDialog(false);
      setSelectedInvoiceIds(new Set());
      loadClientData(); // Refresh data
    } catch (error) {
      console.error('Error sending bulk invoice email:', error);
      toast({ title: 'Email failed', description: error.message || 'Failed to send email. Please try again.', variant: 'destructive' });
    }
    setIsSendingEmail(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="p-6 md:p-8">
          <div className="max-w-full mx-auto space-y-6">
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
        <div className="max-w-full mx-auto space-y-6">
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
                  {client.is_job_share_partner && (
                    <Badge className="bg-purple-100 text-purple-700 gap-1">
                      <Handshake className="w-3 h-3" />
                      Job Share Partner
                    </Badge>
                  )}
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
                <>
                  <Button
                    variant="outline"
                    onClick={handlePreviewPortal}
                    disabled={isGeneratingPreview}
                    className="gap-2"
                  >
                    {isGeneratingPreview ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Preview Portal
                  </Button>
                  <Button onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Client
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Link to={`${createPageUrl("Jobs")}?client_id=${client.id}`}>
              <Card className="border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
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

            <Link to={`${createPageUrl("Jobs")}?client_id=${client.id}&status=served`}>
              <Card className="border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Completed</p>
                      <p className="text-2xl font-bold text-slate-900">{jobStats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
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

            <Link to={`${createPageUrl("Accounting")}?client_id=${client.id}`}>
              <Card className="border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Revenue</p>
                      <p className="text-2xl font-bold text-slate-900">${invoiceStats.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className={`border-slate-200 hover:border-slate-300 hover:shadow-md transition-all ${invoiceStats.outstandingBalance > 0 ? 'border-red-200' : ''}`}>
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
            <div className="lg:col-span-2 lg:order-1 space-y-6">
              {/* Basic Information */}
              <Card className="border-slate-200">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-600" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {isEditing && formData ? (
                    <>
                      {/* Basic Company Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Basic Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="company_name" className="text-slate-700">Company Name</Label>
                            <Input id="company_name" value={formData.company_name || ''} onChange={(e) => handleInputChange('company_name', e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="website" className="text-slate-700">Website</Label>
                            <Input id="website" value={formData.website || ''} onChange={(e) => handleInputChange('website', e.target.value)} className="mt-1" placeholder="https://..." />
                          </div>
                          <div>
                            <Label htmlFor="company_type" className="text-slate-700">Company Type</Label>
                            <Select id="company_type" className="mt-1" value={formData.company_type} onChange={(e) => handleInputChange('company_type', e.target.value)}>
                              <SelectItem value="">Select type</SelectItem>
                              <SelectItem value="law_firm">Law Firm</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                              <SelectItem value="corporate">Corporate</SelectItem>
                              <SelectItem value="government">Government</SelectItem>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="process_serving">Process Serving Company</SelectItem>
                              <SelectItem value="independent_process_server">Independent Process Server</SelectItem>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="status" className="text-slate-700">Status</Label>
                            <Select id="status" className="mt-1" value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)}>
                              <SelectItem value="">Select status</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="archive">Archive</SelectItem>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Addresses Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Addresses
                          </h3>
                          <Button type="button" variant="outline" size="sm" onClick={addAddress} className="h-8">
                            <Plus className="w-3 h-3 mr-1" />Add Address
                          </Button>
                        </div>
                        {formData.addresses && formData.addresses.length > 0 ? (
                          <div className="space-y-3">
                            {formData.addresses.map((address, index) => (
                              <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3 border border-slate-200">
                                <div className="grid grid-cols-1 gap-3">
                                  <div><Label htmlFor={`address-label-${index}`} className="text-xs">Label</Label><Input id={`address-label-${index}`} value={address.label || ''} onChange={(e) => handleAddressChange(index, 'label', e.target.value)} placeholder="e.g., Main Office, Billing" className="h-9" /></div>
                                  <div>
                                    <Label htmlFor={`address-address1-${index}`} className="text-xs">Street Address</Label>
                                    <AddressAutocomplete
                                      value={address.address1 || ''}
                                      onChange={(value) => handleAddressChange(index, 'address1', value)}
                                      onAddressSelect={(addressDetails) => handleAddressAutocompleteSelect(index, addressDetails)}
                                      onLoadingChange={setIsAddressLoading}
                                      placeholder="Start typing address..."
                                    />
                                  </div>
                                  <div><Label htmlFor={`address-address2-${index}`} className="text-xs">Address Line 2 (Optional)</Label><Input id={`address-address2-${index}`} value={address.address2 || ''} onChange={(e) => handleAddressChange(index, 'address2', e.target.value)} placeholder="Suite, Unit, etc." className="h-9" /></div>
                                  <div className="grid grid-cols-6 gap-2">
                                    <div className="col-span-3"><Label htmlFor={`address-city-${index}`} className="text-xs">City</Label><Input id={`address-city-${index}`} value={address.city || ''} onChange={(e) => handleAddressChange(index, 'city', e.target.value)} className="h-9" disabled={isAddressLoading} /></div>
                                    <div className="col-span-1"><Label htmlFor={`address-state-${index}`} className="text-xs">State</Label><Input id={`address-state-${index}`} value={address.state || ''} onChange={(e) => handleAddressChange(index, 'state', e.target.value)} maxLength="2" className="h-9 uppercase" disabled={isAddressLoading} /></div>
                                    <div className="col-span-2"><Label htmlFor={`address-postal_code-${index}`} className="text-xs">ZIP Code</Label><Input id={`address-postal_code-${index}`} value={address.postal_code || ''} onChange={(e) => handleAddressChange(index, 'postal_code', e.target.value)} className="h-9" disabled={isAddressLoading} /></div>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                  <Button
                                    type="button"
                                    variant={address.primary ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setPrimaryAddress(index)}
                                    disabled={address.primary}
                                    className="h-8 text-xs gap-1"
                                  >
                                    <Star className={`w-3 h-3 ${address.primary ? 'fill-current' : ''}`} />
                                    {address.primary ? 'Primary' : 'Set Primary'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs"
                                    onClick={() => setShowDeleteConfirm({ open: true, type: 'address', index })}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">No addresses added yet</p>
                            <p className="text-slate-400 text-xs mt-1">Click "Add Address" to get started</p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Private Notes */}
                      <div>
                        <Label htmlFor="private_note" className="text-slate-700">Private Notes</Label>
                        <Textarea
                          id="private_note"
                          value={formData.private_note || ''}
                          onChange={(e) => handleInputChange('private_note', e.target.value)}
                          className="mt-1 min-h-[100px]"
                          placeholder="Add any private notes about this client..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Basic Company Details - View Mode */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Basic Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                          <div className="flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div className="min-w-0">
                              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Company Name</label>
                              <p className="text-slate-900 font-medium mt-0.5">{client.company_name}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Briefcase className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div className="min-w-0">
                              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Company Type</label>
                              <p className="text-slate-900 font-medium mt-0.5">{clientTypeConfig[client.company_type]?.label || client.company_type}</p>
                            </div>
                          </div>
                          {client.website && (
                            <div className="flex items-start gap-3">
                              <Globe className="w-5 h-5 text-slate-400 mt-0.5" />
                              <div className="min-w-0">
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Website</label>
                                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-0.5 transition-colors">
                                  {client.website.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <CheckCircle className={`w-5 h-5 mt-0.5 ${client.status === 'active' ? 'text-green-600' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</label>
                              <div className="mt-1">
                                <Badge className={statusConfig[client.status]?.color}>
                                  {statusConfig[client.status]?.label || client.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {toDate(client.created_at) && (
                            <div className="flex items-start gap-3">
                              <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                              <div className="min-w-0">
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client Since</label>
                                <p className="text-slate-900 font-medium mt-0.5">{formatDate(client.created_at, "MMM d, yyyy")}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Addresses Section - View Mode */}
                      {client.addresses && client.addresses.length > 0 && (
                        <>
                          <Separator />
                          <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-600" />
                              Addresses
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {client.addresses.map((address, index) => (
                                <div key={index} className="relative group">
                                  <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {address.label && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                            {address.label}
                                          </span>
                                        )}
                                        {address.primary && (
                                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 h-5">
                                            <Star className="w-3 h-3 mr-1 fill-current" />
                                            Primary
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-sm text-slate-700 space-y-0.5 leading-relaxed">
                                      <p className="font-medium">{address.address1}</p>
                                      {address.address2 && <p className="text-slate-600">{address.address2}</p>}
                                      <p className="text-slate-600">
                                        {address.city}, {address.state} {address.postal_code}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Private Notes - View Mode */}
                      {client.private_note && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Private Notes</h3>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{client.private_note}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Jobs and Invoices - Full Width */}
            <div className="order-3 col-span-full">
              <Card className="border-slate-200">
                <Tabs defaultValue="jobs">
                  <CardHeader className="border-b">
                    <TabsList className={`grid w-full ${client.is_job_share_partner ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <TabsTrigger value="jobs">
                        Jobs ({jobs.length})
                      </TabsTrigger>
                      <TabsTrigger value="invoices">
                        Invoices ({invoices.length})
                      </TabsTrigger>
                      {client.is_job_share_partner && (
                        <TabsTrigger value="partnership">
                          Partnership
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="jobs" className="space-y-3">
                      {/* Search */}
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Search jobs..."
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                          className="pl-9 h-9"
                        />
                      </div>
                      {/* Status filter pills */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'pending', label: 'Pending' },
                          { value: 'assigned', label: 'Assigned' },
                          { value: 'in_progress', label: 'In Progress' },
                          { value: 'served', label: 'Served' },
                          { value: 'needs_affidavit', label: 'Needs Affidavit' },
                          { value: 'unable_to_serve', label: 'Unable' },
                          { value: 'cancelled', label: 'Cancelled' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setJobStatusFilter(opt.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              jobStatusFilter === opt.value
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {jobs.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No jobs found for this client</p>
                          <p className="text-slate-400 text-sm mt-1">Jobs will appear here once created</p>
                        </div>
                      ) : filteredJobs.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No jobs match your filters</p>
                          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or status filter</p>
                        </div>
                      ) : (
                        <>
                          {/* Selection action bar */}
                          <div
                            className={`grid transition-all duration-200 ease-in-out ${selectedJobIds.size > 0 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                          >
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-3 p-3 mb-1 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="text-sm font-medium text-blue-800">
                                  {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} selected
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 h-7 text-xs"
                                  onClick={() => setSelectedJobIds(new Set())}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50">
                                  <TableHead className="w-[40px]">
                                    <Checkbox
                                      checked={allJobsSelected ? true : someJobsSelected ? "indeterminate" : false}
                                      onCheckedChange={toggleAllJobs}
                                      aria-label="Select all jobs"
                                    />
                                  </TableHead>
                                  <TableHead className="font-semibold text-slate-600">Job #</TableHead>
                                  <TableHead className="font-semibold text-slate-600">Recipient</TableHead>
                                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                  <TableHead className="font-semibold text-slate-600">Due Date</TableHead>
                                  <TableHead className="font-semibold text-slate-600">Created</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedJobs.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">No results</TableCell>
                                  </TableRow>
                                ) : paginatedJobs.map((job) => {
                                  const statusDisplay = getJobStatusDisplay(job.status, kanbanColumns);
                                  const isOverdue = job.due_date &&
                                    new Date(job.due_date) < new Date() &&
                                    job.status !== 'served' &&
                                    job.status !== 'cancelled';
                                  const isSelected = selectedJobIds.has(job.id);

                                  return (
                                    <TableRow
                                      key={job.id}
                                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                                      onClick={() => navigate(`${createPageUrl("JobDetails")}?id=${job.id}`)}
                                    >
                                      <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleJobSelection(job.id)}
                                          aria-label={`Select job ${job.job_number}`}
                                        />
                                      </TableCell>
                                      <TableCell className="font-semibold text-slate-900">
                                        {job.job_number}
                                      </TableCell>
                                      <TableCell className="text-slate-600 capitalize">
                                        {job.recipient?.name || 'N/A'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={`${statusDisplay.color} text-xs`}>
                                          {statusDisplay.label}
                                        </Badge>
                                        {isOverdue && (
                                          <Badge className="bg-red-100 text-red-700 text-xs ml-1">Overdue</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-slate-600">
                                        {formatDate(job.due_date, "MMM d, yyyy")}
                                      </TableCell>
                                      <TableCell className="text-slate-600">
                                        {formatDate(job.created_date, "MMM d, yyyy")}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Pagination */}
                          {jobsTotalPages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                              <p className="text-sm text-slate-500">
                                Showing {((jobsPage - 1) * JOBS_PER_PAGE) + 1}–{Math.min(jobsPage * JOBS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length}
                              </p>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" disabled={jobsPage <= 1} onClick={() => setJobsPage(p => p - 1)} className="h-8 w-8 p-0">
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {Array.from({ length: jobsTotalPages }, (_, i) => i + 1)
                                  .filter(p => p === 1 || p === jobsTotalPages || Math.abs(p - jobsPage) <= 1)
                                  .reduce((acc, p, i, arr) => {
                                    if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                  }, [])
                                  .map((p, i) =>
                                    p === '...' ? (
                                      <span key={`dots-${i}`} className="px-1 text-slate-400 text-sm">...</span>
                                    ) : (
                                      <Button
                                        key={p}
                                        variant={p === jobsPage ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setJobsPage(p)}
                                        className="h-8 w-8 p-0 text-xs"
                                      >
                                        {p}
                                      </Button>
                                    )
                                  )}
                                <Button variant="outline" size="sm" disabled={jobsPage >= jobsTotalPages} onClick={() => setJobsPage(p => p + 1)} className="h-8 w-8 p-0">
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="invoices" className="space-y-3">
                      {/* Search + advanced filter toggle */}
                      <div className="flex items-center gap-3">
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Search invoices..."
                            value={invoiceSearch}
                            onChange={(e) => setInvoiceSearch(e.target.value)}
                            className="pl-9 h-9"
                          />
                        </div>
                        <button
                          onClick={() => setInvoiceShowFilters(prev => !prev)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors relative ${
                            invoiceShowFilters || invoiceActiveFilterCount > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Filter className="w-3.5 h-3.5" />
                          More Filters
                          {invoiceActiveFilterCount > 0 && (
                            <span className="ml-0.5 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {invoiceActiveFilterCount}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Status filter pills */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'unpaid', label: 'Unpaid' },
                          { value: 'draft', label: 'Draft' },
                          { value: 'issued', label: 'Issued' },
                          { value: 'sent', label: 'Sent' },
                          { value: 'partially_paid', label: 'Partial' },
                          { value: 'paid', label: 'Paid' },
                          { value: 'overdue', label: 'Overdue' },
                          { value: 'cancelled', label: 'Cancelled' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setInvoiceStatusFilter(opt.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              invoiceStatusFilter === opt.value
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Expandable advanced filters */}
                      <div className={`grid transition-all duration-200 ease-in-out ${invoiceShowFilters ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 mb-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Amount</h4>
                              {(invoiceDateFrom || invoiceDateTo || invoiceAmountMin !== '' || invoiceAmountMax !== '') && (
                                <button
                                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                  onClick={() => {
                                    setInvoiceDateFrom('');
                                    setInvoiceDateTo('');
                                    setInvoiceAmountMin('');
                                    setInvoiceAmountMax('');
                                  }}
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">From</label>
                                <Input
                                  type="date"
                                  value={invoiceDateFrom}
                                  onChange={(e) => setInvoiceDateFrom(e.target.value)}
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">To</label>
                                <Input
                                  type="date"
                                  value={invoiceDateTo}
                                  onChange={(e) => setInvoiceDateTo(e.target.value)}
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">Min $</label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={invoiceAmountMin}
                                  onChange={(e) => setInvoiceAmountMin(e.target.value)}
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">Max $</label>
                                <Input
                                  type="number"
                                  placeholder="Any"
                                  value={invoiceAmountMax}
                                  onChange={(e) => setInvoiceAmountMax(e.target.value)}
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {invoices.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No invoices found for this client</p>
                          <p className="text-slate-400 text-sm mt-1">Invoices will appear here once created</p>
                        </div>
                      ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No invoices match your filters</p>
                          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or status filter</p>
                        </div>
                      ) : (
                        <>
                          {/* Selection action bar */}
                          <div
                            className={`grid transition-all duration-200 ease-in-out ${selectedInvoiceIds.size > 0 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                          >
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-3 p-3 mb-1 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="text-sm font-medium text-blue-800">
                                  {selectedInvoiceIds.size} invoice{selectedInvoiceIds.size !== 1 ? 's' : ''} selected
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-white">
                                      Actions <ChevronDown className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={openEmailDialog} className="gap-2">
                                      <Mail className="w-4 h-4" /> Email Invoices
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 h-7 text-xs ml-auto"
                                  onClick={() => setSelectedInvoiceIds(new Set())}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Invoice Summary — reflects active filters */}
                          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-center">
                              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Total Billed</p>
                              <p className="text-lg font-bold text-slate-900">${filteredInvoiceStats.totalBilled.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Paid</p>
                              <p className="text-lg font-bold text-green-700">${filteredInvoiceStats.totalPaid.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Outstanding</p>
                              <p className="text-lg font-bold text-red-700">${filteredInvoiceStats.outstandingBalance.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50">
                                  <TableHead className="w-[40px]">
                                    <Checkbox
                                      checked={allInvoicesSelected ? true : someInvoicesSelected ? "indeterminate" : false}
                                      onCheckedChange={toggleAllInvoices}
                                      aria-label="Select all invoices"
                                    />
                                  </TableHead>
                                  <TableHead className="font-semibold text-slate-600">Invoice #</TableHead>
                                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                  <TableHead className="font-semibold text-slate-600">Date</TableHead>
                                  <TableHead className="font-semibold text-slate-600">Due Date</TableHead>
                                  <TableHead className="font-semibold text-slate-600 text-right">Total</TableHead>
                                  <TableHead className="font-semibold text-slate-600 text-right">Paid</TableHead>
                                  <TableHead className="font-semibold text-slate-600 text-right">Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedInvoices.map((invoice) => {
                                  const total = invoice.total || invoice.total_amount || 0;
                                  const paid = invoice.amount_paid || invoice.total_paid || 0;
                                  const balance = invoice.balance_due ?? (total - paid);
                                  const effectiveBalance = isNaN(balance) ? 0 : Math.max(0, balance);
                                  const isPaid = paid >= total && total > 0;
                                  const effectiveStatus = getEffectiveInvoiceStatus(invoice);
                                  const isSelected = selectedInvoiceIds.has(invoice.id);

                                  return (
                                    <TableRow
                                      key={invoice.id}
                                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                                      onClick={() => navigate(`${createPageUrl("InvoiceDetail")}?id=${invoice.id}`)}
                                    >
                                      <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                                          aria-label={`Select invoice ${invoice.invoice_number}`}
                                        />
                                      </TableCell>
                                      <TableCell className="font-semibold text-slate-900">
                                        {invoice.invoice_number}
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={`${invoiceStatusConfig[effectiveStatus]?.color || 'bg-slate-100 text-slate-700'} text-xs`}>
                                          {invoiceStatusConfig[effectiveStatus]?.label || effectiveStatus}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-slate-600">
                                        {formatDate(invoice.invoice_date, "MMM d, yyyy")}
                                      </TableCell>
                                      <TableCell className="text-slate-600">
                                        {formatDate(invoice.due_date, "MMM d, yyyy")}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-slate-900">
                                        ${total.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-green-600">
                                        ${paid.toFixed(2)}
                                      </TableCell>
                                      <TableCell className={`text-right font-semibold ${isPaid ? 'text-green-600' : effectiveBalance > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                        {isPaid ? (
                                          <span className="flex items-center justify-end gap-1">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Paid
                                          </span>
                                        ) : (
                                          `$${effectiveBalance.toFixed(2)}`
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Pagination */}
                          {invoicesTotalPages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                              <p className="text-sm text-slate-500">
                                Showing {((invoicesPage - 1) * INVOICES_PER_PAGE) + 1}–{Math.min(invoicesPage * INVOICES_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length}
                              </p>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" disabled={invoicesPage <= 1} onClick={() => setInvoicesPage(p => p - 1)} className="h-8 w-8 p-0">
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {Array.from({ length: invoicesTotalPages }, (_, i) => i + 1)
                                  .filter(p => p === 1 || p === invoicesTotalPages || Math.abs(p - invoicesPage) <= 1)
                                  .reduce((acc, p, i, arr) => {
                                    if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                  }, [])
                                  .map((p, i) =>
                                    p === '...' ? (
                                      <span key={`dots-${i}`} className="px-1 text-slate-400 text-sm">...</span>
                                    ) : (
                                      <Button
                                        key={p}
                                        variant={p === invoicesPage ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setInvoicesPage(p)}
                                        className="h-8 w-8 p-0 text-xs"
                                      >
                                        {p}
                                      </Button>
                                    )
                                  )}
                                <Button variant="outline" size="sm" disabled={invoicesPage >= invoicesTotalPages} onClick={() => setInvoicesPage(p => p + 1)} className="h-8 w-8 p-0">
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>

                    {/* Partnership Tab Content */}
                    {client.is_job_share_partner && (
                      <TabsContent value="partnership" className="space-y-6">
                        {/* Partnership Status Card */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <Handshake className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-purple-900 mb-2">Job Sharing Partnership Active</h3>
                              <p className="text-sm text-purple-700 mb-3">
                                This company is a trusted job sharing partner. You can share jobs with them and receive shared jobs from them.
                              </p>
                              {toDate(client.partnership_established_at) && (
                                <div className="flex items-center gap-2 text-sm text-purple-600">
                                  <Clock className="w-4 h-4" />
                                  <span>Partnership established on {formatDate(client.partnership_established_at, "MMM d, yyyy 'at' h:mm a")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Partnership Activity Log */}
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-4">Partnership Activity</h4>
                          <div className="space-y-3">
                            {toDate(client.partnership_established_at) && (
                              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">Partnership Established</p>
                                  <p className="text-sm text-slate-600">
                                    {formatDate(client.partnership_established_at, "MMMM d, yyyy 'at' h:mm a")}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {client.partnership_source === "job_sharing" ? "Created via job sharing partnership request" : "Partnership established"}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Future: Add more activity items like jobs shared, requests sent, etc. */}
                            <div className="text-center py-6 text-sm text-slate-500">
                              <p>More partnership activity will appear here as you share jobs</p>
                            </div>
                          </div>
                        </div>

                        {/* Partnership Stats (placeholder for future) */}
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-4">Partnership Stats</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <p className="text-sm text-slate-600 mb-1">Jobs Shared</p>
                              <p className="text-2xl font-bold text-slate-900">0</p>
                              <p className="text-xs text-slate-500 mt-1">Coming soon</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <p className="text-sm text-slate-600 mb-1">Jobs Received</p>
                              <p className="text-2xl font-bold text-slate-900">0</p>
                              <p className="text-xs text-slate-500 mt-1">Coming soon</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    )}
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            {/* Right Column - Contact Info */}
            <div className="lg:order-2 space-y-6">
              {/* Contacts */}
              <Card className="border-slate-200">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-slate-600" />
                      Contacts ({formData?.contacts?.length || client?.contacts?.length || 0})
                    </CardTitle>
                    {isEditing && (
                      <Button type="button" variant="outline" size="sm" onClick={addContact} className="h-8">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {isEditing && formData ? (
                    formData.contacts && formData.contacts.length > 0 ? (
                      <div className="space-y-4">
                        {formData.contacts.map((contact, index) => (
                          <div key={index} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg space-y-3 border border-slate-200">
                            <div className="grid grid-cols-1 gap-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div><Label htmlFor={`contact-first_name-${index}`} className="text-xs">First Name</Label><Input id={`contact-first_name-${index}`} value={contact.first_name || ''} onChange={(e) => handleContactChange(index, 'first_name', e.target.value)} className="h-9" /></div>
                                <div><Label htmlFor={`contact-last_name-${index}`} className="text-xs">Last Name</Label><Input id={`contact-last_name-${index}`} value={contact.last_name || ''} onChange={(e) => handleContactChange(index, 'last_name', e.target.value)} className="h-9" /></div>
                              </div>
                              <div><Label htmlFor={`contact-email-${index}`} className="text-xs">Email</Label><Input id={`contact-email-${index}`} type="email" value={contact.email || ''} onChange={(e) => handleContactChange(index, 'email', e.target.value)} className="h-9" placeholder="email@example.com" /></div>
                              <div><Label htmlFor={`contact-phone-${index}`} className="text-xs">Phone</Label><Input id={`contact-phone-${index}`} type="tel" value={contact.phone || ''} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} className="h-9" placeholder="(555) 123-4567" /></div>
                              <div><Label htmlFor={`contact-title-${index}`} className="text-xs">Title / Position</Label><Input id={`contact-title-${index}`} value={contact.title || ''} onChange={(e) => handleContactChange(index, 'title', e.target.value)} className="h-9" placeholder="e.g., Attorney, Manager" /></div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                              <Button
                                type="button"
                                variant={contact.primary ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPrimaryContact(index)}
                                disabled={contact.primary}
                                className="h-8 text-xs gap-1"
                              >
                                <Star className={`w-3 h-3 ${contact.primary ? 'fill-current' : ''}`} />
                                {contact.primary ? 'Primary' : 'Set Primary'}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs"
                                onClick={() => setShowDeleteConfirm({ open: true, type: 'contact', index })}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No contacts added yet</p>
                        <p className="text-slate-400 text-xs mt-1">Click "Add" to create a contact</p>
                      </div>
                    )
                  ) : (
                    client.contacts && client.contacts.length > 0 ? (
                      <div className="space-y-4">
                        {client.contacts.map((contact, index) => {
                          const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();
                          return (
                            <div key={index} className="group relative">
                              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 text-slate-600 font-semibold text-sm">
                                    {initials || <User className="w-5 h-5" />}
                                  </div>

                                  {/* Contact Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h4 className="font-semibold text-slate-900">
                                        {contact.first_name} {contact.last_name}
                                      </h4>
                                      {contact.primary && (
                                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 h-5">
                                          <Star className="w-3 h-3 mr-1 fill-current" />
                                          Primary
                                        </Badge>
                                      )}
                                    </div>
                                    {contact.title && (
                                      <p className="text-sm text-slate-600 mb-2">{contact.title}</p>
                                    )}
                                    <div className="space-y-1.5">
                                      {contact.email && (
                                        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors">
                                          <Mail className="w-4 h-4 text-slate-400" />
                                          <span className="truncate">{contact.email}</span>
                                        </a>
                                      )}
                                      {contact.phone && (
                                        <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors">
                                          <Phone className="w-4 h-4 text-slate-400" />
                                          <span>{contact.phone}</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No contacts found</p>
                        <p className="text-slate-400 text-xs mt-1">Edit this client to add contacts</p>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bulk Email Invoice Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email {selectedInvoiceIds.size} Invoice{selectedInvoiceIds.size !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Selected invoices summary */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Selected Invoices</p>
              <div className="space-y-1">
                {invoices.filter(inv => selectedInvoiceIds.has(inv.id)).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{inv.invoice_number}</span>
                    <span className="text-slate-600">${(inv.total || inv.total_amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Client contacts */}
            {client?.contacts?.filter(c => c.email).length > 0 && (
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Client Contacts</Label>
                <div className="space-y-2">
                  {client.contacts.filter(c => c.email).map((contact, idx) => {
                    const originalIdx = client.contacts.indexOf(contact);
                    return (
                      <div key={originalIdx} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {contact.first_name} {contact.last_name}
                            {contact.primary && <span className="text-xs text-blue-600 ml-1">(Primary)</span>}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                        </div>
                        <Switch
                          checked={emailContactToggles[originalIdx] || false}
                          onCheckedChange={(checked) =>
                            setEmailContactToggles(prev => ({ ...prev, [originalIdx]: checked }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Employee contacts */}
            {employees?.filter(e => e.email).length > 0 && (
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Employee Contacts</Label>
                <div className="space-y-2">
                  {employees.filter(e => e.email).map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{emp.email}</p>
                      </div>
                      <Switch
                        checked={emailEmployeeToggles[emp.id] || false}
                        onCheckedChange={(checked) =>
                          setEmailEmployeeToggles(prev => ({ ...prev, [emp.id]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual email addresses */}
            <div>
              <Label htmlFor="additional_emails" className="text-sm font-medium text-slate-700 mb-1 block">
                Additional Email Addresses
              </Label>
              <Input
                id="additional_emails"
                value={emailAdditional}
                onChange={(e) => setEmailAdditional(e.target.value)}
                placeholder="email@example.com, another@example.com"
              />
              <p className="text-xs text-slate-400 mt-1">Separate multiple addresses with commas</p>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="email_message" className="text-sm font-medium text-slate-700 mb-1 block">
                Message (Optional)
              </Label>
              <Textarea
                id="email_message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Add a personal message to include in the email..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvoiceEmail}
                disabled={isSendingEmail}
                className="gap-2"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-12 h-12 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-slate-900 mb-1">Delete {showDeleteConfirm.type}?</h3>
                <p className="text-sm text-slate-600">
                  This will permanently remove this {showDeleteConfirm.type} from the client record. This action cannot be undone.
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
