
import React, { useState, useEffect } from "react";
import { Job, Client, Employee, CourtCase, Document, Court, CompanySettings, User } from "@/api/entities"; // Added User import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, // Retained as per outline
  SelectItem, // Retained as per outline
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertTriangle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ClientSearchInput from "../components/jobs/ClientSearchInput";
import NewClientQuickForm from "../components/jobs/NewClientQuickForm";
import DocumentUpload from "../components/jobs/DocumentUpload";
import NewContactDialog from "../components/jobs/NewContactDialog";
import AddressAutocomplete from "../components/jobs/AddressAutocomplete";
import ServerPayItems from "../components/jobs/ServerPayItems";
import CourtAutocomplete from "../components/jobs/CourtAutocomplete";
import ContractorSearchInput from "../components/jobs/ContractorSearchInput";

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    client_id: "",
    client_job_number: "",
    contact_email: "",
    plaintiff: "",
    defendant: "",
    case_number: "",
    court_name: "",
    court_county: "",
    court_address: {},
    recipient_name: "",
    recipient_type: "individual",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal_code: "",
    latitude: null,
    longitude: null,
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

  const handleAddressSelect = (addressDetails) => {
    setFormData(prev => ({
      ...prev,
      address1: addressDetails.address1 || '',
      city: addressDetails.city || '',
      state: addressDetails.state || '',
      postal_code: addressDetails.postal_code || '',
      latitude: addressDetails.latitude || null,
      longitude: addressDetails.longitude || null
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

  const handleCourtSelect = (court) => {
    setFormData(prev => ({
      ...prev,
      court_name: court.branch_name,
      court_county: court.county,
      court_address: court.address || {}
    }));
    if (court.address?.address1) {
        setShowCourtDetails(true);
    }

    setSelectedCourtFromAutocomplete(court);
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

  const handleClientSelected = (client) => {
    const primaryContact = client.contacts?.find(c => c.primary) || client.contacts?.[0];

    setFormData(prev => ({
      ...prev,
      client_id: client.id,
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
      contact_email: primaryContact?.email || ""
    }));
    setClientContacts(newClient.contacts || []);
    setSelectedClient(newClient);
    setShowNewClientForm(false);
    setClientSearchText(newClient.company_name);
  };

  const handleNewContactCreated = (newContact) => {
    setClientContacts(prevContacts => [...prevContacts, newContact]);

    setSelectedClient(prevClient => ({
      ...prevClient,
      contacts: [...(prevClient?.contacts || []), newContact],
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

      let courtCase;
      if (formData.court_name) {
        const existingCourts = await Court.filter({ branch_name: formData.court_name });
        let court;

        if (existingCourts.length > 0) {
          court = existingCourts[0];
          if (showCourtDetails || selectedCourtFromAutocomplete === null) {
              await Court.update(court.id, {
                  county: formData.court_county,
                  address: formData.court_address
              });
          }
        } else {
          court = await Court.create({
            branch_name: formData.court_name,
            county: formData.court_county || "Unknown County",
            address: formData.court_address
          });
        }

        const caseName = `${formData.plaintiff} vs ${formData.defendant}`;
        courtCase = await CourtCase.create({
          case_name: caseName,
          case_number: formData.case_number,
          plaintiff: formData.plaintiff,
          defendant: formData.defendant,
          court_name: formData.court_name,
          court_county: formData.court_county,
          court_address: JSON.stringify(formData.court_address)
        });
      } else {
        const caseName = `${formData.plaintiff} vs ${formData.defendant}`;
        courtCase = await CourtCase.create({
          case_name: caseName,
          case_number: formData.case_number,
          plaintiff: formData.plaintiff,
          defendant: formData.defendant
        });
      }

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
        contact_email: formData.contact_email,
        court_case_id: courtCase.id,
        recipient: {
          name: formData.recipient_name,
          type: formData.recipient_type
        },
        addresses: [
          {
            label: "Primary",
            address1: formData.address1,
            address2: formData.address2,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            latitude: formData.latitude,
            longitude: formData.longitude,
            primary: true,
          }
        ],
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

      const newJob = await Job.create(newJobData);

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

      navigate(createPageUrl("Jobs"));
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please check the console for details.");
    }

    setIsSubmitting(false);
  };

  const isFormValid = formData.client_id &&
    formData.plaintiff &&
    formData.defendant &&
    formData.recipient_name &&
    formData.address1 &&
    formData.city &&
    formData.state &&
    formData.postal_code;

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

                  {clientContacts.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="contact_email">Job Contact</Label>
                        {selectedClient && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs h-7"
                            onClick={() => setShowNewContactDialog(true)}
                          >
                            <UserPlus className="w-3 h-3" />
                            New
                          </Button>
                        )}
                      </div>
                      <select
                        id="contact_email"
                        value={formData.contact_email}
                        onChange={(e) => handleInputChange('contact_email', e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select a contact</option>
                        {clientContacts.map((contact, index) => (
                          <option key={contact.email || index} value={contact.email}>
                            {contact.first_name} {contact.last_name} {contact.primary && '(Primary)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {clientContacts.length === 0 && formData.client_id && (
                    <div className="text-center bg-slate-50 p-4 rounded-md">
                        <p className="text-sm text-slate-600 mb-2">This client has no contacts yet.</p>
                        <Button
                          type="button"
                          onClick={() => setShowNewContactDialog(true)}
                          className="gap-2"
                        >
                           <UserPlus className="w-4 h-4" /> Add First Contact
                        </Button>
                    </div>
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
                    onCancel={() => setShowNewClientForm(false)}
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
                <div>
                  <Label htmlFor="case_number">Case Number</Label>
                  <Input
                    id="case_number"
                    value={formData.case_number}
                    onChange={(e) => handleInputChange('case_number', e.target.value)}
                    placeholder="Enter court case number"
                    autoComplete="off"
                  />
                </div>

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
                            disabled={isEditingExistingCourt}
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
                      </div>
                    </div>

                    <div className="flex justify-start">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-700"
                            onClick={() => setShowCourtDetails(!showCourtDetails)}
                        >
                            <Plus className="w-4 h-4" />
                            {showCourtDetails ? 'Hide Additional Court Information' : 'Add Additional Court Information'}
                        </Button>
                    </div>

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
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="court_address2">Suite / Courtroom</Label>
                                    <Input
                                        id="court_address2"
                                        value={formData.court_address?.address2 || ''}
                                        onChange={(e) => handleCourtAddressChange('address2', e.target.value)}
                                        placeholder="Suite, courtroom, etc."
                                        disabled={isCourtAddressLoading}
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
                                  disabled={isCourtAddressLoading}
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
                                  disabled={isCourtAddressLoading}
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
                                  disabled={isCourtAddressLoading}
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="address1">Street Address</Label>
                    <AddressAutocomplete
                      id="address1"
                      value={formData.address1}
                      onChange={(value) => handleInputChange('address1', value)}
                      onAddressSelect={handleAddressSelect}
                      onLoadingChange={setIsAddressLoading}
                      placeholder="Start typing an address..."
                      required
                    />
                  </div>
                  <div className="relative">
                    <Label htmlFor="postal_code">ZIP Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      required
                      autoComplete="nope"
                      disabled={isAddressLoading}
                    />
                    {isAddressLoading && <Loader2 className="absolute right-3 top-[34px] w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address2"
                    value={formData.address2}
                    onChange={(e) => handleInputChange('address2', e.target.value)}
                    placeholder="Apartment, suite, etc."
                    autoComplete="nope"
                    disabled={isAddressLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                      autoComplete="nope"
                      disabled={isAddressLoading}
                    />
                    {isAddressLoading && <Loader2 className="absolute right-3 top-[34px] w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                  <div className="relative">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      required
                      autoComplete="nope"
                      disabled={isAddressLoading}
                    />
                    {isAddressLoading && <Loader2 className="absolute right-3 top-[34px] w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                </div>
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
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 mt-1">
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
                  </div>
                </div>

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
                          <div className="flex items-center gap-2">
                            <span>{employee.first_name} {employee.last_name}</span>
                            {employee.is_default_server && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                            )}
                          </div>
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

              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="service_fee">Service Fee ($)</Label>
                    <Input
                      id="service_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.service_fee}
                      onChange={(e) => handleInputChange('service_fee', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rush_fee">Rush Fee ($)</Label>
                    <Input
                      id="rush_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.rush_fee}
                      onChange={(e) => handleInputChange('rush_fee', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mileage_fee">Mileage Fee ($)</Label>
                    <Input
                      id="mileage_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.mileage_fee}
                      onChange={(e) => handleInputChange('mileage_fee', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-900">Total Fee:</span>
                    <span className="text-2xl font-bold text-slate-900">${calculateTotalFee().toFixed(2)}</span>
                  </div>
                </div>
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

      {/* Court Edit Warning Dialog */}
      {showCourtEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Edit Court Information</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Editing this court information will update it for <strong>all jobs</strong> that use this court,
                  not just this case.
                </p>
                <p className="text-sm text-slate-600">
                  If you need changes only for this case, click the <strong>X button</strong> to clear the selection
                  and manually enter court details instead.
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
