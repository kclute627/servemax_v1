
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// FIREBASE TRANSITION: You will replace these Base44 entity imports with your Firebase SDK/config and specific service imports (e.g., getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs).
import { Job, Client, Employee, CourtCase, Document, Attempt, Invoice, CompanySettings, User } from '@/api/entities';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useGlobalData } from '@/components/GlobalDataContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { calculateDistance } from '@/utils/geolocation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
  CheckCircle2,
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
  Upload,
  Edit,
  PlusCircle, // New icon for expanding details
  MinusCircle, // New icon for collapsing details
  Camera, // New icon for attached files
  MoreVertical,
  Share2,
  Eye,
  UserSquare, // New icon for person served details
  Hash, // New icon for age
  Ruler, // New icon for height
  Weight, // New icon for weight
  Scissors, // New icon for hair color
  Target, // New icon for GPS accuracy
  Combine, // Icon for merge PDFs
  Send, // Icon for invoice issued
  CreditCard, // Icon for payment applied
  Save, // Icon for save
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import AddressAutocomplete from '../components/jobs/AddressAutocomplete';
import NewContactDialog from '../components/jobs/NewContactDialog';
import SendJobEmailDialog from '../components/jobs/SendJobEmailDialog';
import ContractorSearchInput from '../components/jobs/ContractorSearchInput';
import DocumentUpload from '../components/jobs/DocumentUpload';
// FIREBASE TRANSITION: This will become a call to a Firebase Cloud Function.
import { generateFieldSheet, mergePDFs, sendAttemptNotification } from "@/api/functions";
// FIREBASE TRANSITION: This will be replaced with Firebase Storage's `uploadBytes` and `getDownloadURL`.
import { UploadFile } from "@/api/integrations";
import { motion, AnimatePresence } from 'framer-motion';
import AttemptTimeIndicator from '../components/jobs/AttemptTimeIndicator';
import { JobShareChain } from '@/components/JobSharing';
import { useToast } from '@/components/ui/use-toast';
import { InvoiceManager } from '@/firebase/invoiceManager';
import InvoicePreview from '@/components/invoicing/InvoicePreview';
import html2pdf from 'html2pdf.js';
import { JOB_TYPES, JOB_TYPE_LABELS } from '@/firebase/schemas';
import CourtReportingDetails from '../components/jobs/CourtReportingDetails';
// --- Configuration Objects ---
// These are UI-specific and will likely remain unchanged during migration.
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
  invoice_issued: { color: 'bg-green-500', icon: Send },
  payment_applied: { color: 'bg-green-500', icon: CreditCard },
  affidavit_generated: { color: 'bg-green-500', icon: FileText },

  job_closed: { color: 'bg-red-500', icon: Lock },
  document_deleted: { color: 'bg-red-500', icon: FileX },

  job_updated: { color: 'bg-slate-400', icon: Pencil },
  invoice_updated: { color: 'bg-blue-500', icon: Receipt },
  notes_updated: { color: 'bg-slate-400', icon: StickyNote },
  case_info_updated: { color: 'bg-slate-400', icon: Scale }
};

/**
 * Custom hook for debouncing a value.
 * This is a frontend utility and will not need changes for migration.
 */
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

/**
 * A small, reusable component for displaying a detail item with an icon and label.
 * This is a UI component and will not need changes for migration.
 */
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

/**
 * Component to display a single service attempt with expandable details and map integration.
 * This is a new component for the outline.
 */
const AttemptWithMap = ({ attempt, jobId, jobAddress, jobCoordinates, employees, companyId, hasClientEmail, onEmailSent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendAttemptEmail = async () => {
    if (!hasClientEmail) return;

    setIsSendingEmail(true);
    try {
      const result = await sendAttemptNotification(attempt.id, jobId, companyId);
      if (onEmailSent) {
        onEmailSent(result);
      }
    } catch (error) {
      if (onEmailSent) {
        onEmailSent({ success: false, error: error.message });
      }
    }
    setIsSendingEmail(false);
  };

  let serverName = attempt.server_name_manual;
  if (attempt.server_id && Array.isArray(employees)) {
    const serverEmployee = employees.find(emp => emp.id === attempt.server_id);
    if (serverEmployee) {
      serverName = `${serverEmployee.first_name} ${serverEmployee.last_name}`;
    }
  }
  if (!serverName) serverName = 'N/A';

  const mapLink = attempt.gps_lat && attempt.gps_lon
    ? `https://www.google.com/maps/search/?api=1&query=${attempt.gps_lat},${attempt.gps_lon}`
    : null;

  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 transition-all">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 pt-1">
          {attempt.status === 'served' ?
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> :
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          }

          {/* Indicator icons for GPS, Photos, and Mobile */}
          <div className="flex items-center gap-1">
            {attempt.gps_lat && attempt.gps_lon && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  GPS Location Logged
                  {attempt.gps_accuracy && ` (±${Math.round(attempt.gps_accuracy)}m)`}
                </TooltipContent>
              </Tooltip>
            )}
            {Array.isArray(attempt.uploaded_files) && attempt.uploaded_files.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <Camera className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{attempt.uploaded_files.length} Photo(s)</TooltipContent>
              </Tooltip>
            )}
            {attempt.mobile_app_attempt && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Logged from Mobile Device</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div>
            <span className="font-medium capitalize">{attempt.status.replace(/_/g, ' ')}</span>
            <span className="text-sm text-slate-500">
              {' - '} {format(new Date(attempt.attempt_date), 'MMM d, h:mm a')}
            </span>
            {attempt.notes && <p className="text-sm text-slate-600 truncate max-w-sm">{attempt.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasClientEmail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-blue-600"
                  onClick={handleSendAttemptEmail}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Email Attempt to Client</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => setIsExpanded(prev => !prev)}>
                {isExpanded ? <MinusCircle className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isExpanded ? 'Collapse' : 'Expand'} Details</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={`${createPageUrl("LogAttempt")}?jobId=${jobId}&attemptId=${attempt.id}`}>
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
                <DetailItem icon={MapPin} label="Attempt Location" value={attempt.address_of_attempt} />
                <DetailItem icon={FileText} label="Service Outcome" value={attempt.service_type_detail} />
              </div>

              {attempt.status === 'served' && (
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2">Person Served Details</h4>
                  <div className="p-3 bg-slate-100 rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-full">
                      <DetailItem icon={UserIcon} label="Name" value={attempt.person_served_name} />
                    </div>
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

              {attempt.gps_lat && attempt.gps_lon && (
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    GPS Location
                  </h4>
                  <div className="p-3 bg-slate-100 rounded-md space-y-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <DetailItem icon={MapPin} label="Latitude" value={attempt.gps_lat} />
                      <DetailItem icon={MapPin} label="Longitude" value={attempt.gps_lon} />
                      {attempt.gps_accuracy && (
                        <DetailItem
                          icon={Target}
                          label="Accuracy"
                          value={`±${Math.round(attempt.gps_accuracy)}m ${attempt.gps_accuracy <= 20 ? '(Excellent)' :
                            attempt.gps_accuracy <= 50 ? '(Good)' :
                              attempt.gps_accuracy <= 100 ? '(Fair)' : '(Low)'
                            }`}
                        />
                      )}
                      {attempt.gps_altitude && (
                        <DetailItem icon={MapPin} label="Altitude" value={`${Math.round(attempt.gps_altitude)}m`} />
                      )}
                      {attempt.gps_timestamp && (
                        <DetailItem
                          icon={Clock}
                          label="GPS Captured"
                          value={format(new Date(attempt.gps_timestamp), 'MMM d, h:mm:ss a')}
                        />
                      )}
                      {attempt.address_lat && attempt.address_lon && (
                        <DetailItem
                          icon={MapPin}
                          label="Distance from Address"
                          value={`${calculateDistance(attempt.gps_lat, attempt.gps_lon, attempt.address_lat, attempt.address_lon)} miles`}
                        />
                      )}
                    </div>
                    {mapLink && (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline mt-2"
                      >
                        <MapPin className="w-4 h-4" /> View on Map
                      </a>
                    )}
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

              {/* Device Information Section */}
              {(attempt.mobile_app_attempt !== undefined || attempt.device_timestamp || attempt.created_at) && (
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Metadata
                  </h4>
                  <div className="p-3 bg-slate-100 rounded-md grid grid-cols-2 gap-x-4 gap-y-2">
                    {attempt.mobile_app_attempt !== undefined && (
                      <DetailItem
                        icon={UserCircle}
                        label="Device Type"
                        value={attempt.mobile_app_attempt ? 'Mobile' : 'Desktop'}
                      />
                    )}
                    {attempt.device_timestamp && (
                      <DetailItem
                        icon={Clock}
                        label="Submitted"
                        value={format(new Date(attempt.device_timestamp), 'MMM d, h:mm:ss a')}
                      />
                    )}
                    {attempt.created_at && (
                      <DetailItem
                        icon={Clock}
                        label="Created"
                        value={format(new Date(attempt.created_at), 'MMM d, h:mm a')}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Helper function to get status display info (label and color)
 * Handles both old string-based statuses and new UUID-based kanban column statuses
 */
const getStatusDisplay = (status, kanbanColumns) => {
  // First check if it's a legacy string status
  if (statusConfig[status]) {
    return statusConfig[status];
  }

  // If not, check if it's a kanban column UUID
  if (kanbanColumns && kanbanColumns.length > 0) {
    const column = kanbanColumns.find(col => col.id === status);
    if (column) {
      // Map kanban column to appropriate color based on title
      let color = "bg-slate-100 text-slate-700"; // default
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

  // Fallback if status is not recognized
  return { color: "bg-slate-100 text-slate-700", label: status || "Unknown" };
};

export default function JobDetailsPage() {
  // --- State Management ---
  // This section defines all the pieces of data this component needs to keep track of.
  // FIREBASE TRANSITION: The structure of these state variables (job, client, etc.) will likely remain the same.
  // They will be populated by your Firebase data fetching logic instead of the Base44 SDK.

  // Get authenticated user
  const { user } = useAuth();

  // Ref to track if job was pre-populated from context (to avoid showing skeleton)
  const jobPrePopulatedRef = useRef(false);

  // Core data for the page
  const [job, setJob] = useState(null); // Holds the main job object.
  const [client, setClient] = useState(null); // Holds the associated client object.
  const [server, setServer] = useState(null); // Holds the assigned server's name and type.
  const [courtCase, setCourtCase] = useState(null); // Holds the associated court case object.
  const [documents, setDocuments] = useState([]); // Array of documents for this job.
  const [attempts, setAttempts] = useState([]); // Array of service attempts for this job.
  const [invoices, setInvoices] = useState([]); // Array of invoices associated with this job.

  // UI and loading states
  const [isLoading, setIsLoading] = useState(true); // True while the initial data is being fetched.
  const [isLoadingCourtCase, setIsLoadingCourtCase] = useState(false); // True while court case data is being fetched.
  const [error, setError] = useState(null); // Holds any error messages that occur during data fetching.
  const [currentUser, setCurrentUser] = useState(null); // Holds the currently logged-in user for activity logging.

  // State for inline editing of different sections
  const [isEditingJobDetails, setIsEditingJobDetails] = useState(false);
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [isEditingCaseInfo, setIsEditingCaseInfo] = useState(false);
  const [isEditingServiceDetails, setIsEditingServiceDetails] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingServiceDocuments, setIsEditingServiceDocuments] = useState(false);
  const [isNewContactDialogOpen, setIsNewContactDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailPreSelectedContent, setEmailPreSelectedContent] = useState({});

  // Form-specific state
  const [editFormData, setEditFormData] = useState({}); // A temporary object to hold changes during an edit session.
  const [editedDocuments, setEditedDocuments] = useState([]); // State for edited service documents.
  const [jobNotes, setJobNotes] = useState(''); // State for the notes textarea.
  const [selectedContractor, setSelectedContractor] = useState(null); // State for the contractor search component.
  const [contractorSearchValue, setContractorSearchValue] = useState("");
  const [addressLoadingStates, setAddressLoadingStates] = useState([]); // Tracks loading state for each address autocomplete.

  // Invoice-specific state
  const [lineItems, setLineItems] = useState([]);
  const [invoicePresets, setInvoicePresets] = useState([]);
  const [invoiceSettings, setInvoiceSettings] = useState(null);
  const [customItem, setCustomItem] = useState(null);
  const [invoiceSaved, setInvoiceSaved] = useState(false);

  // Data for dropdowns/selects
  const [allEmployees, setAllEmployees] = useState([]); // Cached list of all employees.
  const [allClients, setAllClients] = useState([]); // Cached list of all clients.

  // State for async operations
  const [isGeneratingFieldSheet, setIsGeneratingFieldSheet] = useState(false); // Tracks status of field sheet generation.
  const [expandedAttemptId, setExpandedAttemptId] = useState(null); // Tracks which attempt's details are expanded in the UI. THIS STATE IS NO LONGER USED, AS AttemptWithMap MANAGES ITS OWN EXPANSION
  const [isMergingServiceDocs, setIsMergingServiceDocs] = useState(false); // Tracks status of merging service documents
  const [isUploadingSignedAffidavit, setIsUploadingSignedAffidavit] = useState(false); // Tracks if uploading a signed affidavit
  const [isUploadingExternalAffidavit, setIsUploadingExternalAffidavit] = useState(false); // Tracks if uploading an external affidavit for signing
  const [isIssuingInvoice, setIsIssuingInvoice] = useState(false); // Tracks if invoice is being issued
  const [isEmailingInvoice, setIsEmailingInvoice] = useState(false); // Tracks if invoice email is being sent
  // Line 555 ke baad add karo
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [saveInvoiceTrigger, setSaveInvoiceTrigger] = useState(0);
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { jobs: contextJobs, clients: contextClients, employees: contextEmployees, companySettings, companyData, refreshData } = useGlobalData();

  // --- "Dirty" State Checks ---
  // These useMemo hooks compare the original data with the data in the edit form
  // to see if there are any unsaved changes. This is pure frontend logic and will remain the same.
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

  /**
   * Business logic to validate and correct job status based on its attempts.
   * FIREBASE TRANSITION: This function contains a database update call. You will replace `Job.update`
   * with a call to Firebase's `updateDoc` for the specific job document.
   */
  const validateJobStatus = async (jobData, attempts) => {
    const servedAttempts = attempts.filter(attempt => attempt.status === 'served');
    const hasValidServedAttempt = servedAttempts.length > 0;

    let updatedJobData = { ...jobData };
    let needsUpdate = false;
    let updatePayload = {};

    if (updatedJobData.status === 'served' && !hasValidServedAttempt) {
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
      const latestServedAttempt = servedAttempts.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date))[0];

      updatePayload = {
        status: 'served',
        service_date: latestServedAttempt.attempt_date
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      // FIREBASE TRANSITION: Replace this with `updateDoc(doc(db, 'jobs', updatedJobData.id), updatePayload)`.
      await Job.update(updatedJobData.id, updatePayload);

      return {
        ...updatedJobData,
        ...updatePayload
      };
    }

    return updatedJobData;
  };

  /**
   * Main data fetching function. Loads all related data for the given job ID.
   * FIREBASE TRANSITION: This is the most critical function to adapt. Each `await` call
   * here corresponds to a Firebase fetch operation.
   * - `Job.get(jobId)` becomes `getDoc(doc(db, 'jobs', jobId))`.
   * - `Client.get(jobData.client_id)` becomes `getDoc(doc(db, 'clients', jobData.client_id))`.
   * - `Document.filter({ job_id: jobId })` becomes `getDocs(query(collection(db, 'documents'), where('job_id', '==', jobId)))`.
   * - `Employee.list()` becomes `getDocs(collection(db, 'employees'))`.
   * You'll use `Promise.all` in a similar way but with Firebase's async functions.
   */
  const loadJobDetails = useCallback(async (jobId, skipLoading = false) => {
    // Only show loading skeleton if skipLoading is false (i.e., not pre-populated from context)
    if (!skipLoading) {
      setIsLoading(true);
    }
    setError(null);
    try {
      // FIREBASE TRANSITION: Replace with `getDoc(doc(db, 'jobs', jobId))`
      const jobData = await Job.findById(jobId);
      if (!jobData) {
        throw new Error("Job not found");
      }

      // FIREBASE TRANSITION: This `Promise.all` pattern is good. Replace each Base44 call
      // with its Firebase equivalent (getDoc, getDocs, query, etc.).
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
        jobData.client_id ? Client.findById(jobData.client_id) : Promise.resolve(null),
        jobData.court_case_id ? CourtCase.findById(jobData.court_case_id).catch(e => { return null; }) : Promise.resolve(null),
        Document.filter({ job_id: jobId, company_id: user?.company_id }).catch(e => { return []; }),
        Attempt.filter({ job_id: jobId, company_id: user?.company_id }).catch(e => { return []; }),
        // Use direct lookup if job has invoice_id, otherwise fallback to filter
        jobData.job_invoice_id
          ? Invoice.findById(jobData.job_invoice_id).catch(e => { return null; })
          : Invoice.filter({ job_ids: jobId }).then(invoices => invoices[0] || null).catch(e => { return null; }),
        Employee.list().catch(e => { return []; }),
        Client.list().catch(e => { return []; }),
        CompanySettings.filter({ setting_key: "invoice_settings" }).catch(e => { return []; }),
      ]);

      const validatedJobData = await validateJobStatus(jobData, Array.isArray(attemptsData) ? attemptsData : []);

      // --- State Updates ---
      // This logic for setting state after data is fetched will remain the same.
      setJob(validatedJobData);
      setJobNotes(validatedJobData.notes || '');

      setClient(clientData);
      setCourtCase(courtCaseData);
      setIsLoadingCourtCase(false); // Clear loading state after court case is loaded
      setDocuments(Array.isArray(documentsData) ? documentsData : []);

      // Auto-sync: Check if job has signed affidavits but flag isn't set
      const hasSignedAffidavits = Array.isArray(documentsData) && documentsData.some(
        doc => doc.document_category === 'affidavit' && doc.is_signed === true
      );

      if (hasSignedAffidavits && !validatedJobData.has_signed_affidavit) {
        try {
          await Job.update(jobId, { has_signed_affidavit: true });
          // Update local state
          setJob(prev => ({ ...prev, has_signed_affidavit: true }));
        } catch (error) {
          // Failed to update job flag
        }
      }

      // Prioritize attempts from job document (instant), fallback to collection query
      const attemptsToDisplay = Array.isArray(validatedJobData.attempts) && validatedJobData.attempts.length > 0
        ? validatedJobData.attempts
        : (Array.isArray(attemptsData) ? attemptsData : []);

      setAttempts(attemptsToDisplay.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date)));
      setInvoices(invoicesData ? [invoicesData] : []); // invoicesData is now a single object, not an array
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

        // Line 819 ke baad add karo
        setInvoicePresets(normalized);

        // Store full invoice settings
        if (
          Array.isArray(invoiceSettingsData) &&
          invoiceSettingsData.length > 0 &&
          invoiceSettingsData[0].setting_value
        ) {
          setInvoiceSettings({
            ...invoiceSettingsData[0].setting_value,
            invoice_presets: normalized // Include normalized presets
          });
        } else {
          setInvoiceSettings({
            invoice_presets: []
          });
        }
        setInvoicePresets(normalized);
      } else {
        setInvoicePresets([]);
      }


      // Load line items from invoice (primary) or job document (fallback)
      if (invoicesData && invoicesData.line_items) {
        // Map invoice line items to JobDetails format
        // Invoice uses: item_name, unit_price, total
        // JobDetails expects: description, rate, amount
        const mappedItems = invoicesData.line_items.map(item => ({
          description: item.item_name || item.description || '',
          quantity: item.quantity || 1,
          rate: item.unit_price || item.rate || 0,
          amount: item.total || item.amount || 0
        }));
        setLineItems(mappedItems);
      } else if (validatedJobData.line_items && Array.isArray(validatedJobData.line_items) && validatedJobData.line_items.length > 0) {
        // Fallback to job document for backwards compatibility
        setLineItems(validatedJobData.line_items);
      } else {
        // Migration fallback for old jobs with individual fee fields
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
              setServer(null);
            }
          }
        } catch (serverError) {
          setServer(null);
        }
      } else {
        setServer(null);
      }

    } catch (e) {
      setError(e.message);
    }
    setIsLoading(false);
  }, []);

  /**
   * Pre-populate job data from GlobalDataContext for instant display.
   * This eliminates the skeleton flash when navigating from the Jobs list.
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const jobId = urlParams.get('id');

    if (jobId && contextJobs && contextJobs.length > 0) {
      // Look for the job in the context
      const jobFromContext = contextJobs.find(j => j.id === jobId);

      if (jobFromContext) {
        // Immediately set the job data to avoid skeleton flash
        setJob(jobFromContext);
        setJobNotes(jobFromContext.notes || '');

        // Pre-populate client if available in context
        if (jobFromContext.client_id && contextClients) {
          const clientFromContext = contextClients.find(c => c.id === jobFromContext.client_id);
          if (clientFromContext) {
            setClient(clientFromContext);
          }
        }

        // Pre-populate employees from context
        if (contextEmployees && contextEmployees.length > 0) {
          setAllEmployees(contextEmployees);
        }

        // Pre-populate attempts from job if available
        if (Array.isArray(jobFromContext.attempts) && jobFromContext.attempts.length > 0) {
          setAttempts(jobFromContext.attempts.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date)));
        }

        // Set loading state for court case if job has one (will be loaded async)
        if (jobFromContext.court_case_id) {
          setIsLoadingCourtCase(true);
        }

        // Hide loading since we have data to show
        setIsLoading(false);

        // Mark that we pre-populated from context
        jobPrePopulatedRef.current = true;
      }
    } else {
      // Reset the ref if we don't have context data
      jobPrePopulatedRef.current = false;
    }
  }, [location.search, contextJobs, contextClients, contextEmployees]);

  /**
   * This effect runs on component mount. It fetches the current user, gets the job ID from the URL,
   * and triggers the initial data load.
   * FIREBASE TRANSITION: Replace `User.me()` with Firebase Auth's `onAuthStateChanged` or `auth.currentUser`.
   * The rest of the logic for reading URL params and session storage is standard React and will remain.
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // FIREBASE TRANSITION: Replace with Firebase Auth logic to get the current user.
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        // No user logged in for activity tracking
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
      // Only load job details if user is available (for company_id filtering)
      if (user?.company_id) {
        // If job was pre-populated from context, skip showing loading skeleton
        loadJobDetails(jobId, jobPrePopulatedRef.current);
        // Reset the ref after using it
        jobPrePopulatedRef.current = false;
      } else {
        // Wait for user to be loaded
        setIsLoading(true);
      }
    } else {
      setError("No Job ID provided");
      setIsLoading(false);
    }
  }, [location.search, loadJobDetails, user]);

  // Refresh invoice data when returning from InvoiceDetail with refresh signal
  useEffect(() => {
    if (location.state?.refreshInvoice && job?.id) {
      const refreshInvoiceData = async () => {
        try {
          // Re-fetch just the invoice data
          const invoiceData = job.job_invoice_id
            ? await Invoice.findById(job.job_invoice_id).catch(() => null)
            : await Invoice.filter({ job_ids: job.id }).then(invoices => invoices[0] || null).catch(() => null);

          if (invoiceData) {
            setInvoices([invoiceData]);
          }
        } catch (error) {
          // Error refreshing invoice data
        }
      };

      refreshInvoiceData();

      // Clear the state to prevent repeated refreshes
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, job?.id, job?.job_invoice_id, navigate, location.pathname, location.search]);

  /**
   * Toggles the 'is_closed' status of the job.
   * FIREBASE TRANSITION: This is a database update. Replace `Job.update`
   * with `updateDoc(doc(db, 'jobs', job.id), { ... })`.
   * The activity log logic can be implemented using Firebase's `arrayUnion` to add a new log entry.
   */
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

      // FIREBASE TRANSITION: Replace this with `updateDoc(doc(db, 'jobs', job.id), { ... })`.
      await Job.update(job.id, {
        is_closed: newClosedStatus,
        activity_log: updatedActivityLog
      });

      // This local state update remains the same.
      setJob(prevJob => ({
        ...prevJob,
        is_closed: newClosedStatus,
        activity_log: updatedActivityLog
      }));

      // Refresh global data so the Jobs page shows updated list
      await refreshData();

    } catch (error) {
      alert("Failed to update job status.");
    }
  };

  /**
   * Handles entering "edit mode" for a specific card.
   * This is pure UI state management and will not change.
   */
  const handleStartEdit = (section) => {
    switch (section) {
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
          case_number: courtCase?.case_number || job?.case_number || '',
          plaintiff: courtCase?.plaintiff || job?.plaintiff || '',
          defendant: courtCase?.defendant || job?.defendant || ''
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
      case 'serviceDocuments':
        // Load current service documents into editable state
        const currentServiceDocs = Array.isArray(documents)
          ? documents.filter(doc => doc.document_category === 'to_be_served')
          : [];
        setEditedDocuments(JSON.parse(JSON.stringify(currentServiceDocs)));
        setIsEditingServiceDocuments(true);
        break;
    }
  };

  /**
   * Handles exiting "edit mode" without saving.
   * This is pure UI state management and will not change.
   */
  const handleCancelEdit = (section) => {
    setEditFormData({});
    setAddressLoadingStates([]);
    setSelectedContractor(null);
    setContractorSearchValue("");

    switch (section) {
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
      case 'serviceDocuments':
        setIsEditingServiceDocuments(false);
        setEditedDocuments([]);
        break;
    }
  };

  /**
   * Saves the changes from an edit form to the database.
   * FIREBASE TRANSITION: This is another critical function to adapt. The `switch` statement
   * determines WHAT to update, and the final `await` call is WHERE the update happens.
   * Replace `Job.update` and `CourtCase.update` with `updateDoc` for the corresponding
   * Firestore documents.
   */
  const handleSaveEdit = async (section) => {
    try {
      let updateData = {};
      let logDescription = '';

      const currentJob = job;
      const currentRecipient = currentJob?.recipient || {};

      switch (section) {
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
            // FIREBASE TRANSITION: Replace this with `updateDoc(doc(db, 'courtCases', job.court_case_id), { ... })`.
            await CourtCase.update(job.court_case_id, {
              case_number: editFormData.case_number,
              plaintiff: editFormData.plaintiff,
              defendant: editFormData.defendant
            });
            // This local state update is fine.
            setCourtCase(prevCase => ({
              ...prevCase,
              case_number: editFormData.case_number,
              plaintiff: editFormData.plaintiff,
              defendant: editFormData.defendant
            }));
            logDescription = 'Case information updated.';
          } else {
            // No court case linked - update case info directly on job document
            updateData = {
              case_number: editFormData.case_number,
              plaintiff: editFormData.plaintiff,
              defendant: editFormData.defendant
            };
            logDescription = 'Case information updated.';
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
        case 'serviceDocuments':
          // Handle document changes
          const originalDocs = Array.isArray(documents)
            ? documents.filter(doc => doc.document_category === 'to_be_served')
            : [];

          // Find documents to delete (in original but not in edited)
          const docsToDelete = originalDocs.filter(
            originalDoc => !editedDocuments.some(editedDoc => editedDoc.id === originalDoc.id)
          );

          // Find documents to create (new documents without a database ID)
          const docsToCreate = editedDocuments.filter(
            editedDoc => !editedDoc.id || editedDoc.id.startsWith('upload-') || editedDoc.id.startsWith('manual-')
          );

          // Delete removed documents
          for (const doc of docsToDelete) {
            await Document.delete(doc.id);
          }

          // Create new documents
          if (docsToCreate.length > 0) {
            const documentsToCreate = docsToCreate.map(doc => ({
              job_id: job.id,
              title: doc.title,
              affidavit_text: doc.affidavit_text,
              file_url: doc.file_url,
              document_category: 'to_be_served',
              page_count: doc.page_count,
              content_type: doc.content_type,
              file_size: doc.file_size,
              received_at: new Date().toISOString()
            }));
            await Document.bulkCreate(documentsToCreate);
          }

          // Find documents to update (existing documents with changes)
          const docsToUpdate = editedDocuments.filter(editedDoc => {
            if (!editedDoc.id || editedDoc.id.startsWith('upload-') || editedDoc.id.startsWith('manual-')) {
              return false; // Skip new documents
            }
            // Find the original version
            const originalDoc = originalDocs.find(od => od.id === editedDoc.id);
            if (!originalDoc) return false;

            // Check if affidavit_text or title changed
            return editedDoc.affidavit_text !== originalDoc.affidavit_text ||
              editedDoc.title !== originalDoc.title;
          });

          // Update modified documents
          for (const doc of docsToUpdate) {
            await Document.update(doc.id, {
              affidavit_text: doc.affidavit_text,
              title: doc.title
            });
          }

          // Reload job details to refresh documents
          await loadJobDetails(job.id);
          logDescription = 'Service documents updated.';
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

        // FIREBASE TRANSITION: This is the main database write. Replace with `updateDoc(doc(db, 'jobs', job.id), updateData)`.
        await Job.update(job.id, updateData);

        // This local state update is fine.
        setJob(prevJob => ({
          ...prevJob,
          ...updateData
        }));

        if (section === 'assignment') {
          // Re-fetch all data if assignment changes, as it affects the 'server' object. This pattern is fine.
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
        // FIREBASE TRANSITION: Replace with an `updateDoc` call to add to the job's activity log.
        await Job.update(job.id, { activity_log: updatedActivityLog });
        setJob(prevJob => ({ ...prevJob, activity_log: updatedActivityLog }));
      }

      handleCancelEdit(section);
    } catch (error) {
      alert(`Failed to save changes: ${error.message}`);
    }
  };

  /**
   * Generic input handler for the edit forms.
   * This is pure state management and does not need to change.
   */
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

  /**
   * Handlers for managing the address form array.
   * These are all pure state management and will not change.
   */
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
        // Preserve address2 (suite/unit) from existing data
        city: addressDetails.city || '',
        state: addressDetails.state || '',
        postal_code: addressDetails.postal_code || '',
        county: addressDetails.county || '',
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

  /**
   * Saves the job notes.
   * FIREBASE TRANSITION: Another database update. Replace `Job.update` with
   * `updateDoc(doc(db, 'jobs', job.id), { notes: jobNotes, activity_log: ... })`.
   */
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

      // FIREBASE TRANSITION: Replace this with `updateDoc`.
      await Job.update(job.id, updateData);

      // This local state update is fine.
      setJob(prevJob => ({
        ...prevJob,
        ...updateData
      }));

      setIsEditingNotes(false);
    } catch (error) {
      alert("Failed to save notes: " + error.message);
    }
  };

  // --- Helper Functions ---
  // These are for organizing local data and do not need to change.
  const getDocumentsByCategory = (category) => {
    const allDocs = Array.isArray(documents) ? documents : [];
    return allDocs.filter(doc => doc.document_category === category);
  };

  const serviceDocuments = getDocumentsByCategory('to_be_served');
  const affidavitDocuments = getDocumentsByCategory('affidavit');
  const photoDocuments = getDocumentsByCategory('photo');
  const fieldSheetDocuments = getDocumentsByCategory('field_sheet');

  const isOverdue = job && job.due_date && new Date(job.due_date) < new Date() && job.status !== 'served';

  /**
   * Handlers for the invoice line items.
   * These are pure local state management and will not change.
   */
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

  // This `useMemo` for calculating a total is pure frontend logic and will not change.
  const totalFee = useMemo(() => {
    if (!Array.isArray(lineItems)) return 0;
    return lineItems.reduce((acc, item) => {
      const quantity = parseFloat(item?.quantity) || 0;
      const rate = parseFloat(item?.rate) || 0;
      return acc + (quantity * rate);
    }, 0);
  }, [lineItems]);

  /**
   * Saves the invoice line items to the job.
   * FIREBASE TRANSITION: This is a database update. Replace `Job.update`
   * with `updateDoc(doc(db, 'jobs', job.id), { line_items: ..., total_fee: ... })`.
   */
  const saveInvoiceItems = async () => {
    if (!job?.id || !Array.isArray(lineItems)) {
      return;
    }

    try {
      const total = totalFee;
      const updateData = {
        line_items: lineItems,
        total_fee: total
      };

      // FIREBASE TRANSITION: Replace this with `updateDoc`.
      await Job.update(job.id, updateData);

      // Local state updates are fine.
      setJob(prevJob => ({
        ...prevJob,
        ...updateData
      }));

      setInvoiceSaved(true);

      setTimeout(() => {
        setInvoiceSaved(false);
      }, 3000);

    } catch (error) {
      alert('Failed to save invoice items: ' + error.message);
    }
  };

  /**
   * Creates a new invoice record from the job's line items
   */
  const handleCreateInvoice = async () => {
    if (!job?.id || !Array.isArray(lineItems) || lineItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please add at least one line item before creating an invoice.'
      });
      return;
    }

    // Check if line items have valid data
    const hasValidItems = lineItems.some(item => item.description && item.rate > 0);
    if (!hasValidItems) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please add at least one line item with a description and rate.'
      });
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const invoiceDate = new Date();
      const invoiceDueDate = new Date(invoiceDate);
      invoiceDueDate.setDate(invoiceDate.getDate() + 30);

      // Format line items for invoice
      const formattedLineItems = lineItems.map(item => ({
        item_name: item.description || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.rate || 0,
        rate: item.rate || 0,
        total: (item.quantity || 1) * (item.rate || 0),
        amount: (item.quantity || 1) * (item.rate || 0)
      }));

      const subtotal = formattedLineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = invoiceSettings?.default_tax_rate || 0;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      const newInvoice = await Invoice.create({
        invoice_number: job.job_number,
        client_id: job.client_id,
        company_id: user?.company_id || companyData?.id || null,
        invoice_type: "job",
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: invoiceDueDate.toISOString().split('T')[0],
        job_ids: [job.id],
        line_items: formattedLineItems,
        subtotal: subtotal,
        discount_amount: 0,
        discount_type: "fixed",
        tax_rate: taxRate,
        total_tax_amount: taxAmount,
        total: total,
        balance_due: total,
        total_paid: 0,
        currency: "USD",
        status: "Draft",
        locked: false,
        taxes_enabled: taxRate > 0,
        terms: invoiceSettings?.default_terms || "Thanks for your business. Please pay within 30 days."
      });

      // Update local invoices state
      setInvoices(prev => [...prev, newInvoice]);

      // Also save line items to job for consistency
      await Job.update(job.id, {
        line_items: lineItems,
        total_fee: totalFee
      });

      toast({
        title: 'Invoice Created',
        description: `Invoice #${job.job_number} has been created as a draft.`,
        className: 'border-green-200 bg-green-50 text-green-900'
      });

      // Refresh data to ensure consistency
      refreshData();

    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invoice: ' + error.message
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  /**
   * Callback for when a new contact is created in the dialog.
   * FIREBASE TRANSITION: The dialog itself will contain the Firebase `updateDoc` call
   * to add the contact to the client. This handler just updates the local UI state.
   */
  const handleContactCreated = (newContact) => {
    setClient(prevClient => ({
      ...prevClient,
      contacts: [...(prevClient.contacts || []), newContact]
    }));

    handleEditInputChange('contact_email', newContact.email);

    setIsNewContactDialogOpen(false);
  };

  /**
   * Callback for when a contractor is selected from the search input.
   * This is local state management and will not change.
   */
  const handleContractorSelected = (contractor) => {
    setSelectedContractor(contractor);
    if (contractor) {
      handleEditInputChange('assigned_server_id', contractor.id);
    } else {
      handleEditInputChange('assigned_server_id', 'unassigned');
    }
  };

  /**
   * Generates a field sheet PDF for the job.
   * The Cloud Function handles PDF creation, upload to Storage, and Document record creation.
   */
  const handleGenerateFieldSheet = async () => {
    setIsGeneratingFieldSheet(true);
    try {
      // Call Cloud Function - it handles PDF creation, upload, and Document record
      const response = await generateFieldSheet({ job_id: job.id });

      if (!response.success) {
        throw new Error(response.message || "Failed to generate field sheet");
      }

      // Update documents state with new field sheet without refreshing page
      if (response.document) {
        setDocuments(prevDocs => {
          // Remove any existing field sheets
          const filtered = prevDocs.filter(d => d.document_category !== 'field_sheet');
          // Add new field sheet
          return [...filtered, response.document];
        });
      }

      // Show success toast
      toast({
        variant: "success",
        title: "Field sheet created",
        description: "Your field sheet has been generated successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error generating field sheet",
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsGeneratingFieldSheet(false);
    }
  };

  /**
   * Merge multiple service document PDFs into a single document
   */
  const handleUploadSignedAffidavit = async (file) => {
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploadingSignedAffidavit(true);
    try {
      // Upload the signed PDF to Firebase Storage
      const uploadResult = await UploadFile(file);

      if (!uploadResult || !uploadResult.url) {
        throw new Error('File upload failed - no URL returned');
      }

      // Get page count from PDF
      let pageCount = 1;
      try {
        const { PDFDocument: PDFLib } = await import('pdf-lib');
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.load(arrayBuffer);
        pageCount = pdfDoc.getPageCount();
      } catch (error) {
        // Could not determine page count
      }

      // Create a new document record
      const newDocument = await Document.create({
        job_id: job.id,
        title: file.name.replace('.pdf', '').replace(/_/g, ' '),
        file_url: uploadResult.url,
        document_category: 'affidavit',
        content_type: 'application/pdf',
        page_count: pageCount,
        file_size: file.size,
        is_signed: true,
        signed_at: new Date().toISOString(),
        received_at: new Date().toISOString()
      });

      // Update local state
      setDocuments(prev => [...prev, newDocument]);

      // Update job to mark it has a signed affidavit
      await Job.update(job.id, {
        has_signed_affidavit: true
      });

      alert('Signed affidavit uploaded successfully!');

    } catch (error) {
      alert(`Failed to upload signed affidavit: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsUploadingSignedAffidavit(false);
    }
  };

  const handleUploadExternalAffidavit = async (file) => {
    setIsUploadingExternalAffidavit(true);
    try {
      // Upload the PDF to Firebase Storage
      const uploadResult = await UploadFile(file);

      if (!uploadResult || !uploadResult.url) {
        throw new Error('File upload failed - no URL returned');
      }

      // Navigate to the SignExternalAffidavit page
      navigate(createPageUrl(`SignExternalAffidavit?jobId=${job.id}&fileUrl=${encodeURIComponent(uploadResult.url)}`));

    } catch (error) {
      alert(`Failed to upload affidavit: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsUploadingExternalAffidavit(false);
    }
  };

  const handleMarkAffidavitSigned = async (documentId) => {
    try {
      // Update the document to mark it as signed
      await Document.update(documentId, {
        is_signed: true,
        signed_at: new Date().toISOString()
      });

      // Update local state
      setDocuments(prev => prev.map(doc =>
        doc.id === documentId
          ? {
            ...doc,
            is_signed: true,
            signed_at: new Date().toISOString()
          }
          : doc
      ));

      // Update job to mark it has a signed affidavit
      await Job.update(job.id, {
        has_signed_affidavit: true
      });

      alert('Affidavit marked as signed!');

    } catch (error) {
      alert(`Failed to mark affidavit as signed: ${error.message || 'Unknown error'}.`);
    }
  };

  const handleShareAffidavit = async (doc) => {
    try {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: doc.title,
          text: `View ${doc.title} for Job #${job.job_number}`,
          url: doc.file_url
        });
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(doc.file_url);
        alert('Link copied to clipboard!');
      }

    } catch (error) {
      // User cancelled share or clipboard failed
      if (error.name !== 'AbortError') {
        // Try clipboard as fallback
        try {
          await navigator.clipboard.writeText(doc.file_url);
          alert('Link copied to clipboard!');
        } catch (clipboardError) {
          alert('Unable to share. Please copy the link manually.');
        }
      }
    }
  };

  const handleMergeServiceDocuments = async () => {
    setIsMergingServiceDocs(true);
    try {
      const pdfDocs = serviceDocuments.filter(doc =>
        doc.content_type === 'application/pdf' && doc.file_url
      );

      if (pdfDocs.length < 2) {
        alert('Need at least 2 PDF documents to merge');
        return;
      }

      const fileUrls = pdfDocs.map(doc => doc.file_url);

      // Call the Firebase Cloud Function
      const response = await mergePDFs({
        file_urls: fileUrls,
        merged_title: 'Merged_Service_Documents'
      });

      if (!response.success || !response.url) {
        throw new Error(response.message || 'Failed to merge PDFs');
      }

      // Create new document entry for merged PDF
      const mergedDoc = await Document.create({
        job_id: job.id,
        title: 'Merged Service Documents',
        file_url: response.url,
        document_category: 'affidavit', // Note: swapped category for service docs
        content_type: 'application/pdf',
        page_count: response.pageCount || pdfDocs.reduce((total, doc) => total + (doc.page_count || 1), 0),
        received_at: new Date().toISOString()
      });

      // Update local state
      setDocuments(prev => [...prev, mergedDoc]);

    } catch (error) {
      alert(`Failed to merge PDFs: ${error.message || 'Unknown error'}. Please try again.`);
    }
    setIsMergingServiceDocs(false);
  };

  // --- Invoice Action Handlers ---
  const handleIssueInvoice = async (invoiceId) => {
    setIsIssuingInvoice(true);
    try {
      await Invoice.update(invoiceId, {
        status: 'Issued',
        issued_on: new Date().toISOString(),
        last_issued_at: new Date().toISOString()
      });

      // Add activity log entry
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        event_type: 'invoice_issued',
        description: `Invoice issued`,
        user_name: user?.full_name || user?.displayName || 'Unknown'
      };
      await Job.update(job.id, {
        activity_log: [...(job.activity_log || []), newLogEntry]
      });

      // Refresh local invoice state immediately
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'Issued', issued_on: new Date().toISOString() }
          : inv
      ));

      // Also update job activity log in local state
      setJob(prev => ({
        ...prev,
        activity_log: [...(prev.activity_log || []), newLogEntry]
      }));

      toast({ title: 'Invoice Issued', description: 'Invoice has been issued successfully.' });
      await refreshData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to issue invoice.' });
    }
    setIsIssuingInvoice(false);
  };

  const handleEmailInvoice = async (invoice) => {
    // Get client email from multiple sources
    const clientEmail = job?.contact_email ||
      job?.submitted_by?.email ||
      client?.contact_email ||
      client?.email ||
      (Array.isArray(client?.contacts) && client.contacts.find(c => c.primary)?.email) ||
      (Array.isArray(client?.contacts) && client.contacts[0]?.email);

    if (!clientEmail) {
      toast({ variant: 'destructive', title: 'No Email', description: 'No client email address found. Please add a contact email to the client or job.' });
      return;
    }

    setIsEmailingInvoice(true);
    try {
      await InvoiceManager.sendInvoiceEmail(invoice.id, clientEmail, {
        invoice_number: invoice.invoice_number,
        total: invoice.total,
        due_date: invoice.due_date
      });

      toast({ title: 'Email Queued', description: `Invoice email queued for ${clientEmail}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to queue invoice email.' });
    }
    setIsEmailingInvoice(false);
  };

  const handleIssueAndEmailInvoice = async (invoice) => {
    setIsIssuingInvoice(true);
    setIsEmailingInvoice(true);
    try {
      // First issue the invoice
      await Invoice.update(invoice.id, {
        status: 'Issued',
        issued_on: new Date().toISOString(),
        last_issued_at: new Date().toISOString()
      });

      // Add activity log entry
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        event_type: 'invoice_issued',
        description: `Invoice issued and emailed`,
        user_name: user?.full_name || user?.displayName || 'Unknown'
      };
      await Job.update(job.id, {
        activity_log: [...(job.activity_log || []), newLogEntry]
      });

      // Refresh local invoice state immediately
      setInvoices(prev => prev.map(inv =>
        inv.id === invoice.id
          ? { ...inv, status: 'Issued', issued_on: new Date().toISOString() }
          : inv
      ));

      // Also update job activity log in local state
      setJob(prev => ({
        ...prev,
        activity_log: [...(prev.activity_log || []), newLogEntry]
      }));

      // Then send email - check multiple sources for client email
      const clientEmail = job?.contact_email ||
        job?.submitted_by?.email ||
        client?.contact_email ||
        client?.email ||
        (Array.isArray(client?.contacts) && client.contacts.find(c => c.primary)?.email) ||
        (Array.isArray(client?.contacts) && client.contacts[0]?.email);

      if (clientEmail) {
        await InvoiceManager.sendInvoiceEmail(invoice.id, clientEmail, {
          invoice_number: invoice.invoice_number,
          total: invoice.total,
          due_date: invoice.due_date
        });
        toast({ title: 'Invoice Issued & Email Queued', description: `Invoice issued and email queued for ${clientEmail}` });
        await refreshData();
      } else {
        toast({ title: 'Invoice Issued', description: 'Invoice issued but no email address found for client. Please add a contact email.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to issue and email invoice.' });
    }
    setIsIssuingInvoice(false);
    setIsEmailingInvoice(false);
  };



  // Line 2120 ke baad add karo - Download PDF Handler
  const handleDownloadInvoicePDF = async () => {
    try {
      const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));
      if (!jobInvoice) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invoice not found'
        });
        return;
      }

      toast({
        title: 'Generating PDF',
        description: 'Please wait while we generate your PDF...',
        variant: 'default',
        className: 'border-blue-200 bg-blue-50 text-blue-900'
      });

      // Wait for invoice preview to render
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = document.getElementById('invoice-pdf-preview');
      if (!element) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invoice preview not found. Please try again.'
        });
        return;
      }

      const opt = {
        margin: [0.15, 0.25],
        filename: `Invoice-${jobInvoice.invoice_number}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 1.0,
          useCORS: true,
          logging: false,
          letterRendering: true,
          windowWidth: 800,
          height: 1000,
          width: 800,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'in',
          format: 'letter',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: 'avoid-all',
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['.invoice-header', '.invoice-details', '.invoice-line-items', '.invoice-totals']
        },
        enableLinks: false
      };

      // Generate PDF and download (browser download)
      await html2pdf().set(opt).from(element).save();

      toast({
        title: 'PDF Downloaded',
        description: `Invoice ${jobInvoice.invoice_number} has been downloaded.`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.'
      });
    }
  };

  // Line 2070 ke baad add karo - PDF Download Handler
  const handleViewInvoicePDF = async () => {
    try {
      const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));
      if (!jobInvoice) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invoice not found'
        });
        return;
      }

      toast({
        title: 'Generating PDF',
        description: 'Please wait while we generate your PDF...',
        variant: 'default',
        className: 'border-blue-200 bg-blue-50 text-blue-900'
      });

      // Wait for invoice preview to render (if not already rendered)
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = document.getElementById('invoice-pdf-preview');
      if (!element) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invoice preview not found. Please try again.'
        });
        return;
      }


      const opt = {
        margin: [0.15, 0.25],
        filename: `Invoice-${jobInvoice.invoice_number}.pdf`,
        image: { type: 'jpeg', quality: 0.9 },
        html2canvas: {
          scale: 1.0,
          useCORS: true,
          logging: false,
          letterRendering: true,
          windowWidth: 800,
          height: 1000,
          width: 800,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'in',
          format: 'letter',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: 'avoid-all',
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['.invoice-header', '.invoice-details', '.invoice-line-items', '.invoice-totals', '.bill-to-section']
        },
        enableLinks: false
      };

      // Generate PDF as blob
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');

      // Create object URL and open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

      // Cleanup after a delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

      toast({
        title: 'PDF Opened',
        description: 'Invoice PDF opened in new tab.',
        variant: 'default',
        className: 'border-green-200 bg-green-50 text-green-900'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.'
      });
    }
  };



  // Line 2030 ke area mein add karo - Invoice Save Handler
  // Line 2067 - Complete function replace karo
  const handleSaveInvoiceEdit = async (updatedData) => {
    if (!job?.id) return;

    setIsSavingInvoice(true);
    try {
      const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));
      if (!jobInvoice) {
        throw new Error('Invoice not found');
      }

      // VALIDATION
      if (!updatedData.line_items || updatedData.line_items.length === 0) {
        toast({
          variant: 'default',
          title: 'Note',
          description: 'Invoice must have at least one line item.',
          className: 'border-yellow-200 bg-yellow-50 text-yellow-900'
        });
        setIsSavingInvoice(false);
        return;
      }

      // SPEED FIX 1: UI immediately update
      const optimisticInvoice = {
        ...jobInvoice,
        invoice_date: updatedData.invoice_date || jobInvoice.invoice_date,
        due_date: updatedData.due_date || jobInvoice.due_date,
        tax_rate: updatedData.tax_rate,
        tax_amount: updatedData.tax_amount,
        total_tax_amount: updatedData.tax_amount,
        line_items: updatedData.line_items,
        subtotal: updatedData.subtotal,
        total_amount: updatedData.total_amount,
        total: updatedData.total_amount,
        balance_due: updatedData.balance_due,
        updated_at: new Date().toISOString()
      };
      setInvoices([optimisticInvoice]);
      setIsEditingInvoice(false);

      // SPEED FIX 2: Database update (background)
      Invoice.update(jobInvoice.id, {
        invoice_date: updatedData.invoice_date || jobInvoice.invoice_date,
        due_date: updatedData.due_date || jobInvoice.due_date,
        tax_rate: updatedData.tax_rate,
        tax_amount: updatedData.tax_amount,
        total_tax_amount: updatedData.tax_amount,
        line_items: updatedData.line_items,
        subtotal: updatedData.subtotal,
        total_amount: updatedData.total_amount,
        total: updatedData.total_amount,
        balance_due: updatedData.balance_due,
        updated_at: new Date().toISOString()
      }).catch(err => {
        // Revert on error
        setInvoices([jobInvoice]);
        setIsEditingInvoice(true);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save invoice. Please try again.'
        });
      });

      // SPEED FIX 3: Activity log (fire and forget - don't wait)
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        event_type: 'invoice_updated',
        description: `Invoice ${jobInvoice.invoice_number} updated`,
        user_name: user?.displayName || user?.email || 'Unknown'
      };
      const currentActivityLog = Array.isArray(job?.activity_log) ? job.activity_log : [];

      // Don't wait - update in background
      Job.update(job.id, {
        activity_log: [...currentActivityLog, newLogEntry]
      }).catch(err => {
        // Activity log update failed
      });

      // Update local job state
      setJob(prev => ({
        ...prev,
        activity_log: [...currentActivityLog, newLogEntry]
      }));

      // SUCCESS MESSAGE
      toast({
        title: 'Invoice Updated',
        description: 'Your changes have been saved successfully.',
        className: 'border-green-200 bg-green-50 text-green-900'
      });

      setIsSavingInvoice(false);

    } catch (error) {

      // Revert optimistic update
      const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));
      if (jobInvoice) {
        setInvoices([jobInvoice]);
      }
      setIsEditingInvoice(true);

      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save invoice changes.'
      });
      setIsSavingInvoice(false);
    }
  };
  // --- Render Logic ---
  // The JSX below is for rendering the UI. The structure will remain the same.
  // You will just be passing data fetched from Firebase instead of Base44.

  // Loading state display
  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* ... Skeleton UI ... */}
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

  // Error state display
  if (error) {
    return (
      <div className="p-8 text-center">
        {/* ... Error UI ... */}
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

  // Not found state display
  if (!job) {
    return (
      <div className="p-8 text-center">
        {/* ... Not Found UI ... */}
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

  const primaryAddress = job.addresses?.find(addr => addr.primary) || job.addresses?.[0];
  const jobCoordinates = primaryAddress ? {
    latitude: primaryAddress.latitude,
    longitude: primaryAddress.longitude
  } : null;

  const jobAddressString = primaryAddress
    ? `${primaryAddress.address1}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.postal_code}`
    : null;

  // Main component render
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8 max-w-full md:max-w-none md:pr-8">
        {/* Header Section */}
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
              onClick={() => {
                setEmailPreSelectedContent({});
                setIsEmailDialogOpen(true);
              }}
              variant="outline"
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </Button>
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

        {/* Job Share Chain */}
        {job?.job_share_chain?.is_shared && currentUser?.company_id && (
          <div className="mb-6">
            <JobShareChain job={job} currentCompanyId={currentUser.company_id} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Assignment Card */}
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
                          className={`gap-2 justify-center transition-colors ${editFormData.server_type === 'employee'
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
                          className={`gap-2 justify-center transition-colors ${editFormData.server_type === 'contractor'
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
                        <Building2 className="w-4 h-4" />
                        {client?.id ? (
                          <Link
                            to={createPageUrl(`ClientDetails?id=${client.id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {client.company_name}
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </p>

                      <div className="mt-3">
                        <Label className="text-xs text-slate-500">Job Contact</Label>

                        {(() => {
                          const contact = client?.contacts?.find(c => c.email === job.contact_email);
                          if (contact) {
                            return (
                              <div className="mt-1">
                                <p className="font-medium text-sm text-slate-800 flex items-center gap-2">
                                  <UserCircle className="w-4 h-4 text-slate-400" />
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

                      {/* Submitted By - shown for portal-submitted jobs */}
                      {job.source === 'client_portal' && job.submitted_by && (
                        <div className="mt-3">
                          <Label className="text-xs text-slate-500">Submitted By (Portal)</Label>
                          <div className="mt-1">
                            <p className="font-medium text-sm text-slate-800 flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-blue-500" />
                              {job.submitted_by.name}
                            </p>
                            {job.submitted_by.email && (
                              <p className="text-sm text-slate-600 flex items-center gap-2 mt-0.5">
                                <Mail className="w-4 h-4 text-slate-400" />
                                {job.submitted_by.email}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Assigned Server</Label>
                      <div className="flex items-center gap-2 font-semibold">
                        {server?.type === 'Employee' ? <UserIcon className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                        <span>{server?.name || 'Unassigned'}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 capitalize">{job.server_type || 'employee'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Court Reporting Details - shown for court reporting jobs */}
            {job?.job_type === JOB_TYPES.COURT_REPORTING && (
              <CourtReportingDetails job={job} employees={employees} />
            )}

            {/* Process Serving Details - shown for process serving jobs (default) */}
            {(!job?.job_type || job?.job_type === JOB_TYPES.PROCESS_SERVING) && (
            <>
            {/* Recipient & Service Details Card */}
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
                                  <Star className="w-3.5 h-3.5" /> Set Primary
                                </Button>
                              )}
                              {editFormData.addresses && editFormData.addresses.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100 hover:text-red-600" onClick={() => handleRemoveAddress(index)}>
                                  <Trash2 className="w-4 h-4" />
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
                        <Plus className="w-4 h-4" /> Add Another Address
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
                            <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-slate-400" />
                            <div>
                              {address.address1}<br />
                              {address.address2 && <>{address.address2}<br /></>}
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

                    <div className="pt-4 border-t border-slate-200">
                      <Label className="text-xs text-slate-500">Service Instructions</Label>
                      {job?.service_instructions ? (
                        <p className="text-sm text-slate-700 mt-1">{job.service_instructions}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic mt-1">No special instructions provided</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Service Attempts Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Service Attempts ({Array.isArray(attempts) ? attempts.length : 0})
                  </CardTitle>
                  <Link to={`${createPageUrl('LogAttempt')}?jobId=${job.id}`}>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Log Attempt
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  History of all service attempts for this job
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Attempt Time Coverage - only show for individuals with attempts */}
                {job?.recipient?.type === 'individual' && attempts && attempts.length > 0 && (
                  <div className="pb-4 border-b border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Attempt Time Coverage</h4>
                    <AttemptTimeIndicator attempts={attempts} />
                  </div>
                )}

                {Array.isArray(attempts) && attempts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="font-medium">No service attempts yet</p>
                    <p className="text-sm">Log the first attempt to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attempts
                      .sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date))
                      .map(attempt => {
                        return (
                          <AttemptWithMap
                            key={attempt.id}
                            attempt={attempt}
                            jobId={job.id}
                            jobAddress={jobAddressString}
                            jobCoordinates={jobCoordinates}
                            employees={allEmployees}
                            companyId={user?.company_id}
                            hasClientEmail={Boolean(job?.contact_email || client?.contact_email || client?.email)}
                            onEmailSent={(result) => {
                              if (result.success) {
                                toast({
                                  title: 'Email Sent',
                                  description: `Attempt notification sent to ${result.recipient}`,
                                });
                              } else {
                                toast({
                                  variant: 'destructive',
                                  title: 'Error',
                                  description: result.error || 'Failed to send attempt notification',
                                });
                              }
                            }}
                          />
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Documents Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Service Documents ({isEditingServiceDocuments ? editedDocuments.length : serviceDocuments.length})
                  </CardTitle>
                  {!isEditingServiceDocuments && (
                    <div className="flex items-center gap-2">
                      {serviceDocuments.filter(doc => doc.content_type === 'application/pdf' && doc.file_url).length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleMergeServiceDocuments}
                          disabled={isMergingServiceDocs}
                          className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          {isMergingServiceDocs ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Combine className="w-4 h-4" />
                          )}
                          {isMergingServiceDocs ? 'Merging...' : `Merge ${serviceDocuments.filter(doc => doc.content_type === 'application/pdf' && doc.file_url).length} PDFs`}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleStartEdit('serviceDocuments')} className="gap-2">
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingServiceDocuments ? (
                  <div className="space-y-4">
                    <DocumentUpload
                      documents={editedDocuments}
                      onDocumentsChange={setEditedDocuments}
                    />
                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => handleSaveEdit('serviceDocuments')}>
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => handleCancelEdit('serviceDocuments')}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {serviceDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {serviceDocuments.map((doc, index) => (
                          <div
                            key={doc.id}
                            className={`flex items-center justify-between p-3 rounded-md ${index === 0
                              ? 'bg-blue-50 border-2 border-blue-300'
                              : 'bg-slate-50 border border-slate-200'
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-600" />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{doc.title}</span>
                                  {index === 0 && (
                                    <Badge className="bg-blue-600 text-white text-xs">Main Document</Badge>
                                  )}
                                </div>
                              </div>
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Affidavits Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  Affidavits ({affidavitDocuments.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isUploadingExternalAffidavit}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'application/pdf';
                      input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          await handleUploadExternalAffidavit(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    {isUploadingExternalAffidavit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload
                      </>
                    )}
                  </Button>
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
                </div>
              </CardHeader>
              <CardContent>
                {affidavitDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {affidavitDocuments.map(doc => (
                      <div key={doc.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Paperclip className="w-5 h-5 text-slate-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900">{doc.title}</span>
                                {doc.is_signed && (
                                  <Badge variant="default" className="bg-green-600 text-white gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Signed
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy h:mm a') : 'Date unknown'}
                                </span>
                                {doc.page_count && (
                                  <span className="text-slate-500">
                                    {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleShareAffidavit(doc)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Share2 className="w-4 h-4" />
                                  Share
                                </DropdownMenuItem>
                                {!doc.is_signed && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleMarkAffidavitSigned(doc.id)}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      Mark as Signed
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
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



            {/* ✅ Invoice PDF Preview Card - Only show when editing */}
            {isEditingInvoice && (() => {
              const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));
              if (!jobInvoice) return null;

              return (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Invoice PDF Preview
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleDownloadInvoicePDF}
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2 bg-slate-900 hover:bg-slate-800"
                        onClick={handleViewInvoicePDF}
                      >
                        <Eye className="w-4 h-4" />
                        View PDF Preview
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="hidden"> {/*  Hidden but still in DOM for PDF generation */}
                    <div id="invoice-pdf-preview" className="bg-white" style={{ maxHeight: '10.5in', overflow: 'hidden' }}>
                      <InvoicePreview
                        invoice={jobInvoice}
                        client={client}
                        job={job}
                        companyInfo={(() => {
                          if (!companyData) return null;

                          // Get primary address from addresses array or fallback to legacy fields
                          const primaryAddress = companyData.addresses?.find(addr => addr.primary) || companyData.addresses?.[0];

                          return {
                            company_name: companyData.name || '',
                            address1: primaryAddress?.address1 || companyData.address || '',
                            address2: primaryAddress?.address2 || '',
                            city: primaryAddress?.city || companyData.city || '',
                            state: primaryAddress?.state || companyData.state || '',
                            zip: primaryAddress?.postal_code || companyData.zip || '',
                            phone: companyData.phone || '',
                            email: companyData.email || ''
                          };
                        })()}
                        isEditing={false}
                        invoiceSettings={invoiceSettings}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })()}



            {/* Live Invoice Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
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
                      issued: { color: "bg-blue-100 text-blue-700", label: "Issued" },
                      sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
                      paid: { color: "bg-green-100 text-green-700", label: "Paid" },
                      overdue: { color: "bg-red-100 text-red-700", label: "Overdue" },
                      cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
                    };

                    const statusKey = (jobInvoice.status || '').toLowerCase();
                    const config = invoiceStatusConfig[statusKey] || invoiceStatusConfig.draft;
                    return (
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                    );
                  })()}
                </div>
                {(() => {
                  const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));
                  if (jobInvoice) {
                    const isDraft = jobInvoice.status?.toLowerCase() === 'draft';
                    const isIssued = ['issued', 'sent'].includes(jobInvoice.status?.toLowerCase());

                    return (
                      <div className="flex items-center gap-2">
                        {/* View Invoice button - always show */}
                        <Link to={createPageUrl(`InvoiceDetail?id=${jobInvoice.id}&returnTo=JobDetails&jobId=${job.id}`)}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <FileText className="w-4 h-4" />
                            View
                          </Button>
                        </Link>

                        {isEditingInvoice && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setIsEditingInvoice(false)}
                              disabled={isSavingInvoice}
                            >
                              Cancel
                            </Button>
                            {/* Save button InvoicePreview component mein already hai */}

                            <Button
                              variant="default"
                              size="sm"
                              className="gap-2 bg-slate-900 hover:bg-slate-800"
                              onClick={() => {
                                setSaveInvoiceTrigger(prev => prev + 1);
                              }}
                              disabled={isSavingInvoice}
                            >
                              {isSavingInvoice ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Save
                                </>
                              )}
                            </Button>
                          </>
                        )}



                        {/* ✅ EDIT BUTTON - YEH ADD KARO */}
                        {!isEditingInvoice && jobInvoice.status?.toLowerCase() !== 'paid' && !jobInvoice.locked && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsEditingInvoice(true)}
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                        )}


                        {/* Issue Invoice button - only show for draft */}
                        {isDraft && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleIssueInvoice(jobInvoice.id)}
                            disabled={isIssuingInvoice}
                          >
                            {isIssuingInvoice ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Issue
                          </Button>
                        )}

                        {/* Issue & Email button (for draft) or Email button (for issued) */}
                        {isDraft ? (
                          <Button
                            size="sm"
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleIssueAndEmailInvoice(jobInvoice)}
                            disabled={isIssuingInvoice || isEmailingInvoice}
                          >
                            {(isIssuingInvoice || isEmailingInvoice) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                            Issue & Email
                          </Button>
                        ) : isIssued && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleEmailInvoice(jobInvoice)}
                            disabled={isEmailingInvoice}
                          >
                            {isEmailingInvoice ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                            Email
                          </Button>
                        )}
                      </div>
                    );
                  } else {
                    // If no invoice exists, show Save and Create Invoice buttons
                    return (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveInvoiceItems}
                          className="gap-2 relative"
                          disabled={isCreatingInvoice}
                        >
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
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCreateInvoice}
                          className="gap-2 bg-slate-900 hover:bg-slate-800"
                          disabled={isCreatingInvoice || lineItems.length === 0}
                        >
                          {isCreatingInvoice ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Create Invoice
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  }
                })()}
              </CardHeader>

              <CardContent className="space-y-4">{(() => {
                const jobInvoice = invoices.find(inv => inv.job_ids?.includes(job.id));

                if (jobInvoice) {
                  // EDITING MODE
                  if (isEditingInvoice) {
                    return (
                      <div className="bg-white rounded-lg p-4">
                        <InvoicePreview
                          invoice={jobInvoice}
                          client={client}
                          job={job}
                          companyInfo={(() => {
                            if (!companyData) return null;

                            // Get primary address from addresses array or fallback to legacy fields
                            const primaryAddress = companyData.addresses?.find(addr => addr.primary) || companyData.addresses?.[0];

                            return {
                              company_name: companyData.name || '',
                              address1: primaryAddress?.address1 || companyData.address || '',
                              address2: primaryAddress?.address2 || '',
                              city: primaryAddress?.city || companyData.city || '',
                              state: primaryAddress?.state || companyData.state || '',
                              zip: primaryAddress?.postal_code || companyData.zip || '',
                              phone: companyData.phone || '',
                              email: companyData.email || ''
                            };
                          })()}
                          isEditing={true}
                          onSave={handleSaveInvoiceEdit}
                          onCancel={() => setIsEditingInvoice(false)}
                          isSaving={isSavingInvoice}
                          invoiceSettings={invoiceSettings}
                          saveTrigger={saveInvoiceTrigger}
                        />
                      </div>
                    );
                  }

                  // READ-ONLY MODE
                  const total = jobInvoice.total || jobInvoice.total_amount || 0;
                  const totalPaid = jobInvoice.total_paid || 0;
                  const balanceDue = jobInvoice.balance_due || (total - totalPaid);
                  const taxAmount = jobInvoice.total_tax_amount || jobInvoice.tax_amount || 0;
                  const discountAmount = jobInvoice.discount_amount || 0;

                  return (
                    <>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>Invoice #</span>
                          <span className="font-medium">{jobInvoice.invoice_number}</span>
                        </div>
                        {jobInvoice.invoice_type && jobInvoice.invoice_type !== 'job' && (
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Type</span>
                            <Badge className="bg-purple-100 text-purple-700 capitalize">{jobInvoice.invoice_type}</Badge>
                          </div>
                        )}
                        {jobInvoice.due_date && (
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Due Date</span>
                            <span className="font-medium">{format(new Date(jobInvoice.due_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        {jobInvoice.issued_on && (
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Issued On</span>
                            <span className="font-medium">{format(new Date(jobInvoice.issued_on), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        {jobInvoice.paid_on && (
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Paid On</span>
                            <span className="font-medium text-green-700">{format(new Date(jobInvoice.paid_on), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        {jobInvoice.locked && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            <Lock className="w-3 h-3" />
                            <span>Invoice is locked</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Line Items</h4>
                        <div className="space-y-2">
                          {Array.isArray(jobInvoice.line_items) && jobInvoice.line_items.map((item, index) => (
                            <div key={index} className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">{item.item_name || item.description}</p>
                                <p className="text-xs text-slate-500">
                                  {item.quantity} × ${parseFloat(item.unit_price || item.rate || 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-sm font-medium text-slate-900">
                                ${parseFloat(item.total || item.amount || 0).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal:</span>
                          <span className="font-medium">${parseFloat(jobInvoice.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Discount{jobInvoice.discount_type === 'percentage' ? ` (${jobInvoice.discount_amount}%)` : ''}:</span>
                            <span className="font-medium text-green-600">-${parseFloat(discountAmount).toFixed(2)}</span>
                          </div>
                        )}
                        {taxAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Tax {jobInvoice.tax_rate ? `(${(jobInvoice.tax_rate * 100).toFixed(1)}%)` : ''}:</span>
                            <span className="font-medium">${parseFloat(taxAmount).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-bold text-slate-900">Total:</span>
                          <span className="text-lg font-bold text-slate-900">${parseFloat(total).toFixed(2)}</span>
                        </div>
                        {totalPaid > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Paid:</span>
                              <span className="font-medium text-green-600">${parseFloat(totalPaid).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                              <span className="font-bold text-slate-900">Balance Due:</span>
                              <span className="text-xl font-bold text-blue-600">${parseFloat(balanceDue).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {jobInvoice.currency && jobInvoice.currency !== 'USD' && (
                        <div className="mt-3 text-xs text-slate-500">
                          Currency: {jobInvoice.currency}
                        </div>
                      )}
                    </>
                  );
                } else {
                  // Display editable line items for jobs without invoices
                  return (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {Array.isArray(lineItems) && lineItems.map((item, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="flex-1 space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Description"
                                  value={item.description || ''}
                                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                  className="flex-1"
                                />
                                {invoicePresets && invoicePresets.length > 0 && (
                                  <select
                                    className="px-2 py-1 text-sm border rounded-md bg-white"
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handlePresetSelect(index, e.target.value);
                                      }
                                    }}
                                  >
                                    <option value="">Presets</option>
                                    {invoicePresets.map((preset, i) => (
                                      <option key={i} value={preset.description}>
                                        {preset.description} (${preset.rate || preset.default_amount || 0})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-500">Qty:</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity || 1}
                                    onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                    className="w-16 text-center"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-500">Rate:</span>
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.rate || 0}
                                      onChange={(e) => handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                                      className="w-24 pl-5"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-auto">
                                  <span className="text-sm font-medium">
                                    ${((item.quantity || 1) * (item.rate || 0)).toFixed(2)}
                                  </span>
                                </div>
                                {lineItems.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveLineItem(index)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddLineItem}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Line Item
                      </Button>

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-900">Total:</span>
                          <span className="text-xl font-bold text-slate-900">${totalFee.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
              </CardContent>
            </Card>


            {/* Notes Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5" />
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
            </>
            )}
          </div>

          {/* Right Column - Service History */}
          <div className="lg:col-span-1 space-y-6">
            {/* Case Information Card - Process Serving Only */}
            {(!job?.job_type || job?.job_type === JOB_TYPES.PROCESS_SERVING) && (
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
                  <AnimatePresence mode="wait">
                    {isLoadingCourtCase ? (
                      <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-36" />
                        </div>
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-36" />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 text-sm">Case Number:</span>
                          {(courtCase?.case_number || job?.case_number) ? (
                            <Link
                              to={`/jobs?search=${encodeURIComponent(courtCase?.case_number || job?.case_number)}&view=case`}
                              className="font-medium text-sm text-right text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {courtCase?.case_number || job?.case_number}
                            </Link>
                          ) : (
                            <span className="font-medium text-sm text-right">N/A</span>
                          )}
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 text-sm">Court:</span>
                          <span className="font-medium text-sm text-right">{courtCase?.court_name || job?.court_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 text-sm">Plaintiff:</span>
                          <span className="font-medium text-sm text-right max-w-[60%]">{courtCase?.plaintiff || job?.plaintiff || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 text-sm">Defendant:</span>
                          <span className="font-medium text-sm text-right max-w-[60%]">{courtCase?.defendant || job?.defendant || 'N/A'}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
            )}

            {/* Service Details Card - Process Serving Only */}
            {(!job?.job_type || job?.job_type === JOB_TYPES.PROCESS_SERVING) && (
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Priority:</span>
                      <Badge className={priorityConfig[job.priority]?.color || "bg-slate-100"}>
                        {priorityConfig[job.priority]?.label || job.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-600 text-sm">Due Date:</span>
                      <span className="font-medium text-sm text-right">
                        {job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-600 text-sm">First Attempt Due:</span>
                      <span className="font-medium text-sm text-right">
                        {job.first_attempt_due_date ? format(new Date(job.first_attempt_due_date), 'MMM d, yyyy') : 'Not set'}
                      </span>
                    </div>
                    {job.first_attempt_instructions && (
                      <div className="pt-2 border-t">
                        <Label className="text-xs text-slate-500">First Attempt Instructions</Label>
                        <p className="text-sm text-slate-700 mt-1">{job.first_attempt_instructions}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Field Sheet Card - Process Serving Only */}
            {(!job?.job_type || job?.job_type === JOB_TYPES.PROCESS_SERVING) && (
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
                      const isValidDate = docDate && !isNaN(new Date(docDate).getTime());
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50 border">
                          <div className="flex items-center gap-2">
                            <FileClock className="w-4 h-4 text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{doc.title}</p>
                              <p className="text-xs text-slate-500">
                                {isValidDate ? `Generated on ${format(new Date(docDate), 'MMM d, yyyy @ h:mm a')}` : 'Date unknown'}
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
            )}

            {/* Job Activity Card - Shown for all job types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
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

      {/* Dialog for creating a new contact. This component is self-contained. */}
      <NewContactDialog
        open={isNewContactDialogOpen}
        onOpenChange={setIsNewContactDialogOpen}
        client={client}
        onContactCreated={handleContactCreated}
      />

      {/* Dialog for sending job emails */}
      <SendJobEmailDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        job={job}
        client={client}
        attempts={attempts}
        assignedServer={allEmployees?.find(e => e.id === job?.assigned_server_id)}
        companyId={user?.company_id}
        preSelectedContent={emailPreSelectedContent}
      />

    </div>
  );
}
