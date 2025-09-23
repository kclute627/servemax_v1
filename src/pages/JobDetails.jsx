
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Job, Client, Employee, CourtCase, Document, Attempt, Invoice, CompanySettings, User } from '@/api/entities';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Building2,
  User as UserIcon,
  Calendar,
  AlertTriangle,
  FileText,
  Scale,
  MapPin,
  HardHat,
  Paperclip,
  Plus,
  Clock,
  Receipt,
  StickyNote,
  Activity,
  CheckCircle,
  Pencil,
  Lock,
  Unlock,
  Trash2,
  Star,
  Check,
  ChevronsUpDown,
  Loader2,
  Mail,
  Settings,
  UserCircle,
  UserPlus,
  FileEdit,
  FileX,
  Download,
  QrCode,
  FileClock,
  Edit,
  PlusCircle, // New icon for expanding details
  MinusCircle, // New icon for collapsing details
  Camera, // New icon for attached files
  UserSquare, // New icon for person served details
  Hash, // New icon for age
  Ruler, // New icon for height
  Weight, // New icon for weight
  Scissors // New icon for hair color
} from 'lucide-react';
import { format } from 'date-fns';
import AddressAutocomplete from '../components/jobs/AddressAutocomplete';
import NewContactDialog from '../components/jobs/NewContactDialog';
import ContractorSearchInput from '../components/jobs/ContractorSearchInput';
import { generateFieldSheet } from "@/api/functions";
import { UploadFile } from "@/api/integrations";
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig = {
  pending: { color: "bg-slate-100 text-slate-700", label: "Pending" },
  assigned: { color: "bg-blue-100 text-blue-700", label: "Assigned" },
  in_progress: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
  served: { color: "bg-green-100 text-green-700", label: "Served" },
  unable_to_serve: { color: "bg-red-100 text-red-700", label: "Unable to Serve" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

const priorityConfig = {
  standard: { color: "bg-slate-100 text-slate-700", label: "Standard" },
  rush: { color: "bg-orange-100 text-orange-700", label: "Rush" },
  emergency: { color: "bg-red-100 text-red-700", label: "Emergency" }
};

const eventTypeConfig = {
  attempt_logged: { color: 'bg-green-500', icon: Clock },
  job_reopened: { color: 'bg-green-500', icon: Unlock },
  invoice_generated: { color: 'bg-green-500', icon: Receipt },
  affidavit_generated: { color: 'bg-green-500', icon: FileText },

  job_closed: { color: 'bg-red-500', icon: Lock },
  document_deleted: { color: 'bg-red-500', icon: FileX },

  job_updated: { color: 'bg-slate-400', icon: Pencil },
  notes_updated: { color: 'bg-slate-400', icon: StickyNote },
  case_info_updated: { color: 'bg-slate-400', icon: Scale }
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const DetailItem = ({ icon, label, value }) => {
    if (!value) return null;
    const Icon = icon;
    return (
        <div>
            <h5 className="text-xs text-slate-500 font-semibold flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</h5>
            <p className="text-slate-800 mt-0.5 ml-5 break-words">{value}</p>
        </div>
    );
};


export default function JobDetailsPage() {
  const [job, setJob] = useState(null);
  const [client, setClient] = useState(null);
  const [server, setServer] = useState(null);
  const [courtCase, setCourtCase] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobNotes, setJobNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [isEditingJobDetails, setIsEditingJobDetails] = useState(false);
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [isEditingCaseInfo, setIsEditingCaseInfo] = useState(false);
  const [isEditingServiceDetails, setIsEditingServiceDetails] = useState(false);
  const [isNewContactDialogOpen, setIsNewContactDialogOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [contractorSearchValue, setContractorSearchValue] = useState("");

  const [lineItems, setLineItems] = useState([]);
  const [invoicePresets, setInvoicePresets] = useState([]);
  const [customItem, setCustomItem] = useState(null);
  const [invoiceSaved, setInvoiceSaved] = useState(false);

  const [editFormData, setEditFormData] = useState({});
  const [addressLoadingStates, setAddressLoadingStates] = useState([]);

  const [allEmployees, setAllEmployees] = useState([]);
  const [allClients, setAllClients] = useState([]);

  const [isGeneratingFieldSheet, setIsGeneratingFieldSheet] = useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = useState(null); // State to track which attempt is expanded

  const location = useLocation();

  const isAssignmentDirty = useMemo(() => {
    if (!isEditingAssignment || !job) return false;
    const original = {
      client_id: job.client_id || '',
      contact_email: job.contact_email || '',
      server_type: job.server_type || 'employee',
      assigned_server_id: job.assigned_server_id || 'unassigned',
    };
    const current = {
      client_id: editFormData.client_id || '',
      contact_email: editFormData.contact_email || '',
      server_type: editFormData.server_type || 'employee',
      assigned_server_id: editFormData.assigned_server_id || 'unassigned',
    };
    return JSON.stringify(original) !== JSON.stringify(current);
  }, [editFormData, job, isEditingAssignment]);

  const isJobDetailsDirty = useMemo(() => {
    if (!isEditingJobDetails || !job) return false;
    const original = {
      recipient_name: job.recipient?.name || '',
      addresses: job.addresses || [],
      service_instructions: job.service_instructions || '',
    };
    const current = {
      recipient_name: editFormData.recipient_name || '',
      addresses: editFormData.addresses || [],
      service_instructions: editFormData.service_instructions || '',
    };
    return JSON.stringify(original) !== JSON.stringify(current);
  }, [editFormData, job, isEditingJobDetails]);

  const isCaseInfoDirty = useMemo(() => {
    if (!isEditingCaseInfo || !courtCase) return false;
    const original = {
      case_number: courtCase.case_number || '',
      plaintiff: courtCase.plaintiff || '',
      defendant: courtCase.defendant || '',
    };
    const current = {
      case_number: editFormData.case_number || '',
      plaintiff: editFormData.plaintiff || '',
      defendant: editFormData.defendant || '',
    };
    return JSON.stringify(original) !== JSON.stringify(current);
  }, [editFormData, courtCase, isEditingCaseInfo]);

  const isServiceDetailsDirty = useMemo(() => {
    if (!isEditingServiceDetails || !job) return false;
    const original = {
      priority: job.priority || 'standard',
      due_date: job.due_date ? format(new Date(job.due_date), 'yyyy-MM-dd') : '',
      first_attempt_due_date: job.first_attempt_due_date ? format(new Date(job.first_attempt_due_date), 'yyyy-MM-dd') : '',
      first_attempt_instructions: job.first_attempt_instructions || '',
    };
    const current = {
      priority: editFormData.priority || 'standard',
      due_date: editFormData.due_date || '',
      first_attempt_due_date: editFormData.first_attempt_due_date || '',
      first_attempt_instructions: editFormData.first_attempt_instructions || '',
    };
    return JSON.stringify(original) !== JSON.stringify(current);
  }, [editFormData, job, isEditingServiceDetails]);

  const areNotesDirty = useMemo(() => {
    if (!isEditingNotes || !job) return false;
    return (jobNotes || '') !== (job.notes || '');
  }, [jobNotes, job, isEditingNotes]);

  const areInvoiceItemsDirty = useMemo(() => {
    if (!job) return false;
    const originalItems = Array.isArray(job.line_items) ? job.line_items : [];
    const normalizedOriginal = originalItems.map(item => ({
        description: item.description || '',
        quantity: item.quantity ?? 1,
        rate: item.rate ?? 0,
    }));
    const normalizedCurrent = lineItems.map(item => ({
        description: item.description || '',
        quantity: item.quantity ?? 1,
        rate: item.rate ?? 0,
    }));
    return JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);
  }, [lineItems, job]);

  const validateJobStatus = async (jobData, attempts) => {
    const servedAttempts = attempts.filter(attempt => attempt.status === 'served');
    const hasValidServedAttempt = servedAttempts.length > 0;

    let updatedJobData = { ...jobData };
    let needsUpdate = false;
    let updatePayload = {};

    if (updatedJobData.status === 'served' && !hasValidServedAttempt) {
      console.warn(`Job ${updatedJobData.job_number} marked as served but has no successful attempts. Correcting status.`);

      let correctStatus = 'pending';
      if (attempts.length > 0) {
        correctStatus = 'in_progress';
      } else if (updatedJobData.assigned_server_id && updatedJobData.assigned_server_id !== 'unassigned') {
        correctStatus = 'assigned';
      }

      updatePayload = {
        status: correctStatus,
        service_date: null,
        service_method: null
      };
      needsUpdate = true;
    }

    if (updatedJobData.status !== 'served' && hasValidServedAttempt) {
      console.warn(`Job ${updatedJobData.job_number} has successful attempts but not marked as served. Correcting status.`);

      const latestServedAttempt = servedAttempts.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date))[0];

      updatePayload = {
        status: 'served',
        service_date: latestServedAttempt.attempt_date
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      await Job.update(updatedJobData.id, updatePayload);

      return {
        ...updatedJobData,
        ...updatePayload
      };
    }

    return updatedJobData;
  };

  const loadJobDetails = useCallback(async (jobId) => {
    setIsLoading(true);
    setError(null);
    try {
      const jobData = await Job.get(jobId);
      if (!jobData) {
        throw new Error("Job not found");
      }

      const [
        clientData,
        courtCaseData,
        documentsData,
        attemptsData,
        invoicesData,
        employeesList,
        clientsList,
        invoiceSettingsData,
      ] = await Promise.all([
        jobData.client_id ? Client.get(jobData.client_id) : Promise.resolve(null),
        jobData.court_case_id ? CourtCase.get(jobData.court_case_id) : Promise.resolve(null),
        Document.filter({ job_id: jobId }).catch(e => { console.error("Error loading documents:", e); return []; }),
        Attempt.filter({ job_id: jobId }).catch(e => { console.error("Error loading attempts:", e); return []; }),
        Invoice.filter({ job_ids: jobId }).catch(e => { console.error("Error loading invoices:", e); return []; }),
        Employee.list().catch(e => { console.error("Error loading employees:", e); return []; }),
        Client.list().catch(e => { console.error("Error loading clients:", e); return []; }),
        CompanySettings.filter({ setting_key: "invoice_settings" }).catch(e => { console.error("Error loading invoice settings:", e); return []; }),
      ]);

      const validatedJobData = await validateJobStatus(jobData, Array.isArray(attemptsData) ? attemptsData : []);

      setJob(validatedJobData);
      setJobNotes(validatedJobData.notes || '');

      setClient(clientData);
      setCourtCase(courtCaseData);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
      setAttempts(Array.isArray(attemptsData) ? attemptsData.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date)) : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setAllEmployees(Array.isArray(employeesList) ? employeesList : []);
      setAllClients(Array.isArray(clientsList) ? clientsList : []);

      if (
        Array.isArray(invoiceSettingsData) &&
        invoiceSettingsData.length > 0 &&
        invoiceSettingsData[0].setting_value?.presets &&
        Array.isArray(invoiceSettingsData[0].setting_value.presets)
      ) {
        const raw = invoiceSettingsData[0].setting_value.presets;

        const normalized = raw
          .map((p) => {
            if (p == null) return null;
            if (typeof p === 'string') return { description: p, rate: 0 };
            if (typeof p === 'number') return { description: String(p), rate: Number(p) || 0 };
            if (typeof p === 'object') {
              const desc = p.description ?? p.label ?? p.name ?? '';
              const rate = Number(p.rate ?? p.amount ?? 0);
              return { description: String(desc), rate: Number.isFinite(rate) ? rate : 0 };
            }
            return null;
          })
          .filter(Boolean);

        setInvoicePresets(normalized);
      } else {
        setInvoicePresets([]);
      }

      if (validatedJobData.line_items && Array.isArray(validatedJobData.line_items) && validatedJobData.line_items.length > 0) {
        setLineItems(validatedJobData.line_items);
      } else {
        const migratedItems = [];
        if (validatedJobData.service_fee) migratedItems.push({ description: "Service Fee", quantity: 1, rate: validatedJobData.service_fee });
        if (validatedJobData.rush_fee) migratedItems.push({ description: "Rush Fee", quantity: 1, rate: validatedJobData.rush_fee });
        if (validatedJobData.mileage_fee) migratedItems.push({ description: "Mileage Fee", quantity: 1, rate: validatedJobData.mileage_fee });
        setLineItems(migratedItems.length > 0 ? migratedItems : [{ description: '', quantity: 1, rate: 0 }]);
      }

      if (validatedJobData.assigned_server_id && validatedJobData.assigned_server_id !== "unassigned") {
        try {
          const employee = Array.isArray(employeesList) ? employeesList.find(e => e.id === validatedJobData.assigned_server_id) : null;
          if (employee) {
            setServer({ name: `${employee.first_name} ${employee.last_name}`, type: 'Employee' });
          } else {
            const contractor = clientsList.find(c => c.id === validatedJobData.assigned_server_id);
            if (contractor) {
              setServer({ name: contractor.company_name, type: 'Contractor' });
            } else {
              console.warn(`Could not find server with ID ${validatedJobData.assigned_server_id}`);
              setServer(null);
            }
          }
        } catch (serverError) {
          console.error("Error loading server information:", serverError);
          setServer(null);
        }
      } else {
        setServer(null);
      }

    } catch (e) {
      console.error("Error loading job details:", e);
      setError(e.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("No user logged in for activity tracking.");
      }
    };
    fetchUser();

    const urlParams = new URLSearchParams(location.search);
    let jobId = urlParams.get('id');

    // Check for success message
    const successType = urlParams.get('success');
    if (successType === 'attempt_saved') {
      // Show success message temporarily
      setTimeout(() => {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right-2';
        alertDiv.textContent = 'Attempt saved successfully';
        document.body.appendChild(alertDiv);

        // Remove after 3 seconds
        setTimeout(() => {
          alertDiv.remove();
        }, 3000);

        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('success');
        window.history.replaceState({}, '', newUrl.toString());
      }, 100);
    }

    if (jobId) {
      sessionStorage.setItem('lastViewedJobId', jobId);
    } else {
      jobId = sessionStorage.getItem('lastViewedJobId');
    }

    if (jobId) {
      loadJobDetails(jobId);
    } else {
      setError("No Job ID provided");
      setIsLoading(false);
    }
  }, [location.search, loadJobDetails]);

  const handleToggleJobClosed = async () => {
    if (!job) return;
    try {
        const newClosedStatus = !job.is_closed;
        const actionText = newClosedStatus ? 'closed' : 'reopened';

        const newLogEntry = {
            timestamp: new Date().toISOString(),
            user_name: currentUser?.full_name || "System",
            event_type: newClosedStatus ? "job_closed" : "job_reopened",
            description: `Job ${actionText} by ${currentUser?.full_name || 'user'}.`
        };

        const currentActivityLog = Array.isArray(job?.activity_log) ? job.activity_log : [];
        const updatedActivityLog = [...currentActivityLog, newLogEntry];

        await Job.update(job.id, {
            is_closed: newClosedStatus,
            activity_log: updatedActivityLog
        });

        setJob(prevJob => ({
            ...prevJob,
            is_closed: newClosedStatus,
            activity_log: updatedActivityLog
        }));

    } catch (error) {
        console.error("Error toggling job closed status:", error);
        alert("Failed to update job status.");
    }
  };

  const handleStartEdit = (section) => {
    switch(section) {
      case 'jobDetails':
        const currentAddresses = Array.isArray(job?.addresses) ? job.addresses : [];
        const initialAddresses = currentAddresses.length > 0
          ? JSON.parse(JSON.stringify(currentAddresses))
          : [{ label: 'Primary', address1: '', address2: '', city: '', state: '', postal_code: '', primary: true }];

        setEditFormData({
          recipient_name: job?.recipient?.name || '',
          addresses: initialAddresses,
          service_instructions: job?.service_instructions || ''
        });
        setIsEditingJobDetails(true);
        break;
      case 'assignment':
        const loadSelectedContractor = () => {
          if (job?.server_type === 'contractor' && job?.assigned_server_id && job.assigned_server_id !== 'unassigned') {
            const contractorClient = allClients.find(c => c.id === job.assigned_server_id);
            if (contractorClient) {
              setSelectedContractor(contractorClient);
              setContractorSearchValue(contractorClient.company_name);
            } else {
              setSelectedContractor(null);
              setContractorSearchValue("");
            }
          } else {
            setSelectedContractor(null);
            setContractorSearchValue("");
          }
        };

        loadSelectedContractor();

        setEditFormData({
          client_id: job?.client_id || '',
          contact_email: job?.contact_email || '',
          server_type: job?.server_type || 'employee',
          assigned_server_id: job?.assigned_server_id || 'unassigned'
        });
        setIsEditingAssignment(true);
        break;
      case 'caseInfo':
        setEditFormData({
          case_number: courtCase?.case_number || '',
          plaintiff: courtCase?.plaintiff || '',
          defendant: courtCase?.defendant || ''
        });
        setIsEditingCaseInfo(true);
        break;
      case 'serviceDetails':
        setEditFormData({
          priority: job?.priority || 'standard',
          due_date: job?.due_date ? format(new Date(job.due_date), 'yyyy-MM-dd') : '',
          first_attempt_due_date: job?.first_attempt_due_date ? format(new Date(job.first_attempt_due_date), 'yyyy-MM-dd') : '',
          first_attempt_instructions: job?.first_attempt_instructions || ''
        });
        setIsEditingServiceDetails(true);
        break;
    }
  };

  const handleCancelEdit = (section) => {
    setEditFormData({});
    setAddressLoadingStates([]);
    setSelectedContractor(null);
    setContractorSearchValue("");

    switch(section) {
      case 'jobDetails':
        setIsEditingJobDetails(false);
        break;
      case 'assignment':
        setIsEditingAssignment(false);
        break;
      case 'caseInfo':
        setIsEditingCaseInfo(false);
        break;
      case 'serviceDetails':
        setIsEditingServiceDetails(false);
        break;
    }
  };

  const handleSaveEdit = async (section) => {
    try {
      let updateData = {};
      let logDescription = '';

      const currentJob = job;
      const currentRecipient = currentJob?.recipient || {};

      switch(section) {
        case 'jobDetails':
          const currentAddresses = Array.isArray(editFormData.addresses) ? editFormData.addresses : [];
          let updatedAddresses = [...currentAddresses];
          const hasPrimary = updatedAddresses.some(addr => addr.primary);
          if (!hasPrimary && updatedAddresses.length > 0) {
            updatedAddresses = updatedAddresses.map((addr, idx) => ({
              ...addr,
              primary: idx === 0
            }));
          }

          updateData = {
            recipient: {
              ...currentRecipient,
              name: editFormData.recipient_name
            },
            addresses: updatedAddresses,
            service_instructions: editFormData.service_instructions
          };
          logDescription = 'Job details updated.';
          break;
        case 'assignment':
          updateData = {
            client_id: editFormData.client_id,
            contact_email: editFormData.contact_email,
            server_type: editFormData.server_type,
            assigned_server_id: editFormData.assigned_server_id
          };
          logDescription = 'Job assignment updated.';
          break;
        case 'caseInfo':
          if (job?.court_case_id) {
            await CourtCase.update(job.court_case_id, {
              case_number: editFormData.case_number,
              plaintiff: editFormData.plaintiff,
              defendant: editFormData.defendant
            });
            setCourtCase(prevCase => ({
                ...prevCase,
                case_number: editFormData.case_number,
                plaintiff: editFormData.plaintiff,
                defendant: editFormData.defendant
            }));
            logDescription = 'Case information updated.';
          } else {
            console.warn("Cannot update case info: No court case linked to this job.");
            alert("No court case linked to this job to update.");
          }
          break;
        case 'serviceDetails':
          updateData = {
            priority: editFormData.priority,
            due_date: editFormData.due_date,
            first_attempt_due_date: editFormData.first_attempt_due_date,
            first_attempt_instructions: editFormData.first_attempt_instructions
          };
          logDescription = 'Service details updated.';
          break;
      }

      if (Object.keys(updateData).length > 0) {
        const newLogEntry = {
          timestamp: new Date().toISOString(),
          user_name: currentUser?.full_name || "System",
          event_type: "job_updated",
          description: logDescription
        };

        const currentActivityLog = Array.isArray(job?.activity_log) ? job.activity_log : [];
        const updatedActivityLog = [...currentActivityLog, newLogEntry];
        updateData.activity_log = updatedActivityLog;

        await Job.update(job.id, updateData);
        console.log(`✅ Successfully saved ${section}:`, updateData);

        setJob(prevJob => ({
          ...prevJob,
          ...updateData
        }));

        if (section === 'assignment') {
          await loadJobDetails(job.id);
        }
      }

      if (section === 'caseInfo' && logDescription) {
        const newLogEntry = {
          timestamp: new Date().toISOString(),
          user_name: currentUser?.full_name || "System",
          event_type: "case_info_updated",
          description: logDescription
        };
        const currentActivityLog = Array.isArray(job?.activity_log) ? job.activity_log : [];
        const updatedActivityLog = [...currentActivityLog, newLogEntry];
        await Job.update(job.id, { activity_log: updatedActivityLog });
        setJob(prevJob => ({...prevJob, activity_log: updatedActivityLog }));
      }

      handleCancelEdit(section);
    } catch (error) {
      console.error(`❌ Error saving ${section}:`, error);
      alert(`Failed to save changes: ${error.message}`);
    }
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => {
        if (field === 'server_type' && prev.server_type !== value) {
            return {
                ...prev,
                [field]: value,
                assigned_server_id: 'unassigned'
            };
        }
        return {
            ...prev,
            [field]: value
        };
    });
  };

  const handleAddressInputChange = (index, field, value) => {
    setEditFormData(prev => {
      const currentAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
      const newAddresses = [...currentAddresses];
      newAddresses[index] = {
        ...newAddresses[index],
        [field]: value
      };
      return { ...prev, addresses: newAddresses };
    });
  };

  const handleAddressAutocompleteSelect = (index, addressDetails) => {
     setEditFormData(prev => {
        const currentAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
        const newAddresses = [...currentAddresses];
        newAddresses[index] = {
            ...newAddresses[index],
            address1: addressDetails.address1 || '',
            city: addressDetails.city || '',
            state: addressDetails.state || '',
            postal_code: addressDetails.postal_code || '',
            latitude: addressDetails.latitude || null,
            longitude: addressDetails.longitude || null,
        };
        return { ...prev, addresses: newAddresses };
    });
  };

  const handleAddressLoadingChange = (index, isLoading) => {
    setAddressLoadingStates(prev => {
        const currentStates = Array.isArray(prev) ? prev : [];
        const newStates = [...currentStates];
        newStates[index] = isLoading;
        return newStates;
    });
  };

  const handleAddAddress = () => {
    setEditFormData(prev => {
      const currentAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
      if (currentAddresses.length >= 4) return prev;
      const newAddresses = [...currentAddresses, {
        label: `Address ${currentAddresses.length + 1}`,
        address1: '',
        address2: '',
        city: '',
        state: '',
        postal_code: '',
        primary: false
      }];
      return { ...prev, addresses: newAddresses };
    });
  };

  const handleRemoveAddress = (indexToRemove) => {
    setEditFormData(prev => {
      const currentAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
      if (currentAddresses.length <= 1) {
        alert("A job must have at least one service address.");
        return prev;
      }

      let newAddresses = currentAddresses.filter((_, index) => index !== indexToRemove);

      if (!newAddresses.some(addr => addr.primary) && newAddresses.length > 0) {
        newAddresses[0] = { ...newAddresses[0], primary: true };
      }

      return { ...prev, addresses: newAddresses };
    });
  };

  const handleSetPrimaryAddress = (indexToSet) => {
    setEditFormData(prev => {
      const currentAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
      const newAddresses = currentAddresses.map((addr, index) => ({
        ...addr,
        primary: index === indexToSet
      }));
      return { ...prev, addresses: newAddresses };
    });
  };

  const handleSaveNotes = async () => {
    try {
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        user_name: currentUser?.full_name || "System",
        event_type: "notes_updated",
        description: "Job notes were updated."
      };

      const currentActivityLog = Array.isArray(job?.activity_log) ? job.activity_log : [];
      const updatedActivityLog = [...currentActivityLog, newLogEntry];

      const updateData = {
        notes: jobNotes,
        activity_log: updatedActivityLog
      };

      await Job.update(job.id, updateData);
      console.log("✅ Successfully saved notes:", updateData);

      setJob(prevJob => ({
        ...prevJob,
        ...updateData
      }));

      setIsEditingNotes(false);
    } catch (error) {
      console.error("❌ Error saving notes:", error);
      alert("Failed to save notes: " + error.message);
    }
  };

  const getDocumentsByCategory = (category) => {
    const allDocs = Array.isArray(documents) ? documents : [];
    return allDocs.filter(doc => doc.document_category === category);
  };

  const serviceDocuments = getDocumentsByCategory('to_be_served');
  const affidavitDocuments = getDocumentsByCategory('affidavit');
  const photoDocuments = getDocumentsByCategory('photo');
  const fieldSheetDocuments = getDocumentsByCategory('field_sheet');

  const isOverdue = job && job.due_date && new Date(job.due_date) < new Date() && job.status !== 'served';

  const handleLineItemChange = (index, field, value) => {
    setLineItems(prev => {
        const currentItems = Array.isArray(prev) ? prev : [];
        const updatedLineItems = [...currentItems];

        if (!updatedLineItems[index]) {
          updatedLineItems[index] = { description: '', quantity: 1, rate: 0 };
        }

        updatedLineItems[index] = {
          ...updatedLineItems[index],
          [field]: value
        };

        return updatedLineItems;
    });
  };

  const handleAddLineItem = () => {
    setLineItems(prev => {
      const currentItems = Array.isArray(prev) ? prev : [];
      return [...currentItems, { description: '', quantity: 1, rate: 0 }];
    });
    setCustomItem(null);
  };

  const handleRemoveLineItem = (indexToRemove) => {
    setLineItems(prev => {
      const currentItems = Array.isArray(prev) ? prev : [];
      const updatedItems = currentItems.filter((_, i) => i !== indexToRemove);
      return updatedItems;
    });
    if (customItem === indexToRemove) {
      setCustomItem(null);
    } else if (customItem !== null && customItem > indexToRemove) {
      setCustomItem(prevIndex => prevIndex - 1);
    }
  };

  const handlePresetSelect = (index, presetDescription) => {
    const preset = invoicePresets.find(p => p.description === presetDescription);
    if (!preset) return;

    setLineItems(prev => {
        const currentItems = Array.isArray(prev) ? prev : [];
        const updated = [...currentItems];

        if (!updated[index]) {
            updated[index] = { description: '', quantity: 1, rate: 0 };
        }

        updated[index] = {
          ...updated[index],
          description: preset.description,
          rate: preset.rate || 0
        };

        return updated;
    });
    setCustomItem(null);
  };

  const totalFee = useMemo(() => {
    if (!Array.isArray(lineItems)) return 0;
    return lineItems.reduce((acc, item) => {
      const quantity = parseFloat(item?.quantity) || 0;
      const rate = parseFloat(item?.rate) || 0;
      return acc + (quantity * rate);
    }, 0);
  }, [lineItems]);

  const saveInvoiceItems = async () => {
    if (!job?.id || !Array.isArray(lineItems)) {
      console.warn("⚠️ Cannot save invoice items: missing job ID or invalid line items");
      return;
    }

    try {
      const total = totalFee;
      const updateData = {
        line_items: lineItems,
        total_fee: total
      };

      await Job.update(job.id, updateData);
      console.log("✅ Successfully saved invoice items:", updateData);

      setJob(prevJob => ({
        ...prevJob,
        ...updateData
      }));

      setInvoiceSaved(true);

      setTimeout(() => {
        setInvoiceSaved(false);
      }, 3000);

    } catch (error) {
      console.error("❌ Failed to save invoice items:", error);
      alert('Failed to save invoice items: ' + error.message);
    }
  };

  const handleContactCreated = (newContact) => {
    setClient(prevClient => ({
        ...prevClient,
        contacts: [...(prevClient.contacts || []), newContact]
    }));

    handleEditInputChange('contact_email', newContact.email);

    setIsNewContactDialogOpen(false);
  };

  const handleContractorSelected = (contractor) => {
    setSelectedContractor(contractor);
    if (contractor) {
      handleEditInputChange('assigned_server_id', contractor.id);
    } else {
      handleEditInputChange('assigned_server_id', 'unassigned');
    }
  };

  const handleGenerateFieldSheet = async () => {
    setIsGeneratingFieldSheet(true);
    try {
      // 1. Generate the PDF from the backend function
      const response = await generateFieldSheet({ job_id: job.id });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const formattedDateForFilename = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
      const fileName = `field-sheet-${job.job_number}-${formattedDateForFilename}.pdf`;

      // 2. Create a File object to upload
      const fileToUpload = new File([blob], fileName, { type: 'application/pdf' });

      // 3. Upload the file using the integration
      const { file_url } = await UploadFile({ file: fileToUpload });

      if (!file_url) {
        throw new Error("File upload failed, could not get a file URL.");
      }

      // 4. Create a new Document entity record for the field sheet
      const newDocument = await Document.create({
        job_id: job.id,
        title: `Field Sheet - ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
        file_url: file_url,
        document_category: 'field_sheet',
        received_at: new Date().toISOString()
      });

      // 5. Update the local state to show the new document immediately
      setDocuments(prev => [...prev, newDocument]);

      // 6. Trigger the download for the user
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

    } catch (error) {
      console.error('Error generating and saving field sheet:', error);
      alert('Failed to generate and save field sheet: ' + error.message);
    }
    setIsGeneratingFieldSheet(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Error</h2>
        <p className="text-slate-600">{error}</p>
        <Link to={createPageUrl("Jobs")}>
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Job Not Found</h2>
        <p className="text-slate-600">The job you are looking for could not be loaded.</p>
        <Link to={createPageUrl("Jobs")}>
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Jobs")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                Job #{job.job_number}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {job.client_job_number && (
                  <p className="text-sm text-slate-500">
                    Client Ref: {job.client_job_number}
                  </p>
                )}
                {job.is_closed && (
                  <Badge className="bg-red-600 text-white hover:bg-red-600">
                    Closed
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={statusConfig[job.status]?.color || "bg-slate-100"}>
              {statusConfig[job.status]?.label || job.status}
            </Badge>
            <Badge className={priorityConfig[job.priority]?.color || "bg-slate-100"}>
              {priorityConfig[job.priority]?.label || job.priority}
            </Badge>
            {job.due_date && (
              <Badge variant="outline" className={`flex items-center gap-1 ${isOverdue ? 'border-red-500 text-red-700 bg-red-50' : 'border-slate-300'}`}>
                <Calendar className="w-3 h-3" />
                Due: {format(new Date(job.due_date), 'MMM d')}
                {isOverdue && ' (Overdue)'}
              </Badge>
            )}
            <Button
              onClick={handleToggleJobClosed}
              className={`gap-2 ${job.is_closed ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-800'}`}
            >
              {job.is_closed ? (
                <>
                  <Unlock className="w-4 h-4" />
                  Open Job
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Close Job
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">

            {/* Job Assignment */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Job Assignment
                </CardTitle>
                {!isEditingAssignment && (
                  <Button variant="outline" size="sm" onClick={() => handleStartEdit('assignment')} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingAssignment ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-client">Client</Label>
                      <select
                        id="edit-client"
                        value={editFormData.client_id || ''}
                        onChange={(e) => handleEditInputChange('client_id', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a client...</option>
                        {Array.isArray(allClients) && allClients.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="edit-contact">Job Contact</Label>
                      <div className="flex items-center gap-2">
                        <select
                          id="edit-contact"
                          value={editFormData.contact_email || ''}
                          onChange={(e) => handleEditInputChange('contact_email', e.target.value)}
                          className="flex-grow w-full p-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={!client}
                        >
                          <option value="">Select a contact...</option>
                          {Array.isArray(client?.contacts) && client.contacts.map((contact, index) => (
                            <option key={contact.email || index} value={contact.email}>
                              {contact.first_name} {contact.last_name} {contact.primary && '(Primary)'}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsNewContactDialogOpen(true)}
                          disabled={!client}
                          className="px-3 py-2 gap-1 whitespace-nowrap"
                        >
                          <UserPlus className="w-4 h-4" />
                          New
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Server Type</Label>
                      <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 mt-1">
                        <Button
                          type="button"
                          onClick={() => {
                            handleEditInputChange('server_type', 'employee');
                            setSelectedContractor(null);
                            setContractorSearchValue("");
                          }}
                          className={`gap-2 justify-center transition-colors ${
                            editFormData.server_type === 'employee'
                              ? 'bg-white text-slate-900 shadow-sm hover:bg-white'
                              : 'bg-transparent text-slate-600 hover:bg-slate-200'
                          }`}
                          variant="ghost"
                        >
                          <UserIcon className="w-4 h-4" />
                          Employee
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleEditInputChange('server_type', 'contractor')}
                          className={`gap-2 justify-center transition-colors ${
                            editFormData.server_type === 'contractor'
                              ? 'bg-white text-slate-900 shadow-sm hover:bg-white'
                              : 'bg-transparent text-slate-600 hover:bg-slate-200'
                          }`}
                          variant="ghost"
                        >
                          <HardHat className="w-4 h-4" />
                          Contractor
                        </Button>
                      </div>
                    </div>

                    {editFormData.server_type === 'employee' ? (
                      <div>
                        <Label htmlFor="edit-assigned-server">Assigned Server</Label>
                        <select
                          id="edit-assigned-server"
                          value={editFormData.assigned_server_id || 'unassigned'}
                          onChange={(e) => handleEditInputChange('assigned_server_id', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="unassigned">Unassigned</option>
                          {Array.isArray(allEmployees) && allEmployees.map(e => (
                            <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <Label>Assigned Contractor</Label>
                        <div className="mt-1">
                          <ContractorSearchInput
                            value={contractorSearchValue}
                            onValueChange={setContractorSearchValue}
                            onContractorSelected={handleContractorSelected}
                            currentClientId={editFormData.client_id}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => handleSaveEdit('assignment')} className="relative">
                        {isAssignmentDirty && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                        )}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => handleCancelEdit('assignment')}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Client</Label>
                      <p className="font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4"/>
                        {client?.company_name || 'N/A'}
                      </p>

                      <div className="mt-3">
                        <Label className="text-xs text-slate-500">Job Contact</Label>

                        {(() => {
                          const contact = client?.contacts?.find(c => c.email === job.contact_email);
                          if (contact) {
                            return (
                              <div className="mt-1">
                                <p className="font-medium text-sm text-slate-800 flex items-center gap-2">
                                  <UserCircle className="w-4 h-4 text-slate-400"/>
                                  {contact.first_name} {contact.last_name} {contact.primary && '(Primary)'}
                                </p>
                                <p className="text-sm text-slate-600 flex items-center gap-2 mt-0.5">
                                  <Mail className="w-4 h-4 text-slate-400" />
                                  {contact.email}
                                </p>
                              </div>
                            );
                          } else if (job.contact_email) {
                            return (
                              <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4 text-slate-400" />
                                {job.contact_email}
                              </p>
                            );
                          } else {
                            return <p className="text-sm text-slate-500 mt-1">No contact specified.</p>;
                          }
                        })()}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Assigned Server</Label>
                      <div className="flex items-center gap-2 font-semibold">
                        {server?.type === 'Employee' ? <UserIcon className="w-4 h-4"/> : <HardHat className="w-4 h-4"/>}
                        <span>{server?.name || 'Unassigned'}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 capitalize">{job.server_type || 'employee'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Field Sheet Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle>Field Sheet</CardTitle>
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerateFieldSheet}
                    disabled={isGeneratingFieldSheet}
                    className="gap-2"
                  >
                    {isGeneratingFieldSheet ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Generate New Sheet
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fieldSheetDocuments.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-600 mb-2">Generated Sheets:</h4>
                    {fieldSheetDocuments.slice().sort((a, b) => {
                      const dateA = new Date(a.received_at || a.created_date);
                      const dateB = new Date(b.received_at || b.created_date);
                      return dateB - dateA;
                    }).map(doc => {
                      const docDate = doc.received_at || doc.created_date;
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50 border">
                          <div className="flex items-center gap-2">
                            <FileClock className="w-4 h-4 text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{doc.title}</p>
                              <p className="text-xs text-slate-500">
                                {docDate ? `Generated on ${format(new Date(docDate), 'MMM d, yyyy @ h:mm a')}` : 'Date unknown'}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                              <Download className="w-3 h-3" />
                              Download
                            </a>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No field sheets have been generated for this job yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recipient & Service Details</CardTitle>
                {!isEditingJobDetails && (
                  <Button variant="outline" size="sm" onClick={() => handleStartEdit('jobDetails')} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingJobDetails ? (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="edit-recipient">Recipient Name</Label>
                      <Input
                        id="edit-recipient"
                        value={editFormData.recipient_name || ''}
                        onChange={(e) => handleEditInputChange('recipient_name', e.target.value)}
                        placeholder="Name of person/entity to be served"
                      />
                    </div>

                    <div className="space-y-4">
                      {Array.isArray(editFormData.addresses) && editFormData.addresses.map((addr, index) => (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 relative bg-slate-50/50">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-slate-800">
                              Address {index + 1} {addr.primary && <span className="text-amber-600 font-normal">(Primary)</span>}
                            </h4>
                            <div className="flex items-center gap-2">
                              {!addr.primary && (
                                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 px-2" onClick={() => handleSetPrimaryAddress(index)}>
                                  <Star className="w-3.5 h-3.5"/> Set Primary
                                </Button>
                              )}
                              {editFormData.addresses && editFormData.addresses.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100 hover:text-red-600" onClick={() => handleRemoveAddress(index)}>
                                  <Trash2 className="w-4 h-4"/>
                                </Button>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`edit-address1-${index}`}>Street Address</Label>
                            <AddressAutocomplete
                              id={`edit-address1-${index}`}
                              value={addr.address1 || ''}
                              onChange={(value) => handleAddressInputChange(index, 'address1', value)}
                              onAddressSelect={(details) => handleAddressAutocompleteSelect(index, details)}
                              onLoadingChange={(loading) => handleAddressLoadingChange(index, loading)}
                              placeholder="Street address"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-address2-${index}`}>Address Line 2</Label>
                            <Input
                              id={`edit-address2-${index}`}
                              value={addr.address2 || ''}
                              onChange={(e) => handleAddressInputChange(index, 'address2', e.target.value)}
                              placeholder="Apartment, suite, etc."
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`edit-city-${index}`}>City</Label>
                              <Input id={`edit-city-${index}`} value={addr.city || ''} onChange={(e) => handleAddressInputChange(index, 'city', e.target.value)} disabled={addressLoadingStates[index]} />
                            </div>
                            <div>
                              <Label htmlFor={`edit-state-${index}`}>State</Label>
                              <Input id={`edit-state-${index}`} value={addr.state || ''} onChange={(e) => handleAddressInputChange(index, 'state', e.target.value)} disabled={addressLoadingStates[index]} />
                            </div>
                            <div>
                              <Label htmlFor={`edit-postal-${index}`}>ZIP Code</Label>
                              <Input id={`edit-postal-${index}`} value={addr.postal_code || ''} onChange={(e) => handleAddressInputChange(index, 'postal_code', e.target.value)} disabled={addressLoadingStates[index]} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {(!editFormData.addresses || editFormData.addresses.length < 4) && (
                      <Button type="button" variant="outline" onClick={handleAddAddress} className="gap-2 w-full border-dashed">
                        <Plus className="w-4 h-4"/> Add Another Address
                      </Button>
                    )}

                    <div>
                      <Label htmlFor="edit-instructions">Service Instructions</Label>
                      <Textarea
                        id="edit-instructions"
                        value={editFormData.service_instructions || ''}
                        onChange={(e) => handleEditInputChange('service_instructions', e.target.value)}
                        rows={3}
                        placeholder="Special instructions for the process server..."
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => handleSaveEdit('jobDetails')} className="relative">
                        {isJobDetailsDirty && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                        )}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => handleCancelEdit('jobDetails')}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="border-t border-slate-200">
                      <Label className="text-xs text-slate-500">Recipient</Label>
                      <p className="font-medium text-slate-900 mb-2">{job?.recipient?.name}</p>

                      <Label className="text-xs text-slate-500">Service Addresses</Label>
                       {Array.isArray(job?.addresses) ? job.addresses.map((address, index) => (
                        <div key={index} className="flex items-start justify-between gap-3 text-slate-600 mt-2 py-2">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-slate-400"/>
                            <div>
                              {address.address1}<br/>
                              {address.address2 && <>{address.address2}<br/></>}
                              {address.city}, {address.state} {address.postal_code}
                            </div>
                          </div>
                          {address.primary && (
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0 self-center">
                              Primary
                            </Badge>
                          )}
                        </div>
                      )) : (
                        <p className="text-slate-500 text-sm mt-2">No addresses configured</p>
                      )}
                    </div>

                    {job?.service_instructions && (
                      <div className="pt-4 border-t border-slate-200">
                        <Label className="text-xs text-slate-500">Service Instructions</Label>
                        <p className="text-sm text-slate-700 mt-1">{job.service_instructions}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Case Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Case Information</CardTitle>
                {!isEditingCaseInfo && (
                  <Button variant="outline" size="sm" onClick={() => handleStartEdit('caseInfo')} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingCaseInfo ? (
                  <>
                    <div>
                      <Label htmlFor="edit-case-number">Case Number</Label>
                      <Input
                        id="edit-case-number"
                        value={editFormData.case_number || ''}
                        onChange={(e) => handleEditInputChange('case_number', e.target.value)}
                        placeholder="Enter court case number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-plaintiff">Plaintiff</Label>
                      <Textarea
                        id="edit-plaintiff"
                        value={editFormData.plaintiff || ''}
                        onChange={(e) => handleEditInputChange('plaintiff', e.target.value)}
                        rows={2}
                        placeholder="Enter plaintiff name(s)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-defendant">Defendant</Label>
                      <Textarea
                        id="edit-defendant"
                        value={editFormData.defendant || ''}
                        onChange={(e) => handleEditInputChange('defendant', e.target.value)}
                        rows={2}
                        placeholder="Enter defendant name(s)"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => handleSaveEdit('caseInfo')} className="relative">
                        {isCaseInfoDirty && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                        )}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => handleCancelEdit('caseInfo')}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="pt-4 border-t border-slate-200">
                    <Label className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                      <Scale className="w-3 h-3" />
                      Case Information
                    </Label>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Case:</span> {courtCase?.case_number || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500">Court:</span> {courtCase?.court_name || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500">Plaintiff:</span> {courtCase?.plaintiff || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500">Defendant:</span> {courtCase?.defendant || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Attempts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Service Attempts ({Array.isArray(attempts) ? attempts.length : 0})
                </CardTitle>
                <Link to={`${createPageUrl("LogAttempt")}?jobId=${job.id}`}>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Attempt
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {Array.isArray(attempts) && attempts.length > 0 ? (
                  <div className="space-y-3">
                    {attempts.map(attempt => {
                      const isExpanded = expandedAttemptId === attempt.id;

                      let serverName = attempt.server_name_manual;
                      if (attempt.server_id && Array.isArray(allEmployees)) {
                        const serverEmployee = allEmployees.find(emp => emp.id === attempt.server_id);
                        if (serverEmployee) {
                          serverName = `${serverEmployee.first_name} ${serverEmployee.last_name}`;
                        }
                      }
                      if (!serverName) serverName = 'N/A';

                      return (
                      <div key={attempt.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 pt-1">
                            {attempt.status === 'served' ?
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> :
                              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            }
                            <div>
                                <span className="font-medium capitalize">{attempt.status.replace(/_/g, ' ')}</span>
                                <span className="text-sm text-slate-500">
                                  {' - '} {format(new Date(attempt.attempt_date), 'MMM d, h:mm a')}
                                </span>
                                {attempt.notes && <p className="text-sm text-slate-600 truncate max-w-sm">{attempt.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}>
                                        {isExpanded ? <MinusCircle className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isExpanded ? 'Collapse' : 'Expand'} Details</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link to={`${createPageUrl("LogAttempt")}?jobId=${job.id}&attemptId=${attempt.id}`}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800">
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Edit Attempt</p>
                                </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="pt-4 mt-3 border-t border-slate-200 space-y-4 text-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <DetailItem icon={UserIcon} label="Server" value={serverName} />
                                        <DetailItem icon={MapPin} label="Address of Attempt" value={attempt.address_of_attempt} />
                                        <DetailItem icon={FileText} label="Service Outcome" value={attempt.service_type_detail} />
                                    </div>

                                    {attempt.status === 'served' && (
                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-2">Person Served Details</h4>
                                            <div className="p-3 bg-slate-100 rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <DetailItem icon={UserSquare} label="Relationship" value={attempt.relationship_to_recipient} />
                                                <DetailItem icon={Hash} label="Age" value={attempt.person_served_age} />
                                                <DetailItem icon={Ruler} label="Height" value={attempt.person_served_height} />
                                                <DetailItem icon={Weight} label="Weight" value={attempt.person_served_weight} />
                                                <DetailItem icon={Scissors} label="Hair" value={attempt.person_served_hair_color} />
                                                <DetailItem icon={UserIcon} label="Sex" value={attempt.person_served_sex} />
                                                 <div className="col-span-full">
                                                   <DetailItem icon={FileText} label="Additional Description" value={attempt.person_served_description} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(attempt.uploaded_files) && attempt.uploaded_files.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                                <Camera className="w-4 h-4" />
                                                Attached Files
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {attempt.uploaded_files.map((file, index) => (
                                                    <a key={index} href={file.file_url} target="_blank" rel="noopener noreferrer" className="block group">
                                                        {file.content_type?.startsWith('image/') ? (
                                                            <img
                                                              src={file.file_url}
                                                              alt={file.name}
                                                              className="w-full h-24 object-cover rounded-md border-2 border-slate-200 group-hover:border-blue-500 transition-all"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-24 flex items-center justify-center bg-slate-200 rounded-md border-2 border-slate-200 group-hover:border-blue-500 transition-all">
                                                                <FileText className="w-8 h-8 text-slate-500" />
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-slate-600 truncate mt-1 group-hover:text-blue-700">{file.name || 'File'}</p>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                      </div>
                    )})}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No service attempts recorded yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Service Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Service Documents ({serviceDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {serviceDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-600"/>
                          <span className="font-medium">{doc.title}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No service documents uploaded.</p>
                )}
              </CardContent>
            </Card>

            {/* Affidavits */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  Affidavits ({affidavitDocuments.length})
                </CardTitle>
                <Link to={createPageUrl(`GenerateAffidavit?jobId=${job.id}`)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!attempts || attempts.length === 0}
                    title={!attempts || attempts.length === 0 ? "At least one service attempt is required to generate an affidavit" : "Generate affidavit based on service attempts"}
                  >
                    <Plus className="w-4 h-4" />
                    Generate Affidavit
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {affidavitDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {affidavitDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-slate-600"/>
                          <span className="font-medium">{doc.title}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    {!attempts || attempts.length === 0 ? (
                      <div>
                        <p className="text-slate-500">No service attempts recorded yet.</p>
                        <p className="text-sm text-slate-400 mt-1">At least one service attempt is required to generate an affidavit.</p>
                      </div>
                    ) : (
                      <p className="text-slate-500">No affidavits generated yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Invoice Card - MOVED HERE */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5"/>
                    Invoice
                  </CardTitle>
                  {(() => {
                    const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));
                    if (!jobInvoice) {
                      return (
                        <Badge className="bg-slate-100 text-slate-700">
                          Not Invoiced
                        </Badge>
                      );
                    }

                    const invoiceStatusConfig = { // Renamed to avoid conflict with global statusConfig
                      draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
                      sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
                      paid: { color: "bg-green-100 text-green-700", label: "Paid" },
                      overdue: { color: "bg-red-100 text-red-700", label: "Overdue" },
                      cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
                    };

                    const config = invoiceStatusConfig[jobInvoice.status] || invoiceStatusConfig.draft;
                    return (
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                    );
                  })()}
                </div>
                <Button variant="outline" size="sm" onClick={saveInvoiceItems} className="gap-2 relative">
                  {areInvoiceItemsDirty && !invoiceSaved && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  )}
                  {invoiceSaved ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Saved
                    </>
                  ) : (
                    'Save Invoice'
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {Array.isArray(lineItems) && lineItems.map((item, index) => (
                      <div key={index} className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="w-full">
                          <Label className="text-xs text-slate-500">Description</Label>
                          {(Array.isArray(invoicePresets) && invoicePresets.length > 0 && customItem !== index) ? (
                            <select
                              value={item?.description || ''}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  handleLineItemChange(index, 'description', '');
                                  setCustomItem(index);
                                } else if (e.target.value) {
                                  handlePresetSelect(index, e.target.value);
                                }
                              }}
                              className="w-full p-2 border border-slate-300 rounded-md text-sm mt-1"
                            >
                              <option value="">Select preset...</option>
                              {invoicePresets.map((preset, presetIndex) => (
                                <option key={presetIndex} value={preset.description}>
                                  {preset.description} - ${preset.rate}
                                </option>
                              ))}
                              <option value="custom">Custom description...</option>
                            </select>
                          ) : (
                            <Input
                              value={item?.description || ''}
                              onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                              placeholder="Description"
                              className="w-full mt-1"
                            />
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-end gap-2 mt-3">
                          <div className="flex-1 w-full">
                            <Label className="text-xs text-slate-500">Qty</Label>
                            <Input
                              type="number"
                              value={item?.quantity || ''}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                              placeholder="1"
                              className="mt-1"
                            />
                          </div>

                          <div className="flex-1 w-full">
                            <Label className="text-xs text-slate-500">Rate ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item?.rate || ''}
                              onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                              placeholder="0.00"
                              className="mt-1"
                            />
                          </div>

                          <div className="flex-1 w-full">
                            <Label className="text-xs text-slate-500">Total</Label>
                            <div className="mt-1 h-10 flex items-center px-3 bg-slate-100 rounded-md border font-medium text-slate-900">
                              ${((parseFloat(item?.quantity) || 0) * (parseFloat(item?.rate) || 0)).toFixed(2)}
                            </div>
                          </div>

                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLineItem(index)}
                              className="text-red-600 hover:text-red-700 h-10 w-10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" className="w-full" onClick={handleAddLineItem}>
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>

                <div className="pt-3 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold">Total:</span>
                      <span className="text-xl font-bold">${totalFee.toFixed(2)}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                        <Settings className="w-4 h-4" />
                        Manage Invoice
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                        <Mail className="w-4 h-4" />
                        Email Invoice
                      </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            {/* Service Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Service Details</CardTitle>
                {!isEditingServiceDetails && (
                  <Button variant="outline" size="sm" onClick={() => handleStartEdit('serviceDetails')} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingServiceDetails ? (
                  <>
                    <div>
                      <Label htmlFor="edit-priority">Priority</Label>
                      <select
                        id="edit-priority"
                        value={editFormData.priority || 'standard'}
                        onChange={(e) => handleEditInputChange('priority', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="standard">Standard</option>
                        <option value="rush">Rush</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="edit-due-date">Due Date</Label>
                      <Input
                        id="edit-due-date"
                        type="date"
                        value={editFormData.due_date || ''}
                        onChange={(e) => handleEditInputChange('due_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-first-attempt">First Attempt Due</Label>
                      <Input
                        id="edit-first-attempt"
                        type="date"
                        value={editFormData.first_attempt_due_date || ''}
                        onChange={(e) => handleEditInputChange('first_attempt_due_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-first-instructions">First Attempt Instructions</Label>
                      <Textarea
                        id="edit-first-instructions"
                        value={editFormData.first_attempt_instructions || ''}
                        onChange={(e) => handleEditInputChange('first_attempt_instructions', e.target.value)}
                        rows={3}
                        placeholder="Special instructions for first attempt..."
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => handleSaveEdit('serviceDetails')} className="relative">
                        {isServiceDetailsDirty && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                        )}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => handleCancelEdit('serviceDetails')}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Priority:</span>
                      <Badge className={priorityConfig[job.priority]?.color || "bg-slate-100"}>
                        {priorityConfig[job.priority]?.label || job.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Due Date:</span>
                      <span className="font-medium">
                        {job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">First Attempt Due:</span>
                      <span className="font-medium">
                        {job.first_attempt_due_date ? format(new Date(job.first_attempt_due_date), 'MMM d, yyyy') : 'Not set'}
                      </span>
                    </div>
                    {job.first_attempt_instructions && (
                      <div className="pt-2 border-t">
                        <Label className="text-xs text-slate-500">First Attempt Instructions</Label>
                        <p className="text-sm text-slate-700 mt-1">{job.first_attempt_instructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5"/>
                  Notes
                </CardTitle>
                {!isEditingNotes && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <Textarea
                      value={jobNotes}
                      onChange={(e) => setJobNotes(e.target.value)}
                      rows={4}
                      placeholder="Add notes about this job..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNotes} className="relative">
                        {areNotesDirty && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                        )}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {jobNotes ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{jobNotes}</p>
                    ) : (
                      <p className="text-slate-500 text-sm">No notes added yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5"/>
                  Job Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="max-h-96 overflow-y-auto space-y-4 text-sm pr-2">
                    {Array.isArray(job?.activity_log) && job.activity_log.length > 0 ? (
                      job.activity_log.slice().reverse().map((log, index, array) => {
                        if (!log) return null;
                        const config = eventTypeConfig[log.event_type] || { color: 'bg-slate-300' };
                        return (
                          <div key={index} className="flex gap-3 relative">
                            <div className="absolute left-0 top-1.5 h-full">
                               {index < array.length - 1 &&
                                <div className="w-px h-full bg-slate-200 ml-[5.5px] mt-1"></div>
                               }
                            </div>
                            <div className={`w-3 h-3 rounded-full ${config.color} mt-1 flex-shrink-0 z-10 ring-4 ring-white`}></div>
                            <div>
                              <p className="font-medium text-slate-800">{log.description}</p>
                              <p className="text-slate-500 text-xs">
                                {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy h:mm a') : ''}
                                {log.user_name && ` by ${log.user_name}`}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-slate-500">No activity to display.</p>
                    )}
                  </div>
                  {job?.activity_log?.length > 10 && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <NewContactDialog
        open={isNewContactDialogOpen}
        onOpenChange={setIsNewContactDialogOpen}
        client={client}
        onContactCreated={handleContactCreated}
      />

    </div>
  );
}
