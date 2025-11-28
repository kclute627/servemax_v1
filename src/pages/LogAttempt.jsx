
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Job, Employee, Attempt, User, Client, Document, CompanySettings } from '@/api/entities'; // Added Document and CompanySettings imports
import { createPageUrl } from '@/utils';
import { useGlobalData } from '@/components/GlobalDataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
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
  Pencil,
  Target,
  User2,
  Ruler,
  Weight,
  Hash,
  Scissors,
  ChevronDown,
  ChevronUp,
  FileText,
  Camera
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PhotoVideoUpload from '../components/jobs/PhotoVideoUpload';
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
  gps_accuracy: null,
  gps_altitude: null,
  gps_heading: null,
  gps_timestamp: null,
  device_timestamp: null,
  // uploaded_files removed from formData to be managed by separate uploadedFiles state
};

export default function LogAttemptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get data from context for instant pre-population
  const { jobs: contextJobs, clients: contextClients, employees: contextEmployees } = useGlobalData();

  // Ref to track if job was pre-populated from context (to avoid showing spinner)
  const jobPrePopulatedRef = useRef(false);

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

  // Collapsible section states
  const [showPhysicalDescription, setShowPhysicalDescription] = useState(false);
  const [showGPSDetails, setShowGPSDetails] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);

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

  // Auto-populate person served name for personal/individual service
  useEffect(() => {
    // Only auto-fill if:
    // 1. We have job data with recipient name
    // 2. Service type contains "personal" or "individual"
    // 3. Person served name is currently empty (don't overwrite user input)
    if (
      job?.recipient?.name &&
      formData.service_type_detail &&
      (formData.service_type_detail.toLowerCase().includes('personal') ||
       formData.service_type_detail.toLowerCase().includes('individual')) &&
      !formData.person_served_name
    ) {
      setFormData(prev => ({
        ...prev,
        person_served_name: job.recipient.name
      }));
    }
  }, [job, formData.service_type_detail]);

  // Main data loading function (replaces loadInitialData)
  const loadJobData = useCallback(async (jobId, attemptId = null, skipLoading = false) => {
    // Only show loading spinner if skipLoading is false (i.e., not pre-populated from context)
    if (!skipLoading) {
      setIsLoading(true);
    }
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
              gps_accuracy: attemptData.gps_accuracy || null,
              gps_altitude: attemptData.gps_altitude || null,
              gps_heading: attemptData.gps_heading || null,
              gps_timestamp: attemptData.gps_timestamp || null,
              device_timestamp: attemptData.device_timestamp || null,
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
          attempt_date: now.toLocaleDateString('en-CA'), // YYYY-MM-DD format in local timezone
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

  /**
   * Pre-populate job data from GlobalDataContext for instant display.
   * This eliminates the loading spinner when navigating from Jobs list or JobDetails.
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobIdFromUrl = params.get('jobId');

    if (jobIdFromUrl && contextJobs && contextJobs.length > 0) {
      // Look for the job in the context
      const jobFromContext = contextJobs.find(j => j.id === jobIdFromUrl);

      if (jobFromContext) {
        // Immediately set the job data to avoid spinner
        setJob(jobFromContext);

        // Pre-populate client if available in context
        if (jobFromContext.client_id && contextClients) {
          const clientFromContext = contextClients.find(c => c.id === jobFromContext.client_id);
          if (clientFromContext) {
            setClient(clientFromContext);
          }
        }

        // Pre-populate employees from context
        if (contextEmployees && contextEmployees.length > 0) {
          setEmployees(contextEmployees);
        }

        // Set up initial form data with defaults
        const now = new Date();
        let defaultAddress = "";
        let defaultSelectedAddressType = "";

        if (jobFromContext.addresses?.length > 0) {
          const primaryAddress = jobFromContext.addresses.find(a => a.primary) || jobFromContext.addresses[0];
          defaultAddress = `${primaryAddress.address1}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.postal_code}`;
          defaultSelectedAddressType = primaryAddress.address1;
        }

        // Determine initial process server based on job's server_type
        let initialServerId = "";
        let initialServerNameManual = "";

        if (jobFromContext.server_type === "employee") {
          if (jobFromContext.assigned_server_id && jobFromContext.assigned_server_id !== "unassigned") {
            initialServerId = String(jobFromContext.assigned_server_id);
          }
        } else {
          initialServerId = "manual";
          initialServerNameManual = jobFromContext.server_name || "";
        }

        setFormData(prev => ({
          ...prev,
          job_id: jobFromContext.id,
          server_id: initialServerId,
          server_name_manual: initialServerNameManual,
          attempt_date: now.toLocaleDateString('en-CA'),
          attempt_time: now.toTimeString().slice(0, 5),
          address_of_attempt: defaultAddress,
        }));

        setSelectedAddressType(defaultSelectedAddressType);

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

  // Consolidated data loading effect (replaces previous jobId and loadInitialData effects)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobIdFromUrl = params.get('jobId');
    const attemptIdFromUrl = params.get('attemptId');

    if (jobIdFromUrl) {
      // No sessionStorage persistence for jobId as per outline
      setIsEditMode(!!attemptIdFromUrl);
      setEditingAttemptId(attemptIdFromUrl);

      // If job was pre-populated from context, skip showing loading spinner
      loadJobData(jobIdFromUrl, attemptIdFromUrl, jobPrePopulatedRef.current);

      // Reset the ref after using it
      jobPrePopulatedRef.current = false;
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
      console.log('[LogAttempt] Selected address from job:', selectedAddress);
      if (selectedAddress) {
        const fullAddress = `${selectedAddress.address1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`.trim();
        setFormData(prev => ({ ...prev, address_of_attempt: fullAddress }));

        // Populate newAddressData with coordinates from selected address
        console.log('[LogAttempt] Setting coordinates:', {
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude
        });
        setNewAddressData(prev => ({
          ...prev,
          latitude: selectedAddress.latitude || null,
          longitude: selectedAddress.longitude || null
        }));
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
  const handleGetLocation = (e) => {
    // Prevent any default behavior that might cause page scroll
    e?.preventDefault();
    e?.stopPropagation();

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsCapturingGPS(true); // Show loading state

    const options = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 10000, // 10 second timeout
      maximumAge: 60000 // Accept a cached position that's not older than 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
        const gpsTimestamp = new Date(position.timestamp).toISOString();

        setFormData(prev => ({
          ...prev,
          gps_lat: latitude,
          gps_lon: longitude,
          gps_accuracy: accuracy, // in meters
          gps_altitude: altitude, // in meters, may be null
          gps_heading: heading, // 0-360 degrees, may be null
          gps_timestamp: gpsTimestamp, // when GPS reading was taken
        }));

        // Show accuracy information to user
        if (accuracy > 100) {
          toast({
            title: "Location Captured",
            description: `Accuracy is low (±${Math.round(accuracy)}m). Consider moving to a more open area for better GPS signal.`,
            variant: "warning"
          });
        }

        setIsCapturingGPS(false);
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
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
        setIsCapturingGPS(false);
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
      const deviceTimestamp = new Date().toISOString(); // Capture when form is submitted

      // Detect if mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || ('ontouchstart' in window)
        || (navigator.maxTouchPoints > 0);

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
        // GPS data with enhanced metadata
        gps_lat: formData.gps_lat,
        gps_lon: formData.gps_lon,
        gps_accuracy: formData.gps_accuracy,
        gps_altitude: formData.gps_altitude,
        gps_heading: formData.gps_heading,
        gps_timestamp: formData.gps_timestamp,
        device_timestamp: deviceTimestamp,
        address_lat: newAddressData.latitude,
        address_lon: newAddressData.longitude,
        // Device tracking
        mobile_app_attempt: isMobile,
        device_info: navigator.userAgent,
        // Computed success flag
        success: formData.status === 'served',
        uploaded_files: uploadedFiles // Use the separate uploadedFiles state
      };

      // Debug logging to diagnose distance calculation issue
      console.log('Attempt data being saved:', {
        address_of_attempt: attemptData.address_of_attempt,
        address_lat: attemptData.address_lat,
        address_lon: attemptData.address_lon,
        newAddressData: newAddressData,
        selectedAddressType: selectedAddressType
      });

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

      // Create attempt summary for job document
      const attemptSummary = {
        id: newAttempt.id,
        attempt_date: attemptData.attempt_date,
        status: attemptData.status,
        service_type_detail: attemptData.service_type_detail,
        person_served_name: attemptData.person_served_name,
        address_of_attempt: attemptData.address_of_attempt,
        gps_lat: attemptData.gps_lat,
        gps_lon: attemptData.gps_lon,
        gps_accuracy: attemptData.gps_accuracy,
        gps_altitude: attemptData.gps_altitude,
        gps_timestamp: attemptData.gps_timestamp,
        address_lat: attemptData.address_lat,
        address_lon: attemptData.address_lon,
        mobile_app_attempt: attemptData.mobile_app_attempt,
        server_id: attemptData.server_id,
        server_name_manual: attemptData.server_name_manual,
        notes: attemptData.notes,
        uploaded_files: attemptData.uploaded_files,
        success: attemptData.success,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Get current job to access attempts array
      const currentJob = await Job.findById(job.id);
      let attemptsArray = Array.isArray(currentJob.attempts) ? [...currentJob.attempts] : [];

      // Add or update attempt in array
      if (isEditMode && editingAttemptId) {
        // Update existing attempt in array
        const attemptIndex = attemptsArray.findIndex(a => a.id === editingAttemptId);
        if (attemptIndex !== -1) {
          attemptsArray[attemptIndex] = attemptSummary;
        } else {
          // If not found in array, add it
          attemptsArray.push(attemptSummary);
        }
      } else {
        // Add new attempt to array
        attemptsArray.push(attemptSummary);
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
        attempts: attemptsArray, // Include updated attempts array
        activity_log: [...currentActivityLog, newLogEntry], // Include activity log
      };

      if (formData.status === 'served') { // Outline specific: update service_date if served
        jobUpdatePayload.service_date = combinedDateTime.toISOString();
        // The outline implies service_method logic is handled by new status or not needed here.
      }
      
      await Job.update(job.id, jobUpdatePayload); // Perform a single job update
      // --- END JOB UPDATE ---

      // Show success toast
      toast({
        variant: "success",
        title: isEditMode ? "Attempt updated" : "Attempt saved",
        description: `Service attempt has been ${isEditMode ? 'updated' : 'logged'} successfully.`
      });

      // Navigate with timestamp to force refresh
      navigate(`${createPageUrl('JobDetails')}?id=${job.id}&t=${Date.now()}`);

    } catch (e) {
      setError(e.message);
      console.error("Submission failed:", e);

      // Show error toast
      toast({
        variant: "destructive",
        title: "Error saving attempt",
        description: e.message || "Failed to save attempt. Please try again."
      });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="border-l border-slate-300 pl-3">
              <h1 className="text-xl font-bold text-slate-900">
                {isEditMode ? 'Edit Attempt' : 'Log Attempt'}
              </h1>
              <p className="text-sm text-slate-600">Job #{job.job_number}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <p className="text-sm"><strong className="font-semibold">Error:</strong> {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Form Card */}
          <Card className="shadow-sm">
            <CardContent className="pt-6 space-y-4">
              {/* Attempt Outcome - Featured at Top */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Attempt Outcome</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={formData.status === 'served' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'served', service_type_detail: serviceTypeSettings.successful[0]?.label || '' }))}
                    className={`h-16 gap-2 ${
                      formData.status === 'served'
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                        : 'border-2 border-slate-200 hover:border-green-200 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Successfully Served</span>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === 'not_served' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'not_served', service_type_detail: serviceTypeSettings.unsuccessful[0]?.label || '' }))}
                    className={`h-16 gap-2 ${
                      formData.status === 'not_served'
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                        : 'border-2 border-slate-200 hover:border-red-200 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">Not Served</span>
                  </Button>
                </div>
              </div>

              {/* Service Type Detail */}
              <div>
                <Label htmlFor="service-type-detail" className="text-sm font-medium">
                  {formData.status === 'served' ? 'Service Type' : 'Reason Not Served'}
                </Label>
                <Select
                  id="service-type-detail"
                  name="service_type_detail"
                  value={formData.service_type_detail}
                  onChange={handleInputChange}
                  required={formData.status === 'served'}
                  className="w-full mt-1.5"
                >
                  <SelectItem value="">
                    {formData.status === 'served' ? "Select service type..." : "Select reason..."}
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
              </div>

              {/* Compact 3-column grid for server, date, time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="server" className="text-sm font-medium">Process Server</Label>
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
                    className="w-full mt-1.5"
                  >
                    {employees.map(employee => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="attempt_date" className="text-sm font-medium">Date</Label>
                    <Input
                      id="attempt_date"
                      type="date"
                      name="attempt_date"
                      value={formData.attempt_date}
                      onChange={handleInputChange}
                      className="w-full mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="attempt_time" className="text-sm font-medium">Time</Label>
                    <Input
                      id="attempt_time"
                      type="time"
                      name="attempt_time"
                      value={formData.attempt_time}
                      onChange={handleInputChange}
                      className="w-full mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Manual Server Name Input (if manual is selected) */}
              {formData.server_id === 'manual' && (
                <div>
                  <Label htmlFor="server_name_manual" className="text-sm font-medium">Server Name</Label>
                  <Input
                    id="server_name_manual"
                    type="text"
                    name="server_name_manual"
                    placeholder="Enter server's full name"
                    value={formData.server_name_manual}
                    onChange={handleInputChange}
                    required
                    className="mt-1.5"
                  />
                </div>
              )}

              {/* Served Person Details - Only show when status is 'served' */}
              {formData.status === 'served' && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
                  <h3 className="text-base font-bold text-green-800 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Person Served
                  </h3>

                  {/* Compact 2-column layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="person-served-name" className="text-sm font-medium text-green-800">
                        Full Name *
                      </Label>
                      <Input
                        id="person-served-name"
                        name="person_served_name"
                        value={formData.person_served_name}
                        onChange={handleInputChange}
                        placeholder="Full name"
                        required
                        className="mt-1.5 bg-white"
                      />
                    </div>

                    {/* Relationship (only show for non-personal service) */}
                    {!formData.service_type_detail.toLowerCase().includes('personal') && !formData.service_type_detail.toLowerCase().includes('individual') && (
                      <div>
                        <Label htmlFor="relationship" className="text-sm font-medium text-green-800">
                          Relationship to Recipient *
                        </Label>
                        <Select
                          id="relationship"
                          name="relationship_to_recipient"
                          value={formData.relationship_to_recipient}
                          onChange={handleInputChange}
                          className="w-full mt-1.5 bg-white"
                        >
                          <SelectItem value="">Select...</SelectItem>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Child">Child</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="Manager/Supervisor">Manager/Supervisor</SelectItem>
                          <SelectItem value="Business Partner">Business Partner</SelectItem>
                          <SelectItem value="Receptionist">Receptionist</SelectItem>
                          <SelectItem value="Secretary">Secretary</SelectItem>
                          <SelectItem value="Authorized Agent">Authorized Agent</SelectItem>
                          <SelectItem value="Resident">Resident</SelectItem>
                          <SelectItem value="Co-occupant">Co-occupant</SelectItem>
                          <SelectItem value="Family Member">Family Member</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Physical Description */}
                  <div className="border-t border-green-200 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowPhysicalDescription(!showPhysicalDescription)}
                      className="flex items-center justify-between w-full text-sm font-semibold text-green-800 hover:text-green-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Physical Description (Optional)
                      </span>
                      {showPhysicalDescription ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showPhysicalDescription && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="person-age" className="text-xs font-medium text-green-800">Age</Label>
                            <Select
                              id="person-age"
                              name="person_served_age"
                              value={formData.person_served_age}
                              onChange={handleInputChange}
                              className="w-full mt-1 bg-white text-sm"
                            >
                              <SelectItem value="">Select...</SelectItem>
                              <SelectItem value="18-25">18-25</SelectItem>
                              <SelectItem value="26-35">26-35</SelectItem>
                              <SelectItem value="36-45">36-45</SelectItem>
                              <SelectItem value="46-55">46-55</SelectItem>
                              <SelectItem value="56-65">56-65</SelectItem>
                              <SelectItem value="66-75">66-75</SelectItem>
                              <SelectItem value="76+">76+</SelectItem>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="person-height" className="text-xs font-medium text-green-800">Height</Label>
                            <Select
                              id="person-height"
                              name="person_served_height"
                              value={formData.person_served_height}
                              onChange={handleInputChange}
                              className="w-full mt-1 bg-white text-sm"
                            >
                              <SelectItem value="">Select...</SelectItem>
                              <SelectItem value="Under 5'">Under 5'</SelectItem>
                              <SelectItem value="5'0-5'4">5'0"-5'4"</SelectItem>
                              <SelectItem value="5'5-5'9">5'5"-5'9"</SelectItem>
                              <SelectItem value="5'10-6'2">5'10"-6'2"</SelectItem>
                              <SelectItem value="6'3-6'6">6'3"-6'6"</SelectItem>
                              <SelectItem value="Over 6'6">Over 6'6"</SelectItem>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="person-weight" className="text-xs font-medium text-green-800">Weight</Label>
                            <Select
                              id="person-weight"
                              name="person_served_weight"
                              value={formData.person_served_weight}
                              onChange={handleInputChange}
                              className="w-full mt-1 bg-white text-sm"
                            >
                              <SelectItem value="">Select...</SelectItem>
                              <SelectItem value="Under 100 lbs">Under 100</SelectItem>
                              <SelectItem value="100-120 lbs">100-120</SelectItem>
                              <SelectItem value="121-140 lbs">121-140</SelectItem>
                              <SelectItem value="141-160 lbs">141-160</SelectItem>
                              <SelectItem value="161-180 lbs">161-180</SelectItem>
                              <SelectItem value="181-200 lbs">181-200</SelectItem>
                              <SelectItem value="201-220 lbs">201-220</SelectItem>
                              <SelectItem value="221-240 lbs">221-240</SelectItem>
                              <SelectItem value="Over 240 lbs">Over 240</SelectItem>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="person-hair" className="text-xs font-medium text-green-800">Hair Color</Label>
                            <Select
                              id="person-hair"
                              name="person_served_hair_color"
                              value={formData.person_served_hair_color}
                              onChange={handleInputChange}
                              className="w-full mt-1 bg-white text-sm"
                            >
                              <SelectItem value="">Select...</SelectItem>
                              <SelectItem value="Black">Black</SelectItem>
                              <SelectItem value="Brown">Brown</SelectItem>
                              <SelectItem value="Blonde">Blonde</SelectItem>
                              <SelectItem value="Red">Red</SelectItem>
                              <SelectItem value="Gray">Gray</SelectItem>
                              <SelectItem value="White">White</SelectItem>
                              <SelectItem value="Salt & Pepper">Salt & Pepper</SelectItem>
                              <SelectItem value="Bald/No Hair">Bald</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="person-sex" className="text-xs font-medium text-green-800">Sex</Label>
                            <Select
                              id="person-sex"
                              name="person_served_sex"
                              value={formData.person_served_sex}
                              onChange={handleInputChange}
                              className="w-full mt-1 bg-white text-sm"
                            >
                              <SelectItem value="">Select...</SelectItem>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="person-description" className="text-xs font-medium text-green-800">
                            Additional Description
                          </Label>
                          <Textarea
                            id="person-description"
                            name="person_served_description"
                            value={formData.person_served_description}
                            onChange={handleInputChange}
                            rows={2}
                            className="mt-1 resize-none bg-white text-sm"
                            placeholder="Distinguishing features, clothing, etc."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Address Selection - Compact */}
              <div>
                <Label htmlFor="address-selection" className="text-sm font-medium">Address of Attempt</Label>
                <Select
                  id="address-selection"
                  value={selectedAddressType}
                  onChange={(e) => handleAddressSelection(e.target.value)}
                  className="w-full mt-1.5"
                >
                  <SelectItem value="">Select an address...</SelectItem>
                  {existingAddresses.map((address, index) => (
                    <SelectItem key={address.address1 + address.postal_code + index} value={address.address1}>
                      {address.label || `Address ${index + 1}`} - {address.address1}, {address.city}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="new">+ Add New Address</SelectItem>
                </Select>

                {/* Show new address form when "Add New Address" is selected */}
                {showNewAddressForm && (
                  <div className="mt-3 border-2 border-blue-200 bg-blue-50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-blue-800">Add New Address</h4>
                      <span className="text-xs text-blue-600">Will be saved to job</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="address-label" className="text-xs font-medium">Label</Label>
                        <Input
                          id="address-label"
                          value={newAddressData.label}
                          onChange={handleNewAddressLabelChange}
                          placeholder="e.g., Work Address"
                          className="mt-1 bg-white text-sm"
                        />
                      </div>

                      {!addressSelected && (
                        <div>
                          <Label htmlFor="new-address-street" className="text-xs font-medium">Street Address</Label>
                          <AddressAutocomplete
                            value={newAddressInput}
                            onChange={(val) => {
                              setNewAddressInput(val);
                              handleNewAddressFieldChange('address1', val);
                            }}
                            onAddressSelect={(addressDetails) => {
                              handleNewAddressSelect(addressDetails);
                              if (addressDetails.city && addressDetails.state && addressDetails.postal_code) {
                                setShowAddressDetails(false);
                                setAddressSelected(true);
                              }
                            }}
                            onLoadingChange={setIsAddressLoading}
                            placeholder="Start typing address..."
                            className="mt-1 bg-white"
                          />
                        </div>
                      )}

                      {addressSelected && formData.address_of_attempt && !showAddressDetails && (
                        <div className="p-2 bg-white border border-blue-300 rounded flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-800">Selected:</p>
                            <p className="text-sm text-slate-700 mt-0.5 truncate">{formData.address_of_attempt}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowAddressDetails(true);
                              setAddressSelected(false);
                            }}
                            className="shrink-0 h-7 px-2"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {(showAddressDetails || !newAddressData.city) && (
                        <>
                          <div>
                            <Label htmlFor="new-address-suite" className="text-xs font-medium">Suite/Apt</Label>
                            <Input
                              id="new-address-suite"
                              value={newAddressData.address2}
                              onChange={(e) => handleNewAddressFieldChange('address2', e.target.value)}
                              placeholder="Suite, Apt, etc."
                              className="mt-1 bg-white text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label htmlFor="new-address-city" className="text-xs font-medium">City</Label>
                              <Input
                                id="new-address-city"
                                value={newAddressData.city}
                                onChange={(e) => handleNewAddressFieldChange('city', e.target.value)}
                                placeholder="City"
                                className="mt-1 bg-white text-sm"
                                disabled={isAddressLoading}
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-address-state" className="text-xs font-medium">State</Label>
                              <Input
                                id="new-address-state"
                                value={newAddressData.state}
                                onChange={(e) => handleNewAddressFieldChange('state', e.target.value)}
                                placeholder="State"
                                className="mt-1 bg-white text-sm"
                                disabled={isAddressLoading}
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-address-zip" className="text-xs font-medium">ZIP</Label>
                              <Input
                                id="new-address-zip"
                                value={newAddressData.postal_code}
                                onChange={(e) => handleNewAddressFieldChange('postal_code', e.target.value)}
                                placeholder="ZIP"
                                className="mt-1 bg-white text-sm"
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
                              className="w-full h-8 text-xs"
                            >
                              Done Editing
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedAddressType !== "new" && formData.address_of_attempt && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                    <p className="text-sm text-slate-700">{formData.address_of_attempt}</p>
                  </div>
                )}
              </div>

              {/* Notes - Compact */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Detailed Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1.5 resize-none text-sm"
                  placeholder="Describe what happened during the attempt, conversations, observations, etc."
                />
              </div>

              {/* GPS Location - Compact with Collapsible Details */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    GPS Location {formData.gps_lat && <span className="text-xs text-green-600 font-normal">(Captured)</span>}
                  </Label>
                  {formData.gps_lat && (
                    <button
                      type="button"
                      onClick={() => setShowGPSDetails(!showGPSDetails)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      {showGPSDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showGPSDetails ? 'Hide' : 'Show'} Details
                    </button>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={isCapturingGPS}
                  className="w-full gap-2 h-10"
                >
                  {isCapturingGPS ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      {formData.gps_lat ? 'Recapture Location' : 'Capture Current Location'}
                    </>
                  )}
                </Button>

                {formData.gps_lat && formData.gps_lon && showGPSDetails && (
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-slate-600">Coordinates:</span>
                        <p className="font-mono text-slate-800">{formData.gps_lat.toFixed(6)}, {formData.gps_lon.toFixed(6)}</p>
                      </div>
                      {formData.gps_accuracy && (
                        <div>
                          <span className="font-medium text-slate-600">Accuracy:</span>
                          <p className="text-slate-800">
                            ±{Math.round(formData.gps_accuracy)}m
                            {formData.gps_accuracy <= 20 && ' (Excellent)'}
                            {formData.gps_accuracy > 20 && formData.gps_accuracy <= 50 && ' (Good)'}
                            {formData.gps_accuracy > 50 && formData.gps_accuracy <= 100 && ' (Fair)'}
                            {formData.gps_accuracy > 100 && ' (Low)'}
                          </p>
                        </div>
                      )}
                    </div>
                    {formData.gps_altitude && (
                      <p className="text-xs text-slate-600">Altitude: {Math.round(formData.gps_altitude)}m</p>
                    )}
                  </div>
                )}

                {!formData.gps_lat && (
                  <p className="mt-2 text-xs text-slate-600">
                    GPS location provides legal proof of presence at the service address
                  </p>
                )}
              </div>

              {/* Media Upload - Collapsible */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowMediaUpload(!showMediaUpload)}
                  className="flex items-center justify-between w-full text-sm font-medium mb-2 hover:text-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Photos & Videos {uploadedFiles.length > 0 && <span className="text-xs text-green-600 font-normal">({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})</span>}
                  </span>
                  {showMediaUpload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showMediaUpload && (
                  <div className="mt-2">
                    <PhotoVideoUpload
                      jobId={job.id}
                      onUploadSuccess={handleDocumentUploadSuccess}
                      existingFiles={uploadedFiles}
                      onRemoveFile={handleRemoveUploadedFile}
                    />
                  </div>
                )}

                {!showMediaUpload && uploadedFiles.length === 0 && (
                  <p className="text-xs text-slate-600">Click to add photos or videos</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions - Sticky Bottom Bar */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 shadow-lg rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
                <Button type="button" variant="ghost" disabled={isSubmitting} size="sm">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-md"
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
          </div>
        </form>
      </div>
    </div>
  );
}
