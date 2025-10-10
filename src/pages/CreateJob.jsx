
// FIREBASE TRANSITION: This is a critical page with multiple database write operations.
// - `handleSubmit`: This function needs to be carefully migrated.
//   - `generateJobNumber`: Will need to query Firestore for the count of jobs to generate a new number.
//   - `User.me()`: Replace with Firebase Auth.
//   - `Court.filter`, `Court.create`, `Court.update`: Replace with Firestore queries (`where`), `addDoc`, and `updateDoc` on the 'courts' collection.
//   - `CourtCase.create`: Replace with `addDoc` on the 'court_cases' collection.
//   - `Job.create`: Replace with `addDoc` on the 'jobs' collection.
//   - `Document.bulkCreate`: Replace with a Firestore `writeBatch` to add all documents atomically.
//   - `generateFieldSheet`: Will be a call to your new Firebase Cloud Function.

import React, { useState, useEffect } from "react";
import { useGlobalData } from "@/components/GlobalDataContext";
// FIREBASE TRANSITION: Replace with Firebase SDK imports.
import { Job, Client, Employee, CourtCase, Document, Court, CompanySettings, User, ServerPayRecord, Invoice } from "@/api/entities"; // Added User import, Added ServerPayRecord, Added Invoice
import { SecureJobAccess, SecureCourtAccess, SecureCaseAccess } from "@/firebase/multiTenantAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, // Retained as per outline
  SelectItem, // Retained as per outline
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  Building2,
  Check,
  UserPlus,
  User as UserIcon, // Renamed to avoid conflict with imported User entity
  HardHat,
  Star,
  Landmark,
  Pencil,
  X,
  AlertTriangle,
  Store
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ClientSearchInput from "../components/jobs/ClientSearchInput";
import SelectedClientBox from "../components/jobs/SelectedClientBox";
import NewClientQuickForm from "../components/jobs/NewClientQuickForm";
import DocumentUpload from "../components/jobs/DocumentUpload";
import NewContactDialog from "../components/jobs/NewContactDialog";
import AddressAutocomplete from "../components/jobs/AddressAutocomplete";
import AddressListManager from "../components/jobs/AddressListManager";
import ServerPayItems from "../components/jobs/ServerPayItems";
import CourtAutocomplete from "../components/jobs/CourtAutocomplete";
import ContractorSearchInput from "../components/jobs/ContractorSearchInput";
import CaseNumberAutocomplete from "../components/jobs/CaseNumberAutocomplete"; // New Import
import QuickInvoice from "../components/jobs/QuickInvoice";
// FIREBASE TRANSITION: This will call your new Firebase Cloud Function.
import { generateFieldSheet } from "@/api/functions"; // Added import for generateFieldSheet

export default function CreateJobPage() {
  const navigate = useNavigate();
  const { companyData, refreshData } = useGlobalData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    client_id: "",
    client_job_number: "",
    contact_id: "",
    contact_email: "",
    plaintiff: "",
    defendant: "",
    case_number: "",
    court_name: "",
    court_county: "",
    court_address: {},
    recipient_name: "",
    recipient_type: "individual",
    // Updated to support multiple addresses
    addresses: [{
      label: "Service Address",
      address1: "",
      address2: "",
      city: "",
      state: "",
      postal_code: "",
      latitude: null,
      longitude: null,
      primary: true
    }],
    service_instructions: "",
    server_type: "employee",
    assigned_server_id: "unassigned",
    priority: "standard",
    due_date: "",
    first_attempt_instructions: "",
    first_attempt_due_date: "",
    service_fee: 75,
    rush_fee: 0,
    mileage_fee: 0,
    server_pay_items: []
  });

  const [employees, setEmployees] = useState([]);
  const [clientContacts, setClientContacts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isCourtAddressLoading, setIsCourtAddressLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [showCourtDetails, setShowCourtDetails] = useState(false);
  const [showCourtEditWarning, setShowCourtEditWarning] = useState(false);
  const [isEditingExistingCourt, setIsEditingExistingCourt] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);
  const [clientSearchText, setClientSearchText] = useState("");
  const [lastAddedContact, setLastAddedContact] = useState(null);
  const [selectedCourtFromAutocomplete, setSelectedCourtFromAutocomplete] = useState(null);
  const [prioritySettings, setPrioritySettings] = useState([
    { name: "standard", label: "Standard", days_offset: 14, first_attempt_days: 3 },
    { name: "rush", label: "Rush", days_offset: 2, first_attempt_days: 1 },
    { name: "same_day", label: "Same Day", days_offset: 0, first_attempt_days: 0 }
  ]);
  const [contractorSearchText, setContractorSearchText] = useState("");
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null); // New state
  const [isEditingCase, setIsEditingCase] = useState(false); // New state for case editing
  const [showCaseEditWarning, setShowCaseEditWarning] = useState(false); // New state for case warning dialog
  const [associatedJobsCount, setAssociatedJobsCount] = useState(0); // New state for job count

  useEffect(() => {
    const loadAndSetEmployees = async () => {
      try {
        const employeesData = await Employee.list();
        setEmployees(employeesData);

        const defaultServer = employeesData.find(e => e.is_default_server === true);
        if (defaultServer) {
          setFormData(prev => ({
            ...prev,
            assigned_server_id: String(defaultServer.id)
          }));
        }

        await loadPrioritySettings();

      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };

    loadAndSetEmployees();
  }, []);

  const loadPrioritySettings = async () => {
    try {
      const settings = await CompanySettings.filter({ setting_key: "job_priorities" });
      if (settings.length > 0 && settings[0].setting_value && settings[0].setting_value.priorities) {
        const loadedPriorities = settings[0].setting_value.priorities;
        if (Array.isArray(loadedPriorities) && loadedPriorities.length > 0) {
          const validatedPriorities = loadedPriorities.map(p => ({
            name: p.name || 'standard',
            label: p.label || 'Standard',
            days_offset: typeof p.days_offset === 'number' ? p.days_offset : 14,
            first_attempt_days: typeof p.first_attempt_days === 'number' ? p.first_attempt_days : 3
          }));
          setPrioritySettings(validatedPriorities);
        }
      }
    } catch (error) {
      console.error("Error loading priority settings:", error);
    }
  };

  useEffect(() => {
    if (lastAddedContact) {
      setFormData(prev => ({
        ...prev,
        contact_email: lastAddedContact.email
      }));
      setLastAddedContact(null);
    }
  }, [lastAddedContact]);

  useEffect(() => {
    if (formData.priority && prioritySettings && prioritySettings.length > 0) {
      const prioritySetting = prioritySettings.find(p => p.name === formData.priority);
      if (prioritySetting && typeof prioritySetting.days_offset === 'number') {
        try {
          const today = new Date();

          if (isNaN(today.getTime())) {
            console.error("Invalid date created for 'today'");
            return;
          }

          const dueDate = new Date(today);
          dueDate.setDate(today.getDate() + prioritySetting.days_offset);

          if (isNaN(dueDate.getTime())) {
            console.error("Invalid due date calculated");
            return;
          }

          const dueDateString = dueDate.toISOString().split('T')[0];

          const firstAttemptDays = typeof prioritySetting.first_attempt_days === 'number' ? prioritySetting.first_attempt_days : 0;
          const firstAttemptDate = new Date(today);
          firstAttemptDate.setDate(today.getDate() + firstAttemptDays);

          if (isNaN(firstAttemptDate.getTime())) {
            console.error("Invalid first attempt date calculated");
            return;
          }

          const firstAttemptDateString = firstAttemptDate.toISOString().split('T')[0];

          setFormData(prev => ({
            ...prev,
            due_date: dueDateString,
            first_attempt_due_date: firstAttemptDateString
          }));
        } catch (error) {
          console.error("Error calculating dates:", error);
        }
      }
    }
  }, [formData.priority, prioritySettings]);

  useEffect(() => {
    const assignedServerId = formData.assigned_server_id;
    const priority = formData.priority;

    let server = null;
    if (formData.server_type === 'employee') {
      server = employees.find(e => String(e.id) === assignedServerId);
    } else if (formData.server_type === 'contractor') {
      if (selectedContractor && String(selectedContractor.id) === assignedServerId) {
        server = selectedContractor;
      }
    }

    if (server && server.server_pay_enabled && server.default_pay_items?.length > 0) {
      const priorityKeyword = priority;
      let defaultPayItem = server.default_pay_items.find(item =>
        item.description.toLowerCase().includes(priorityKeyword)
      );

      if (!defaultPayItem) {
        defaultPayItem = server.default_pay_items[0];
      }

      if (defaultPayItem) {
          const newPayItem = {
            description: defaultPayItem.description,
            quantity: 1,
            rate: defaultPayItem.rate,
            total: defaultPayItem.rate,
          };
          handleInputChange('server_pay_items', [newPayItem]);
      } else {
          handleInputChange('server_pay_items', []);
      }
    } else {
      handleInputChange('server_pay_items', []);
    }
  }, [formData.assigned_server_id, formData.priority, formData.server_type, employees, selectedContractor]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCourtAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      court_address: {
        ...prev.court_address,
        [field]: value
      }
    }));
  };

  const handleCourtAddressSelect = (addressDetails) => {
    setFormData(prev => ({
      ...prev,
      court_address: {
        ...prev.court_address,
        address1: addressDetails.address1 || '',
        city: addressDetails.city || '',
        state: addressDetails.state || '',
        postal_code: addressDetails.postal_code || ''
      },
      court_county: addressDetails.county || prev.court_county
    }));
  };

  const handleCaseSelect = async (courtCase) => {
    setSelectedCase(courtCase);
    setIsEditingCase(false); // Lock fields on select
    
    // Populate case information fields
    setFormData(prev => ({
      ...prev,
      case_number: courtCase.case_number || '',
      plaintiff: courtCase.plaintiff || '',
      defendant: courtCase.defendant || '',
      court_name: courtCase.court_name || '',
      court_county: courtCase.court_county || '',
      court_address: courtCase.court_address ? JSON.parse(courtCase.court_address) : {}
    }));

    // If court information exists, set up the court selection
    if (courtCase.court_name) {
      // Create a court object for display
      const courtObj = {
        branch_name: courtCase.court_name,
        county: courtCase.court_county,
        address: courtCase.court_address ? JSON.parse(courtCase.court_address) : {}
      };
      setSelectedCourtFromAutocomplete(courtObj);
      
      if (courtObj.address?.address1) {
        setShowCourtDetails(true);
      }
    }

    // Fetch the number of associated jobs (both open and closed)
    try {
      const jobs = await Job.filter({ court_case_id: courtCase.id });
      setAssociatedJobsCount(jobs.length); // Don't subtract 1 - show actual count of existing jobs
    } catch(err) {
      console.error("Error fetching associated jobs count:", err);
      setAssociatedJobsCount(0);
    }
  };

  const handleCourtSelect = (court) => {
    setFormData(prev => ({
      ...prev,
      court_name: court.branch_name,
      court_county: court.county,
      court_address: court.address || {}
    }));

    // If it's a new court being created
    if (court.isNew) {
      // Enable edit mode and show court details section
      setIsEditingExistingCourt(true);
      setShowCourtDetails(true);
      // Don't set selectedCourtFromAutocomplete so the name field stays editable
      setSelectedCourtFromAutocomplete(null);
    } else {
      // Existing court selected - lock it in read-only mode
      setSelectedCourtFromAutocomplete(court);
      setIsEditingExistingCourt(false);
      // Show court details if address exists
      if (court.address?.address1) {
        setShowCourtDetails(true);
      }
    }
  };

  const handleClearCourtSelection = () => {
    setFormData(prev => ({
        ...prev,
        court_name: '',
        court_county: '',
        court_address: {}
    }));
    setSelectedCourtFromAutocomplete(null);
    setIsEditingExistingCourt(false);
    setShowCourtDetails(false);
  };

  const handleClearCaseSelection = () => {
    setSelectedCase(null);
    setIsEditingCase(false);
    handleClearCourtSelection(); // Also clear court if case is cleared
    setFormData(prev => ({
      ...prev,
      case_number: "",
      plaintiff: "",
      defendant: ""
    }));
  };

  const calculateTotalFee = () => {
    return (formData.service_fee || 0) + (formData.rush_fee || 0) + (formData.mileage_fee || 0);
  };

  const generateJobNumber = async () => {
    try {
      const existingJobs = await Job.list();
      return `JOB-${(existingJobs.length + 1).toString().padStart(6, '0')}`;
    } catch (error) {
      return `JOB-${Date.now()}`;
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      const existingInvoices = await Invoice.list();
      const invoiceCount = existingInvoices.length;
      const currentYear = new Date().getFullYear();
      return `INV-${currentYear}-${(invoiceCount + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      console.error("Error generating invoice number:", error);
      return `INV-${Date.now()}`;
    }
  };

  const handleClientSelected = (client) => {
    const primaryContact = client.contacts?.find(c => c.primary) || client.contacts?.[0];

    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      contact_id: primaryContact?.id || "",
      contact_email: primaryContact?.email || ""
    }));
    setSelectedClient(client);
    setClientContacts(client.contacts || []);
    setShowNewClientForm(false);
    setClientSearchText(client.company_name);
  };

  const handleNewClientCreated = (newClient) => {
    const primaryContact = newClient.contacts?.find(c => c.primary) || newClient.contacts?.[0];

    setFormData(prev => ({
      ...prev,
      client_id: newClient.id,
      contact_id: primaryContact?.id || "",
      contact_email: primaryContact?.email || ""
    }));
    setClientContacts(newClient.contacts || []);
    setSelectedClient(newClient);
    setShowNewClientForm(false);
    setClientSearchText(newClient.company_name);
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setClientContacts([]);
    setClientSearchText("");
    setFormData(prev => ({
      ...prev,
      client_id: "",
      contact_id: "",
      contact_email: ""
    }));
  };

  // Check if marketplace is available based on requirements
  const isMarketplaceAvailable = () => {
    // Check if at least one document is uploaded
    const hasDocuments = uploadedDocuments && uploadedDocuments.length > 0;

    // Check if primary address is valid
    const primaryAddress = formData.addresses?.find(a => a.primary) || formData.addresses?.[0];
    const hasValidAddress = primaryAddress &&
      primaryAddress.address1 &&
      primaryAddress.city &&
      primaryAddress.state &&
      primaryAddress.postal_code;

    return hasDocuments && hasValidAddress;
  };

  // Get specific reason why marketplace is disabled
  const getMarketplaceDisabledReason = () => {
    const hasDocuments = uploadedDocuments && uploadedDocuments.length > 0;
    const primaryAddress = formData.addresses?.find(a => a.primary) || formData.addresses?.[0];
    const hasValidAddress = primaryAddress &&
      primaryAddress.address1 &&
      primaryAddress.city &&
      primaryAddress.state &&
      primaryAddress.postal_code;

    if (!hasDocuments && !hasValidAddress) {
      return "Upload service documents and complete the service address to enable marketplace";
    } else if (!hasDocuments) {
      return "Upload at least one service document to enable marketplace";
    } else if (!hasValidAddress) {
      return "Complete the service address (street, city, state, ZIP) to enable marketplace";
    }
    return "";
  };

  const handleNewContactCreated = (newContact) => {
    setClientContacts(prevContacts => [...prevContacts, newContact]);

    setSelectedClient(prevClient => ({
      ...prevClient,
      contacts: [...(prevClient?.contacts || []), newContact],
    }));

    // Auto-select the newly created contact
    setFormData(prev => ({
      ...prev,
      contact_id: newContact.id,
      contact_email: newContact.email || ""
    }));

    setLastAddedContact(newContact);
  };

  const handleContractorSelected = (contractor) => {
    setSelectedContractor(contractor);
    if (contractor) {
        setContractorSearchText(contractor.company_name);
        handleInputChange('assigned_server_id', contractor.id);
    } else {
        setContractorSearchText("");
        handleInputChange('assigned_server_id', 'unassigned');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      alert("Please select a client before creating a job.");
      setIsSubmitting(false);
      return;
    }

    // Validate marketplace requirements
    if (formData.server_type === 'marketplace' && !isMarketplaceAvailable()) {
      alert("Cannot post to marketplace: Please upload service documents and complete the service address.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const jobNumber = await generateJobNumber();
      const currentUser = await User.me();

      // Fetch current user's company ID for job sharing
      let myCompanyClientId = null;
      try {
        if (currentUser && currentUser.email) {
          const myCompanyClients = await Client.filter({ job_sharing_email: currentUser.email });
          if (myCompanyClients.length > 0) {
            myCompanyClientId = myCompanyClients[0].id;
          }
        }
      } catch (error) {
        console.error("Error fetching current user's company:", error);
      }

      // Determine if assigned server is a collaborating contractor
      let isCollaboratingContractor = false;
      if (formData.server_type === 'contractor' && selectedContractor) {
        isCollaboratingContractor = selectedContractor.company_type === 'process_server' &&
                                   selectedContractor.job_sharing_opt_in === true;
      }

      // ============================================================================
      // CRITICAL ORDER: Court → Case → Job
      // ============================================================================
      // When creating a new job, we MUST follow this order:
      // 1. FIRST: Create/get Court (saves to courts collection with created_by)
      // 2. SECOND: Create/get Case WITH court_id (saves to court_cases with created_by)
      // 3. THIRD: Create Job WITH case_id (saves to jobs collection)
      //
      // This ensures proper relationships: Job → Case → Court
      // ============================================================================

      let courtId = null;
      let courtCaseId = null;

      // STEP 1: Handle Court (Create new or use existing)
      if (formData.court_name && isEditingExistingCourt) {
        const existingCourts = await SecureCourtAccess.filter({ branch_name: formData.court_name });
        if (existingCourts.length > 0) {
          courtId = existingCourts[0].id;
          await Court.update(existingCourts[0].id, {
            county: formData.court_county,
            address: formData.court_address
          });
        }
      } else if (formData.court_name && !selectedCourtFromAutocomplete) {
        // Handle creation of a brand new court not previously in DB
        const existingCourts = await SecureCourtAccess.filter({ branch_name: formData.court_name });
        if (existingCourts.length === 0) {
          const newCourt = await SecureCourtAccess.create({
            branch_name: formData.court_name,
            county: formData.court_county || "Unknown County",
            address: formData.court_address
          });
          courtId = newCourt.id;
        } else {
          courtId = existingCourts[0].id;
        }
      } else if (selectedCourtFromAutocomplete) {
        courtId = selectedCourtFromAutocomplete.id;
      }

      // STEP 2: Handle CourtCase (Create new or use existing)
      // IMPORTANT: Case MUST have court_id set before being created
      if (selectedCase && isEditingCase) {
        // User EDITED an existing case
        const caseUpdateData = {
          case_name: `${formData.plaintiff} vs ${formData.defendant}`,
          case_number: formData.case_number,
          plaintiff: formData.plaintiff,
          defendant: formData.defendant,
          court_id: courtId, // Link to court
          court_name: formData.court_name,
          court_county: formData.court_county,
          court_address: JSON.stringify(formData.court_address)
        };
        await CourtCase.update(selectedCase.id, caseUpdateData);
        courtCaseId = selectedCase.id;
      } else if (selectedCase) {
        // User SELECTED an existing case, no edits
        courtCaseId = selectedCase.id;
      } else {
        // User is CREATING a new case from scratch
        const caseName = `${formData.plaintiff} vs ${formData.defendant}`;
        const newCourtCase = await SecureCaseAccess.create({
          case_name: caseName,
          case_number: formData.case_number,
          plaintiff: formData.plaintiff,
          defendant: formData.defendant,
          court_id: courtId, // CRITICAL: Link case to court
          court_name: formData.court_name,
          court_county: formData.court_county,
          court_address: JSON.stringify(formData.court_address)
        });
        courtCaseId = newCourtCase.id;
      }

      // STEP 3: Create Job with case_id (handled below in newJobData)

      // Fix for Assigned Server Display: Ensure assigned_server_id is always a string ('unassigned' or actual ID)
      const serverIdForSubmission = (formData.assigned_server_id === "unassigned" || !formData.assigned_server_id) ? "unassigned" : String(formData.assigned_server_id);

      const totalServerPay = formData.server_pay_items.reduce((sum, item) => sum + (item.total || 0), 0);

      const initialLogEntry = {
        timestamp: new Date().toISOString(),
        user_name: currentUser?.full_name || "System",
        event_type: "job_created",
        description: `Job created by ${currentUser?.full_name || "System"}.`
      };

      const newJobData = {
        job_number: jobNumber,
        client_job_number: formData.client_job_number,
        client_id: formData.client_id,
        contact_id: formData.contact_id,
        contact_email: formData.contact_email,
        court_case_id: courtCaseId,
        recipient: {
          name: formData.recipient_name,
          type: formData.recipient_type
        },
        addresses: formData.addresses,
        service_instructions: formData.service_instructions,
        first_attempt_instructions: formData.first_attempt_instructions,
        first_attempt_due_date: formData.first_attempt_due_date,
        server_type: formData.server_type,
        assigned_server_id: serverIdForSubmission,
        priority: formData.priority,
        due_date: formData.due_date,
        service_fee: formData.service_fee,
        rush_fee: formData.rush_fee,
        mileage_fee: formData.mileage_fee,
        total_fee: calculateTotalFee(),
        server_pay_items: formData.server_pay_items,
        total_server_pay: totalServerPay,
        // Adjust status logic to use the new string value for assigned_server_id
        status: serverIdForSubmission !== "unassigned" ? "assigned" : "pending",
        is_closed: false,
        activity_log: [initialLogEntry]
      };

      // Add shared job fields if it's a collaborating contractor
      if (isCollaboratingContractor && myCompanyClientId) {
        newJobData.shared_from_client_id = myCompanyClientId;
        newJobData.shared_job_status = 'pending_acceptance';
      } else {
        newJobData.shared_from_client_id = null;
        newJobData.shared_job_status = null;
      }

      const newJob = await SecureJobAccess.create(newJobData);

      // Create ServerPayRecord if there's server pay
      if (totalServerPay > 0 && serverIdForSubmission !== "unassigned") {
        let serverName = "";
        if (formData.server_type === 'employee') {
          const server = employees.find(e => String(e.id) === serverIdForSubmission);
          serverName = server ? `${server.first_name} ${server.last_name}` : "Unknown Employee";
        } else if (formData.server_type === 'contractor' && selectedContractor) {
          serverName = selectedContractor.company_name || "Unknown Contractor";
        }

        await ServerPayRecord.create({
          job_id: newJob.id,
          server_id: serverIdForSubmission,
          server_type: formData.server_type,
          server_name: serverName,
          job_number: jobNumber,
          client_id: formData.client_id,
          pay_items: formData.server_pay_items,
          total_amount: totalServerPay,
          payment_status: "unpaid",
          due_date: formData.due_date
        });
      }

      // Automatically create invoice for the job
      try {
        const invoiceNumber = await generateInvoiceNumber();
        const invoiceDate = new Date();
        const invoiceDueDate = new Date(invoiceDate);
        invoiceDueDate.setDate(invoiceDate.getDate() + 30); // 30 days payment terms

        // Build line items from job fees
        const lineItems = [];
        
        if (formData.service_fee > 0) {
          lineItems.push({
            description: `Process Service - ${formData.recipient_name}`,
            quantity: 1,
            rate: formData.service_fee,
            amount: formData.service_fee
          });
        }
        
        if (formData.rush_fee > 0) {
          lineItems.push({
            description: "Rush Service Fee",
            quantity: 1,
            rate: formData.rush_fee,
            amount: formData.rush_fee
          });
        }
        
        if (formData.mileage_fee > 0) {
          lineItems.push({
            description: "Mileage Fee",
            quantity: 1,
            rate: formData.mileage_fee,
            amount: formData.mileage_fee
          });
        }

        // Check for printing fees from settings
        try {
          const invoiceSettings = await CompanySettings.filter({ setting_key: "invoice_settings" });
          if (invoiceSettings.length > 0 && invoiceSettings[0].setting_value?.enabled && uploadedDocuments.length > 0) {
            const totalPages = uploadedDocuments.reduce((sum, doc) => sum + (doc.page_count || 1), 0);
            const printingFeePerPage = invoiceSettings[0].setting_value?.fee_per_page || 0.10;
            const totalPrintingFee = totalPages * printingFeePerPage;
            
            if (totalPrintingFee > 0) {
              lineItems.push({
                description: `Document Printing (${totalPages} pages @ $${printingFeePerPage.toFixed(2)}/page)`,
                quantity: totalPages,
                rate: printingFeePerPage,
                amount: totalPrintingFee
              });
            }
          }
        } catch (error) {
          console.error("Error calculating printing fees:", error);
        }

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxRate = 0; // You can modify this to apply tax if needed
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;

        const newInvoice = await Invoice.create({
          invoice_number: invoiceNumber,
          client_id: formData.client_id,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          due_date: invoiceDueDate.toISOString().split('T')[0],
          job_ids: [newJob.id],
          line_items: lineItems,
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: "draft",
          notes: `Auto-generated invoice for job ${jobNumber}`
        });

        console.log("Invoice auto-generated:", invoiceNumber);
        
        // Update the job to reference the invoice
        await Job.update(newJob.id, {
          invoiced: true,
          invoice_id: newInvoice.id
        });

      } catch (error) {
        console.error("Failed to auto-generate invoice:", error);
        // Don't block job creation if invoice generation fails
      }

      if (uploadedDocuments.length > 0) {
        const documentsToCreate = uploadedDocuments.map(doc => ({
          job_id: newJob.id,
          title: doc.title,
          affidavit_text: doc.affidavit_text,
          file_url: doc.file_url,
          document_category: doc.document_category,
          page_count: doc.page_count,
          received_at: new Date().toISOString()
        }));
        await Document.bulkCreate(documentsToCreate);
      }

      // Auto-generate field sheet after job creation
      try {
        await generateFieldSheet({ job_id: newJob.id });
        console.log("Field sheet auto-generated for job:", newJob.job_number);
      } catch (error) {
        console.error("Failed to auto-generate field sheet:", error);
        // Don't block job creation if field sheet generation fails
      }

      // Show success toast
      toast({
        variant: "success",
        title: "Job created successfully",
        description: `Job ${newJob.job_number} has been created`,
      });

      // Refresh data to show the new job in the list
      await refreshData();

      navigate(createPageUrl("Jobs"));
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please check the console for details.");
    }

    setIsSubmitting(false);
  };

  const isFormValid = formData.client_id;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-screen mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl("Jobs")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Job</h1>
              <p className="text-slate-600">Enter job details for process serving</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Service Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentUpload
                  documents={uploadedDocuments}
                  onDocumentsChange={setUploadedDocuments}
                />
              </CardContent>
            </Card>

            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {!showNewClientForm && !selectedClient && (
                    <div>
                      <Label>Client</Label>
                      <ClientSearchInput
                        value={clientSearchText}
                        onValueChange={setClientSearchText}
                        onClientSelected={handleClientSelected}
                        onShowNewClient={() => setShowNewClientForm(true)}
                        selectedClient={selectedClient}
                      />
                    </div>
                  )}

                  {selectedClient && !showNewClientForm && (
                    <SelectedClientBox
                      client={selectedClient}
                      contacts={clientContacts}
                      selectedContactId={formData.contact_id}
                      onContactChange={(contactId) => {
                        const selectedContact = clientContacts.find(c => c.id === contactId);
                        if (selectedContact) {
                          setFormData(prev => ({
                            ...prev,
                            contact_id: selectedContact.id,
                            contact_email: selectedContact.email
                          }));
                        }
                      }}
                      onRemoveClient={handleRemoveClient}
                      onAddContact={() => setShowNewContactDialog(true)}
                    />
                  )}

                  <div>
                    <Label htmlFor="client_job_number">Client Reference Number</Label>
                    <Input
                      id="client_job_number"
                      value={formData.client_job_number}
                      onChange={(e) => handleInputChange('client_job_number', e.target.value)}
                      placeholder="Client's internal job/ref #"
                    />
                  </div>
                </div>

                {showNewClientForm && (
                  <NewClientQuickForm
                    onClientCreated={handleNewClientCreated}
                    onCancel={() => {
                      setShowNewClientForm(false);
                      setClientSearchText("");
                    }}
                    initialCompanyName={clientSearchText}
                  />
                )}
              </CardContent>
            </Card>

            {/* Case Information */}
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCase && !isEditingCase ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">{selectedCase.case_number}</h4>
                        <p className="text-sm text-slate-600">{selectedCase.case_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setShowCaseEditWarning(true)}
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Case
                        </Button>
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:bg-slate-200"
                          onClick={handleClearCaseSelection}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="case_number">Case Number</Label>
                      <CaseNumberAutocomplete
                        id="case_number"
                        value={formData.case_number}
                        onChange={(value) => handleInputChange('case_number', value)}
                        onCaseSelect={handleCaseSelect}
                        placeholder="Enter case number or search existing cases..."
                        required
                        disabled={selectedCase && !isEditingCase}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-center py-2">
                  <div className="text-lg font-semibold text-slate-600 bg-slate-100 px-4 py-1 rounded-full">
                    vs
                  </div>
                </div>

                <div>
                  <Label htmlFor="plaintiff">Plaintiff</Label>
                  <Textarea
                    id="plaintiff"
                    value={formData.plaintiff}
                    onChange={(e) => handleInputChange('plaintiff', e.target.value)}
                    rows={2}
                    placeholder="Enter plaintiff name(s)"
                    required
                    className="resize-none"
                    disabled={selectedCase && !isEditingCase}
                  />
                </div>

                <div>
                  <Label htmlFor="defendant">Defendant</Label>
                  <Textarea
                    id="defendant"
                    value={formData.defendant}
                    onChange={(e) => handleInputChange('defendant', e.target.value)}
                    rows={2}
                    placeholder="Enter defendant name(s)"
                    required
                    className="resize-none"
                    disabled={selectedCase && !isEditingCase}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Court Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Landmark className="w-5 h-5" />
                    Court Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCourtFromAutocomplete ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">{selectedCourtFromAutocomplete.branch_name}</h4>
                        <p className="text-sm text-slate-600">{selectedCourtFromAutocomplete.county}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setShowCourtEditWarning(true)}
                          disabled={selectedCase && !isEditingCase}
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:bg-slate-200"
                          onClick={handleClearCourtSelection}
                          disabled={selectedCase && !isEditingCase}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {selectedCourtFromAutocomplete.address?.address1 && (
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>{selectedCourtFromAutocomplete.address.address1}</p>
                        {selectedCourtFromAutocomplete.address.address2 && (
                          <p>{selectedCourtFromAutocomplete.address.address2}</p>
                        )}
                        <p>
                          {selectedCourtFromAutocomplete.address.city}, {selectedCourtFromAutocomplete.address.state} {selectedCourtFromAutocomplete.address.postal_code}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="court_name">Court Name</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-grow">
                          <CourtAutocomplete
                            id="court_name"
                            value={formData.court_name}
                            onChange={(value) => handleInputChange('court_name', value)}
                            onCourtSelect={handleCourtSelect}
                            selectedCourt={selectedCourtFromAutocomplete}
                            onClearSelection={handleClearCourtSelection}
                            placeholder="e.g., 12th Judicial Circuit Court"
                            disabled={(selectedCourtFromAutocomplete && !selectedCourtFromAutocomplete.isNew) || (selectedCase && !isEditingCase)}
                          />
                        </div>
                        {isEditingExistingCourt && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-500 hover:bg-slate-200 flex-shrink-0"
                            onClick={handleClearCourtSelection}
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        {selectedCourtFromAutocomplete && !selectedCourtFromAutocomplete.isNew && !isEditingExistingCourt && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 flex-shrink-0"
                            onClick={async () => {
                              // Count cases linked to this court
                              try {
                                const cases = await CourtCase.filter({ court_id: selectedCourtFromAutocomplete.id });
                                setAssociatedJobsCount(cases.length);
                                setShowCourtEditWarning(true);
                              } catch (error) {
                                console.error('Error counting linked cases:', error);
                                // Proceed with edit even if count fails
                                setAssociatedJobsCount(0);
                                setShowCourtEditWarning(true);
                              }
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                            Edit Court
                          </Button>
                        )}
                      </div>
                    </div>

                    {formData.court_name && (
                      <div className="flex justify-start">
                          <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-700"
                              onClick={() => setShowCourtDetails(!showCourtDetails)}
                              disabled={selectedCase && !isEditingCase}
                          >
                              <Plus className="w-4 h-4" />
                              {showCourtDetails ? 'Hide Additional Court Information' : 'Add Additional Court Information'}
                          </Button>
                      </div>
                    )}

                    <div className={!showCourtDetails ? "hidden" : "block"}>
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="court_address1">Street Address</Label>
                                    <AddressAutocomplete
                                        id="court_address1"
                                        value={formData.court_address?.address1 || ''}
                                        onChange={(value) => handleCourtAddressChange('address1', value)}
                                        onAddressSelect={handleCourtAddressSelect}
                                        onLoadingChange={setIsCourtAddressLoading}
                                        placeholder="Start typing court address..."
                                        disabled={selectedCase && !isEditingCase}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="court_address2">Suite / Courtroom</Label>
                                    <Input
                                        id="court_address2"
                                        value={formData.court_address?.address2 || ''}
                                        onChange={(e) => handleCourtAddressChange('address2', e.target.value)}
                                        placeholder="Suite, courtroom, etc."
                                        disabled={isCourtAddressLoading || (selectedCase && !isEditingCase)}
                                        autoComplete="nope"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="relative">
                                <Label htmlFor="court_city">City</Label>
                                <Input
                                  id="court_city"
                                  value={formData.court_address?.city || ''}
                                  onChange={(e) => handleCourtAddressChange('city', e.target.value)}
                                  disabled={isCourtAddressLoading || (selectedCase && !isEditingCase)}
                                  autoComplete="nope"
                                />
                                {isCourtAddressLoading && <Loader2 className="absolute right-3 top-[34px] w-4 h-4 animate-spin text-slate-400" />}
                              </div>
                              <div className="relative">
                                <Label htmlFor="court_state">State</Label>
                                <Input
                                  id="court_state"
                                  value={formData.court_address?.state || ''}
                                  onChange={(e) => handleCourtAddressChange('state', e.target.value)}
                                  disabled={isCourtAddressLoading || (selectedCase && !isEditingCase)}
                                  autoComplete="nope"
                                />
                                {isCourtAddressLoading && <Loader2 className="absolute right-3 top-[34px] w-4 h-4 animate-spin text-slate-400" />}
                              </div>
                              <div className="relative">
                                <Label htmlFor="court_zip">ZIP Code</Label>
                                <Input
                                  id="court_zip"
                                  value={formData.court_address?.postal_code || ''}
                                  onChange={(e) => handleCourtAddressChange('postal_code', e.target.value)}
                                  disabled={isCourtAddressLoading || (selectedCase && !isEditingCase)}
                                  autoComplete="nope"
                                />
                                {isCourtAddressLoading && <Loader2 className="absolute right-3 top-[34px] w-4 h-4 animate-spin text-slate-400" />}
                              </div>
                            </div>
                            <div>
                                <Label htmlFor="court_county">County</Label>
                                <Input
                                    id="court_county"
                                    value={formData.court_county}
                                    onChange={(e) => handleInputChange('court_county', e.target.value)}
                                    placeholder="e.g., Cook County"
                                    autoComplete="nope"
                                    disabled={selectedCase && !isEditingCase}
                                />
                            </div>
                        </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Recipient & Service Address */}
            <Card>
              <CardHeader>
                <CardTitle>Recipient & Service Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="recipient_name">Recipient Name</Label>
                    <Input
                      id="recipient_name"
                      value={formData.recipient_name}
                      onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                      placeholder="Name of person/entity to be served"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipient_type">Recipient Type</Label>
                    <select
                      id="recipient_type"
                      value={formData.recipient_type}
                      onChange={(e) => handleInputChange('recipient_type', e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                      <option value="government">Government</option>
                    </select>
                  </div>
                </div>

                <AddressListManager
                  addresses={formData.addresses}
                  onChange={(addresses) => {
                    console.log('[CreateJob] Updating addresses:', addresses);
                    setFormData(prev => {
                      const updated = { ...prev, addresses };
                      console.log('[CreateJob] Updated formData:', updated);
                      return updated;
                    });
                  }}
                  isAddressLoading={isAddressLoading}
                  setIsAddressLoading={setIsAddressLoading}
                />
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prioritySettings.map(priority => (
                        <option key={priority.name} value={priority.name}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="first_attempt_due_date">First Attempt Due</Label>
                    <Input
                      id="first_attempt_due_date"
                      type="date"
                      value={formData.first_attempt_due_date}
                      onChange={(e) => handleInputChange('first_attempt_due_date', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="service_instructions">Service Instructions</Label>
                  <Textarea
                    id="service_instructions"
                    value={formData.service_instructions}
                    onChange={(e) => handleInputChange('service_instructions', e.target.value)}
                    rows={4}
                    placeholder="Special instructions for the process server..."
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Server Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Server</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Server Type</Label>
                  <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-100 p-1 mt-1">
                      <Button
                          type="button"
                          onClick={() => {
                              handleInputChange('server_type', 'employee');
                              setSelectedContractor(null);
                              setContractorSearchText("");
                              const defaultServer = employees.find(e => e.is_default_server === true);
                              if (defaultServer) {
                                  handleInputChange('assigned_server_id', String(defaultServer.id));
                              } else {
                                  handleInputChange('assigned_server_id', 'unassigned');
                              }
                          }}
                          className={`gap-2 justify-center transition-colors ${
                              formData.server_type === 'employee'
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
                          onClick={() => {
                              handleInputChange('server_type', 'contractor');
                              handleInputChange('assigned_server_id', 'unassigned');
                              setSelectedContractor(null);
                              setContractorSearchText("");
                          }}
                          className={`gap-2 justify-center transition-colors ${
                              formData.server_type === 'contractor'
                                  ? 'bg-white text-slate-900 shadow-sm hover:bg-white'
                                  : 'bg-transparent text-slate-600 hover:bg-slate-200'
                          }`}
                          variant="ghost"
                      >
                          <HardHat className="w-4 h-4" />
                          Contractor
                      </Button>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-block w-full"
                            style={!isMarketplaceAvailable() ? { cursor: 'not-allowed' } : undefined}
                          >
                            <Button
                                type="button"
                                onClick={() => {
                                    handleInputChange('server_type', 'marketplace');
                                    handleInputChange('assigned_server_id', 'marketplace');
                                    setSelectedContractor(null);
                                    setContractorSearchText("");
                                }}
                                disabled={!isMarketplaceAvailable()}
                                className={`w-full gap-2 justify-center transition-colors ${
                                    formData.server_type === 'marketplace'
                                        ? 'bg-white text-slate-900 shadow-sm hover:bg-white'
                                        : 'bg-transparent text-slate-600 hover:bg-slate-200'
                                }`}
                                variant="ghost"
                            >
                                <Store className="w-4 h-4" />
                                Marketplace
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {!isMarketplaceAvailable() ? (
                            <p>{getMarketplaceDisabledReason()}</p>
                          ) : (
                            <p>Post this job to the marketplace for other companies to bid on</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                  </div>
                </div>

                {formData.server_type !== 'marketplace' && (
                  <div>
                    <Label htmlFor="assigned_server_id">
                      Assign To {formData.server_type === 'employee' ? 'Employee' : 'Contractor'}
                    </Label>
                    {formData.server_type === 'employee' ? (
                      <select
                        id="assigned_server_id"
                        value={String(formData.assigned_server_id || 'unassigned')}
                        onChange={(e) => handleInputChange('assigned_server_id', e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="unassigned">Unassigned</option>
                        {employees.map(employee => (
                          <option key={employee.id} value={String(employee.id)}>
                            {employee.first_name} {employee.last_name} {employee.is_default_server ? '★' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <ContractorSearchInput
                        value={contractorSearchText}
                        onValueChange={setContractorSearchText}
                        onContractorSelected={handleContractorSelected}
                        selectedContractor={selectedContractor}
                        currentClientId={formData.client_id}
                      />
                    )}
                  </div>
                )}

                {formData.server_type === 'marketplace' && (
                  <div className={`transition-all duration-300 ease-in-out rounded-lg border p-4 space-y-3 ${isMarketplaceAvailable() ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                      {!isMarketplaceAvailable() ? (
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">Requirements Not Met</h4>
                            <p className="text-sm text-slate-600 mb-2">
                              To post to the marketplace, you must complete:
                            </p>
                            <ul className="text-sm text-slate-700 space-y-1.5 ml-4 list-disc">
                              {(!uploadedDocuments || uploadedDocuments.length === 0) && (
                                <li>Upload at least one service document</li>
                              )}
                              {(() => {
                                const primaryAddress = formData.addresses?.find(a => a.primary) || formData.addresses?.[0];
                                const hasValidAddress = primaryAddress &&
                                  primaryAddress.address1 &&
                                  primaryAddress.city &&
                                  primaryAddress.state &&
                                  primaryAddress.postal_code;
                                return !hasValidAddress ? <li>Complete the service address (street, city, state, ZIP)</li> : null;
                              })()}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <Store className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">Post to Marketplace</h4>
                            <p className="text-sm text-slate-600 mb-2">
                              Your job will be visible to all ServeMax companies. Other companies can place anonymous bids,
                              and you can select the best offer.
                            </p>
                            <div className="text-xs text-slate-500 space-y-1">
                              <p>• Street address will NOT be shown (only city, state, ZIP)</p>
                              <p>• You'll see which company places each bid</p>
                              <p>• You'll be notified when bids are placed</p>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {formData.server_type !== 'marketplace' && (
                  <div className="transition-all duration-300 ease-in-out">
                    <ServerPayItems
                      items={formData.server_pay_items}
                      onItemsChange={(newItems) => handleInputChange('server_pay_items', newItems)}
                      defaultItems={
                        formData.server_type === 'employee'
                          ? employees.find(e => String(e.id) === formData.assigned_server_id)?.default_pay_items || []
                          : selectedContractor && String(selectedContractor.id) === formData.assigned_server_id
                            ? selectedContractor.default_pay_items || []
                            : []
                      }
                    />
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Quick Invoice */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <QuickInvoice
                  documents={uploadedDocuments}
                  priority={formData.priority}
                  invoiceSettings={companyData?.invoice_settings}
                  onChange={setInvoiceData}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6">
              <Link to={createPageUrl("Jobs")}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Job...
                  </>
                ) : (
                  'Create Job'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <NewContactDialog
        open={showNewContactDialog}
        onOpenChange={setShowNewContactDialog}
        client={selectedClient}
        onContactCreated={handleNewContactCreated}
      />

      {/* Case Edit Warning Dialog */}
      {showCaseEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Edit Case Information</h3>
                <p className="text-sm text-slate-600 mb-3">
                  You are about to edit a case that is linked to <strong>{associatedJobsCount} other jobs</strong>.
                </p>
                <p className="text-sm text-slate-600">
                  Any changes you make will be reflected on all associated jobs. Are you sure you want to proceed?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCaseEditWarning(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowCaseEditWarning(false);
                  setIsEditingCase(true);
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Yes, Edit Case
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Court Edit Warning Dialog */}
      {showCourtEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Edit Court Information</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Editing this court will also update <strong>{associatedJobsCount} {associatedJobsCount === 1 ? 'case' : 'cases'}</strong> that {associatedJobsCount === 1 ? 'is' : 'are'} linked to this court.
                </p>
                <p className="text-sm text-slate-600">
                  If you need changes only for this case, click <strong>Cancel</strong> and clear the selection
                  to manually enter court details instead.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCourtEditWarning(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowCourtEditWarning(false);
                  setShowCourtDetails(true);
                  setIsEditingExistingCourt(true);
                  setSelectedCourtFromAutocomplete(null);
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Proceed to Edit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
