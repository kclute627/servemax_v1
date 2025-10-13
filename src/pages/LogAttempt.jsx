
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Job, Employee, Attempt, User, Client, Document, CompanySettings } from '@/api/entities'; // Added Document and CompanySettings imports
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Clock,
  MapPin,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  Plus,
  Pencil
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DocumentUpload from '../components/jobs/DocumentUpload';
import AddressAutocomplete from '../components/jobs/AddressAutocomplete';

// New helper function as per outline
const handleJobStatusOnAttempt = (attemptStatus) => {
  if (attemptStatus === 'served') return 'needs_affidavit';
  return 'in_progress';
};

const initialFormData = {
  job_id: "", // Will be filled by loadJobData
  server_id: "manual", // Default to manual selection
  server_name_manual: "",
  attempt_date: "", // Will be filled by loadJobData
  attempt_time: "", // Will be filled by loadJobData
  address_of_attempt: "", // Will be filled by loadJobData
  notes: "",
  status: "served", // Default status - Successfully Served
  service_type_detail: "", // Will be filled from serviceTypeSettings
  person_served_name: "",
  person_served_description: "",
  relationship_to_recipient: "",
  person_served_age: "",
  person_served_weight: "",
  person_served_height: "",
  person_served_hair_color: "",
  person_served_sex: "",
  gps_lat: null,
  gps_lon: null,
  // uploaded_files removed from formData to be managed by separate uploadedFiles state
};

export default function LogAttemptPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // General Page State
  const [job, setJob] = useState(null);
  const [client, setClient] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // New state for edit mode and uploaded files
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAttemptId, setEditingAttemptId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Service type settings from CompanySettings
  const [serviceTypeSettings, setServiceTypeSettings] = useState({
    successful: [],
    unsuccessful: []
  });

  // Form state managed by formData
  const [formData, setFormData] = useState(initialFormData);

  // New state for address management
  const [selectedAddressType, setSelectedAddressType] = useState(""); // Identifier for existing address, "new", or "custom"
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressData, setNewAddressData] = useState({
    label: "Service Address",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal_code: "",
    county: "",
    latitude: null,
    longitude: null,
    primary: false
  });
  const [newAddressInput, setNewAddressInput] = useState("");
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [showAddressDetails, setShowAddressDetails] = useState(false); // Toggle for showing individual address fields
  const [addressSelected, setAddressSelected] = useState(false); // Track if address has been selected from autocomplete

  // Generic handler for form field changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Effect to fetch current user - only runs once on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("Failed to fetch current user", e);
      }
    };
    fetchUser();
  }, []); // Only run once on mount

  // Effect to fetch service type settings from CompanySettings
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const result = await CompanySettings.filter({ setting_key: 'service_types' });
        if (result && result.length > 0) {
          const settings = result[0].setting_value;
          setServiceTypeSettings({
            successful: settings.successful || [],
            unsuccessful: settings.unsuccessful || []
          });

          // Set default service_type_detail to first successful option if not already set
          if (settings.successful && settings.successful.length > 0) {
            setFormData(prev => ({
              ...prev,
              service_type_detail: prev.service_type_detail || settings.successful[0].label
            }));
          }
        }
      } catch (error) {
        console.error("Error loading service type settings:", error);
      }
    };
    fetchServiceTypes();
  }, []);

  // Main data loading function (replaces loadInitialData)
  const loadJobData = useCallback(async (jobId, attemptId = null) => {
    setIsLoading(true);
    try {
      const [jobData, employeesData] = await Promise.all([
        Job.findById(jobId),
        Employee.list()
      ]);

      if (!jobData) {
        throw new Error("Job not found");
      }

      const clientData = jobData.client_id ? await Client.findById(jobData.client_id) : null;
      
      setJob(jobData);
      setClient(clientData);
      setEmployees(employeesData || []);

      if (attemptId) {
        // Edit mode: load existing attempt data
        try {
          const attemptData = await Attempt.findById(attemptId);
          if (attemptData) {
            const attemptDateTime = new Date(attemptData.attempt_date);
            setFormData({
              job_id: attemptData.job_id,
              server_id: attemptData.server_id ? String(attemptData.server_id) : "manual",
              server_name_manual: attemptData.server_name_manual || "",
              attempt_date: attemptDateTime.toISOString().split('T')[0], // For native date input
              attempt_time: attemptDateTime.toTimeString().slice(0, 5), // For native time input
              address_of_attempt: attemptData.address_of_attempt || "",
              notes: attemptData.notes || "",
              status: attemptData.status || "not_served",
              service_type_detail: attemptData.service_type_detail || "",
              person_served_name: attemptData.person_served_name || "",
              person_served_description: attemptData.person_served_description || "",
              relationship_to_recipient: attemptData.relationship_to_recipient || "",
              person_served_age: attemptData.person_served_age || "",
              person_served_weight: attemptData.person_served_weight || "",
              person_served_height: attemptData.person_served_height || "",
              person_served_hair_color: attemptData.person_served_hair_color || "",
              person_served_sex: attemptData.person_served_sex || "",
              gps_lat: attemptData.gps_lat || null,
              gps_lon: attemptData.gps_lon || null,
            });
            // Filter out files that don't have an ID, or have a jobId that doesn't match the current job.
            // This is a defensive check to ensure only valid, relevant files are loaded.
            const validUploadedFiles = (attemptData.uploaded_files || []).filter(file => file.id && file.job_id === jobData.id);
            setUploadedFiles(validUploadedFiles);

            // Set address selection based on existing address
            let foundExistingAddress = false;
            if (jobData.addresses?.length > 0) {
              const fullAttemptAddress = attemptData.address_of_attempt?.trim();
              const matchedAddress = jobData.addresses.find(addr => 
                fullAttemptAddress === `${addr.address1}, ${addr.city}, ${addr.state} ${addr.postal_code}`.trim()
              );
              if (matchedAddress) {
                setSelectedAddressType(matchedAddress.address1); // Use address1 as the key for the select value
                foundExistingAddress = true;
              }
            }
            if (!foundExistingAddress) {
              // If not an existing address, assume it was a manually entered address for this attempt
              setSelectedAddressType("new"); // Set to new so the form can be shown if user wants to modify
              setNewAddressData(prev => ({ // Populate newAddressData from attempt's address_of_attempt
                ...prev,
                address1: attemptData.address_of_attempt, // Autocomplete doesn't fill this easily, so direct fill
              }));
              setNewAddressInput(attemptData.address_of_attempt); // Show in autocomplete input
            }
          } else {
            throw new Error("Attempt not found");
          }
        } catch (error) {
          console.error("Error loading attempt data:", error);
          setError("Failed to load attempt data: " + error.message);
          alert("Error loading attempt data: " + error.message);
          navigate(`${createPageUrl("JobDetails")}?id=${jobId}`); // Go back to job details if attempt not found
        }
      } else {
        // New attempt: Set default address and current date/time
        const now = new Date();
        let defaultAddress = "";
        let defaultSelectedAddressType = ""; // Default to no selection

        if (jobData.addresses?.length > 0) {
          const primaryAddress = jobData.addresses.find(a => a.primary) || jobData.addresses[0];
          defaultAddress = `${primaryAddress.address1}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.postal_code}`;
          defaultSelectedAddressType = primaryAddress.address1; // Use address1 as the key
        }

        // Determine initial process server based on job's server_type
        let initialServerId = "";
        let initialServerNameManual = "";

        console.log("Job data:", {
          server_type: jobData.server_type,
          assigned_server_id: jobData.assigned_server_id,
          server_name: jobData.server_name
        });
        console.log("Employees:", employeesData);

        if (jobData.server_type === "employee") {
          // Employee server type: Pre-select the assigned employee
          if (jobData.assigned_server_id && jobData.assigned_server_id !== "unassigned") {
            initialServerId = String(jobData.assigned_server_id);
            console.log("Setting initial employee server ID:", initialServerId);
          }
          // else: leave initialServerId as "", dropdown will show first employee or empty
        } else {
          // Contractor or marketplace: Pre-select "manual" and fill in server name
          initialServerId = "manual";
          initialServerNameManual = jobData.server_name || "";
          console.log("Setting manual mode with server name:", initialServerNameManual);
        }

        const newFormData = {
          job_id: jobData.id,
          server_id: initialServerId,
          server_name_manual: initialServerNameManual,
          attempt_date: now.toISOString().split('T')[0],
          attempt_time: now.toTimeString().slice(0, 5),
          address_of_attempt: defaultAddress,
        };
        console.log("Setting form data with server_id:", newFormData.server_id);

        setFormData(prev => ({
          ...prev,
          ...newFormData
        }));
        setSelectedAddressType(defaultSelectedAddressType); // Set selectedAddressType here
        setUploadedFiles([]); // Ensure uploadedFiles is empty for new attempts
      }

    } catch (error) {
      console.error("Error loading data:", error);
      setError("Error loading job data: " + error.message);
      alert("Error loading job data: " + error.message);
      navigate(createPageUrl("Jobs"));
    }
    setIsLoading(false);
  }, [navigate]);

  // Consolidated data loading effect (replaces previous jobId and loadInitialData effects)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobIdFromUrl = params.get('jobId');
    const attemptIdFromUrl = params.get('attemptId');

    if (jobIdFromUrl) {
      // No sessionStorage persistence for jobId as per outline
      setIsEditMode(!!attemptIdFromUrl);
      setEditingAttemptId(attemptIdFromUrl);
      loadJobData(jobIdFromUrl, attemptIdFromUrl);
    } else {
      setError("No Job ID provided");
      setIsLoading(false);
      alert("No job ID found. Returning to the jobs list.");
      navigate(createPageUrl("Jobs"));
    }
  }, [location.search, navigate, loadJobData]);

  // UPDATED: This function now accepts the address data directly to avoid state lag
  const updateAttemptAddress = useCallback((currentAddressData) => {
    if (selectedAddressType === "new" && currentAddressData.address1) {
      const parts = [
        currentAddressData.address1,
        currentAddressData.address2,
        currentAddressData.city,
        currentAddressData.state,
        currentAddressData.postal_code
      ].filter(Boolean);
      
      const fullAddress = parts.join(', ');
      setFormData(prev => ({ ...prev, address_of_attempt: fullAddress }));
    } else {
        // If not a "new" address, or if address1 is empty for a "new" address, clear the preview
        setFormData(prev => ({ ...prev, address_of_attempt: "" }));
    }
  }, [selectedAddressType]); // Dependency on selectedAddressType remains

  // New address handling functions
  const handleAddressSelection = (value) => {
    setSelectedAddressType(value);
    setShowNewAddressForm(value === "new");
    
    if (value === "new") {
      // Reset new address form and its input
      const resetNewAddress = {
        label: "Service Address",
        address1: "",
        address2: "",
        city: "",
        state: "",
        postal_code: "",
        county: "",
        latitude: null,
        longitude: null,
        primary: false
      };
      setNewAddressData(resetNewAddress);
      setNewAddressInput("");
      setShowAddressDetails(false); // Reset to default state
      setAddressSelected(false); // Reset address selection
      updateAttemptAddress(resetNewAddress); // Clear attempt address for new entry
    } else {
      // Existing address selected
      const selectedAddress = job.addresses?.find(addr => addr.address1 === value);
      if (selectedAddress) {
        const fullAddress = `${selectedAddress.address1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`.trim();
        setFormData(prev => ({ ...prev, address_of_attempt: fullAddress }));
      }
    }
  };

  const handleNewAddressSelect = (addressDetails) => {
    setIsAddressLoading(true);
    
    // 1. Update the state for the form fields
    const updatedAddressData = {
      ...newAddressData, // Keep existing label, etc.
      address1: addressDetails.address1 || "",
      address2: addressDetails.address2 || "", // Ensure address2 is also set from autocomplete if available
      city: addressDetails.city || "",
      state: addressDetails.state || "",
      postal_code: addressDetails.postal_code || "",
      county: addressDetails.county || "",
      latitude: addressDetails.latitude || null,
      longitude: addressDetails.longitude || null,
    };
    setNewAddressData(updatedAddressData);
    
    // 2. Update the visual input field for the user
    setNewAddressInput(addressDetails.address1 || "");
    
    // 3. Directly pass the new details to update the preview box
    updateAttemptAddress(updatedAddressData);
    
    setIsAddressLoading(false);
  };

  const handleNewAddressFieldChange = (field, value) => {
    // Construct the updated object before setting state
    const updatedAddress = { ...newAddressData, [field]: value };
    setNewAddressData(updatedAddress);
    // Pass the newly constructed address object directly to the preview function
    updateAttemptAddress(updatedAddress);
  };

  const handleNewAddressLabelChange = (e) => {
    const updatedAddress = { ...newAddressData, label: e.target.value };
    setNewAddressData(updatedAddress);
    // No need to update attemptAddress for label change, as it's not part of the address string.
  };

  // Enhanced GPS capture function
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoading(true); // Show loading state
    
    const options = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 10000, // 10 second timeout
      maximumAge: 60000 // Accept a cached position that's not older than 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setFormData(prev => ({
          ...prev,
          gps_lat: latitude,
          gps_lon: longitude,
        }));
        
        // Show accuracy information to user
        if (accuracy > 100) {
          alert(`Location captured, but accuracy is low (±${Math.round(accuracy)}m). Consider moving to a more open area for better GPS signal.`);
        }
        
        setIsLoading(false);
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location. ";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }
        
        console.error("GPS error:", error);
        alert(errorMessage);
        setIsLoading(false);
      },
      options
    );
  };

  const handleDocumentUploadSuccess = useCallback((uploadedDocs) => {
    setUploadedFiles(prev => [...prev, ...uploadedDocs]);
  }, []);

  const handleRemoveUploadedFile = useCallback((fileToRemoveId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileToRemoveId));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null); // Added as per outline

    if (!formData.attempt_date || !formData.attempt_time) {
      alert("Please enter both a date and time for the attempt.");
      setIsSubmitting(false);
      return;
    }

    if (formData.server_id === 'manual' && !formData.server_name_manual.trim()) {
      alert("Please select or manually enter a process server");
      setIsSubmitting(false);
      return;
    }

    // Validation for served attempts
    if (formData.status === 'served') {
      if (!formData.person_served_name.trim()) {
        alert("Person served name is required for successful service.");
        setIsSubmitting(false);
        return;
      }
      // Check if relationship is required (for non-personal service)
      const serviceTypeLower = formData.service_type_detail.toLowerCase();
      const isPersonalService = serviceTypeLower.includes('personal') || serviceTypeLower.includes('individual');
      if (!isPersonalService && !formData.relationship_to_recipient.trim()) {
        alert("Relationship to recipient is required for non-personal service.");
        setIsSubmitting(false);
        return;
      }
    }

    const finalAddressOfAttempt = formData.address_of_attempt; // Get final address string for validation and use
    if (!finalAddressOfAttempt || !finalAddressOfAttempt.trim()) { // Added address validation as per outline
      alert("Please enter an address for the attempt");
      setIsSubmitting(false);
      return;
    }

    try {
      const combinedDateTime = new Date(`${formData.attempt_date}T${formData.attempt_time}`);

      const serverData = formData.server_id === 'manual'
        ? { server_name_manual: formData.server_name_manual.trim(), server_id: null }
        : { server_id: formData.server_id, server_name_manual: employees.find(emp => emp.id === formData.server_id)?.first_name + ' ' + employees.find(emp => emp.id === formData.server_id)?.last_name };

      const attemptData = { // Renamed from finalData for clarity
        job_id: job.id,
        company_id: currentUser?.company_id,
        created_by: currentUser?.uid,
        ...serverData,
        attempt_date: combinedDateTime.toISOString(), // Outline specific: use combinedDateTime.toISOString()
        address_of_attempt: finalAddressOfAttempt, // Use the validated address
        notes: formData.notes,
        status: formData.status,
        service_type_detail: formData.service_type_detail,
        person_served_name: formData.person_served_name,
        person_served_age: formData.person_served_age,
        person_served_height: formData.person_served_height,
        person_served_weight: formData.person_served_weight,
        person_served_hair_color: formData.person_served_hair_color,
        person_served_sex: formData.person_served_sex,
        person_served_description: formData.person_served_description,
        relationship_to_recipient: formData.relationship_to_recipient,
        gps_lat: formData.gps_lat,
        gps_lon: formData.gps_lon,
        uploaded_files: uploadedFiles // Use the separate uploadedFiles state
      };

      let newAttempt;
      if (isEditMode && editingAttemptId) {
        newAttempt = await Attempt.update(editingAttemptId, attemptData);
      } else {
        newAttempt = await Attempt.create(attemptData);
      }

      // Update documents with the attempt_id (New logic as per outline)
      if (uploadedFiles.length > 0 && newAttempt?.id) {
        await Promise.all(
          uploadedFiles.map(doc => Document.update(doc.id, { attempt_id: newAttempt.id }))
        );
      }

      // NEW: Add new address to job if one was created and not a duplicate and integrate into jobUpdatePayload
      let addressesToUpdateForJob = [...(job.addresses || [])];
      
      if (selectedAddressType === "new" && newAddressData.address1 && job.id) {
        const fullNewAddressString = `${newAddressData.address1}, ${newAddressData.city}, ${newAddressData.state} ${newAddressData.postal_code}`.trim();
        const addressAlreadyExists = addressesToUpdateForJob.some(addr => 
          `${addr.address1}, ${addr.city}, ${addr.state} ${addr.postal_code}`.trim() === fullNewAddressString
        );

        if (!addressAlreadyExists) {
          addressesToUpdateForJob.push(newAddressData);
          console.log("Added new address to job for update payload:", newAddressData);
        } else {
          console.log("New address is a duplicate, not adding to job update payload.");
        }
      }

      // --- UPDATE JOB STATUS ---
      const newJobStatus = handleJobStatusOnAttempt(formData.status); // Using new helper function

      // Add activity log entry (existing logic, integrated into a single payload)
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        user_name: currentUser?.full_name || "System",
        event_type: isEditMode ? "attempt_updated" : "attempt_logged",
        description: `Service attempt ${isEditMode ? 'updated' : 'logged'}: ${formData.status === 'served' ? 'Successfully served' : formData.service_type_detail}`
      };

      const jobToUpdate = await Job.findById(job.id); // Fetch latest job data for activity log
      const currentActivityLog = Array.isArray(jobToUpdate?.activity_log) ? jobToUpdate.activity_log : [];

      const jobUpdatePayload = {
        status: newJobStatus,
        addresses: addressesToUpdateForJob, // Pass potentially updated addresses
        activity_log: [...currentActivityLog, newLogEntry], // Include activity log
      };

      if (formData.status === 'served') { // Outline specific: update service_date if served
        jobUpdatePayload.service_date = combinedDateTime.toISOString();
        // The outline implies service_method logic is handled by new status or not needed here.
      }
      
      await Job.update(job.id, jobUpdatePayload); // Perform a single job update
      // --- END JOB UPDATE ---

      navigate(`${createPageUrl('JobDetails')}?id=${job.id}`); // Navigated as per outline

    } catch (e) {
      setError(e.message);
      console.error("Submission failed:", e);
      alert("Failed to save attempt: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-slate-600 mb-4">The job you're trying to log an attempt for could not be found.</p>
          <Link to={createPageUrl("Jobs")}>
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get existing addresses for dropdown
  const existingAddresses = job.addresses || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditMode ? 'Edit Service Attempt' : 'Log Service Attempt'}
            </h1>
            <p className="text-slate-600 mt-1">Job #{job.job_number}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Attempt Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Attempt Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Process Server Selection */}
              <div>
                <Label htmlFor="server">Process Server</Label>
                <Select
                  id="server"
                  value={formData.server_id}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, server_id: value }));
                    if (value !== 'manual') {
                      setFormData(prev => ({ ...prev, server_name_manual: '' }));
                    }
                  }}
                  className="w-full h-12 mt-1"
                >
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="manual">Type in manually</SelectItem>
                </Select>

                {formData.server_id === 'manual' && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="server_name_manual"
                      placeholder="Enter server's full name"
                      value={formData.server_name_manual}
                      onChange={handleInputChange}
                      required
                      className="h-12"
                    />
                  </div>
                )}
              </div>

              {/* Date and Time */}
              <div>
                <Label>Date & Time of Attempt</Label>
                <div className="flex items-center gap-4 mt-1">
                  <Input
                    type="date"
                    name="attempt_date"
                    value={formData.attempt_date}
                    onChange={handleInputChange}
                    className="w-[240px] h-12"
                  />
                  <Input
                    type="time"
                    name="attempt_time"
                    value={formData.attempt_time}
                    onChange={handleInputChange}
                    className="w-[140px] h-12"
                  />
                </div>
              </div>

              {/* Attempt Outcome */}
              <div>
                <Label className="text-sm text-slate-600">Attempt Outcome</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={formData.status === 'served' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'served', service_type_detail: serviceTypeSettings.successful[0]?.label || '' }))} // Default to first successful option
                    className={`flex-1 h-12 gap-2 ${
                      formData.status === 'served'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Successfully Served
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === 'not_served' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'not_served', service_type_detail: serviceTypeSettings.unsuccessful[0]?.label || '' }))} // Default to first unsuccessful option
                    className={`flex-1 h-12 gap-2 ${
                      formData.status === 'not_served'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'border-red-200 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Not Served
                  </Button>
                </div>
              </div>

              {/* Service Type Detail Select/Input */}
              <div>
                <Label htmlFor="service-type-detail">Service Type Detail</Label>
                <Select
                  id="service-type-detail"
                  name="service_type_detail"
                  value={formData.service_type_detail}
                  onChange={handleInputChange}
                  required={formData.status === 'served'}
                  className="w-full h-12 mt-1"
                >
                  <SelectItem value="">
                    {formData.status === 'served' ? "Select service type..." : "Select reason for not served..."}
                  </SelectItem>
                  {(formData.status === 'served'
                    ? serviceTypeSettings.successful
                    : serviceTypeSettings.unsuccessful
                  ).map((item) => (
                    <SelectItem key={item.id} value={item.label}>
                      {item.label}
                    </SelectItem>
                  ))}
                </Select>
                {formData.service_type_detail === 'Other' && (
                  <Input
                    className="mt-2 h-12"
                    placeholder="Please specify other service type detail..."
                    value={formData.service_type_detail === 'Other' ? '' : formData.service_type_detail} // Clear if "Other" is the only value
                    onChange={handleInputChange}
                    name="service_type_detail"
                    required={true}
                  />
                )}
              </div>

              {/* Served Person Details - Only show when status is 'served' */}
              {formData.status === 'served' && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">Person Served Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Person Served Name */}
                    <div>
                      <Label htmlFor="person-served-name">Full Name of Person Served *</Label>
                      <Input
                        id="person-served-name"
                        name="person_served_name"
                        value={formData.person_served_name}
                        onChange={handleInputChange}
                        placeholder="Enter the full name of the person served"
                        required
                        className="mt-1"
                      />
                    </div>

                    {/* Relationship (only show for non-personal service) */}
                    {!formData.service_type_detail.toLowerCase().includes('personal') && !formData.service_type_detail.toLowerCase().includes('individual') && (
                      <div>
                        <Label htmlFor="relationship">Relationship to Recipient *</Label>
                        <Input
                          id="relationship"
                          name="relationship_to_recipient"
                          value={formData.relationship_to_recipient}
                          onChange={handleInputChange}
                          placeholder="e.g., Spouse, Employee, Authorized Agent, etc."
                          required={formData.status === 'served'}
                          className="mt-1"
                        />
                      </div>
                    )}

                    {/* Physical Description Fields (quick selectors removed) */}
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="person-age">Approximate Age</Label>
                        <Input
                          id="person-age"
                          name="person_served_age"
                          value={formData.person_served_age}
                          onChange={handleInputChange}
                          placeholder="e.g., 35-40"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="person-height">Height</Label>
                        <Input
                          id="person-height"
                          name="person_served_height"
                          value={formData.person_served_height}
                          onChange={handleInputChange}
                          placeholder="e.g., 5 feet 8 inches"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="person-weight">Weight</Label>
                        <Input
                          id="person-weight"
                          name="person_served_weight"
                          value={formData.person_served_weight}
                          onChange={handleInputChange}
                          placeholder="e.g., 150-160 lbs"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="person-hair">Hair Color</Label>
                        <Input
                          id="person-hair"
                          name="person_served_hair_color"
                          value={formData.person_served_hair_color}
                          onChange={handleInputChange}
                          placeholder="e.g., Brown, Blonde, Black"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="person-sex">Sex</Label>
                        <select
                          id="person-sex"
                          name="person_served_sex"
                          value={formData.person_served_sex}
                          onChange={handleInputChange}
                          className="w-full mt-1 h-12 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Additional Physical Description */}
                    <div>
                      <Label htmlFor="person-description">Additional Physical Description</Label>
                      <Textarea
                        id="person-description"
                        name="person_served_description"
                        value={formData.person_served_description}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 resize-none"
                        placeholder="Additional distinguishing features, clothing description, etc."
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* NEW: Enhanced Address Selection */}
              <div>
                <Label htmlFor="address-selection">Address of Attempt</Label>
                <Select
                  id="address-selection"
                  value={selectedAddressType}
                  onChange={(e) => handleAddressSelection(e.target.value)}
                  className="w-full h-12 mt-1"
                >
                  <SelectItem value="">Select an address...</SelectItem>
                  {existingAddresses.map((address, index) => (
                    <SelectItem key={address.address1 + address.postal_code + index} value={address.address1}>
                      {address.label || `Address ${index + 1}`} - {address.address1}, {address.city}, {address.state} {address.postal_code}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="new">Add New Address / Manual Entry</SelectItem>
                </Select>

                {/* Show new address form when "Add New Address" is selected */}
                {showNewAddressForm && (
                  <Card className="mt-4 border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-blue-800">Add New Address</CardTitle>
                      <CardDescription>
                        This address will be saved to the job for future attempts.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="address-label">Address Label</Label>
                        <Input
                          id="address-label"
                          value={newAddressData.label}
                          onChange={handleNewAddressLabelChange}
                          placeholder="e.g., Work Address, Secondary Address"
                          className="mt-1"
                        />
                      </div>

                      {!addressSelected && (
                        <div>
                          <Label htmlFor="new-address-street">Street Address</Label>
                          <AddressAutocomplete
                            value={newAddressInput}
                            onChange={(val) => {
                              setNewAddressInput(val);
                              handleNewAddressFieldChange('address1', val);
                            }}
                            onAddressSelect={(addressDetails) => {
                              handleNewAddressSelect(addressDetails);
                              // Auto-hide detailed fields and hide autocomplete after successful selection
                              if (addressDetails.city && addressDetails.state && addressDetails.postal_code) {
                                setShowAddressDetails(false);
                                setAddressSelected(true);
                              }
                            }}
                            onLoadingChange={setIsAddressLoading}
                            placeholder="Start typing the street address..."
                            className="mt-1 h-12"
                          />
                        </div>
                      )}

                      {/* Show address preview with Edit button when address is selected */}
                      {addressSelected && formData.address_of_attempt && !showAddressDetails && (
                        <div className="p-3 bg-white border border-blue-200 rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-blue-800 text-sm">Selected Address:</p>
                              <p className="text-sm text-slate-700 mt-1">{formData.address_of_attempt}</p>
                              {newAddressData.county && (
                                <p className="text-xs text-slate-600 mt-1">County: {newAddressData.county}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowAddressDetails(true);
                                setAddressSelected(false); // Show autocomplete again
                              }}
                              className="gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Show detailed fields when showAddressDetails is true OR when address is incomplete */}
                      {(showAddressDetails || !newAddressData.city) && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
                              <Label htmlFor="new-address-suite">Suite/Apt</Label>
                              <Input
                                id="new-address-suite"
                                value={newAddressData.address2}
                                onChange={(e) => handleNewAddressFieldChange('address2', e.target.value)}
                                placeholder="Suite, Apt, etc."
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="new-address-city">City</Label>
                              <Input
                                id="new-address-city"
                                value={newAddressData.city}
                                onChange={(e) => handleNewAddressFieldChange('city', e.target.value)}
                                placeholder="City"
                                className="mt-1"
                                disabled={isAddressLoading}
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-address-state">State</Label>
                              <Input
                                id="new-address-state"
                                value={newAddressData.state}
                                onChange={(e) => handleNewAddressFieldChange('state', e.target.value)}
                                placeholder="State"
                                className="mt-1"
                                disabled={isAddressLoading}
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-address-zip">ZIP Code</Label>
                              <Input
                                id="new-address-zip"
                                value={newAddressData.postal_code}
                                onChange={(e) => handleNewAddressFieldChange('postal_code', e.target.value)}
                                placeholder="ZIP Code"
                                className="mt-1"
                                disabled={isAddressLoading}
                              />
                            </div>
                          </div>

                          {newAddressData.city && newAddressData.state && newAddressData.postal_code && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAddressDetails(false)}
                              className="w-full"
                            >
                              Done Editing
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Display selected existing address if applicable and not 'new' */}
                {selectedAddressType !== "new" && formData.address_of_attempt && (
                    <div className="mt-2 p-3 bg-slate-100 border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-700">{formData.address_of_attempt}</p>
                    </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Detailed Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={6}
                  className="mt-1 resize-none"
                  placeholder="Provide detailed notes about the attempt including:
• Description of person served (if applicable)
• What happened during the attempt
• Any conversations that took place
• Physical descriptions
• Other relevant details..."
                />
              </div>

              {/* Enhanced GPS Location Section */}
              <div>
                <Label>GPS Location (Recommended)</Label>
                <div className="mt-2">
                  <div className="flex items-center gap-4 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetLocation}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      {isLoading ? 'Getting Location...' : 'Capture Current Location'}
                    </Button>
                    
                    {formData.gps_lat && formData.gps_lon && (
                      <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Location captured</span>
                      </div>
                    )}
                  </div>

                  {formData.gps_lat && formData.gps_lon && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">GPS Coordinates</span>
                        <span className="font-mono text-xs text-slate-500">
                          {formData.gps_lat.toFixed(6)}, {formData.gps_lon.toFixed(6)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        These coordinates will be saved with your attempt for location verification.
                        GPS data helps establish proof of presence at the service location.
                      </p>
                    </div>
                  )}

                  {!formData.gps_lat && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">
                            GPS Location Recommended
                          </p>
                          <p className="text-xs text-blue-700">
                            Capturing your current GPS location provides legal proof of your presence 
                            at the service address and can be valuable evidence in affidavits.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* File Upload Section - Using DocumentUpload component */}
              <div>
                <Label>Photos & Videos</Label>
                <CardDescription className="mb-3">Upload photos, videos, or other documentation from this attempt</CardDescription>
                <DocumentUpload
                  jobId={job.id} // Assuming DocumentUpload needs jobId to associate files
                  onUploadSuccess={handleDocumentUploadSuccess}
                  existingFiles={uploadedFiles} // Use separate uploadedFiles state
                  onRemoveFile={handleRemoveUploadedFile}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800" // Button styles from outline
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Attempt' : 'Save Attempt'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
