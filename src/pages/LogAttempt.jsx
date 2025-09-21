
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Job, Employee, Attempt, CompanySettings, User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  User as UserIcon, // Renamed to avoid conflict with imported User entity
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Plus,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocomplete from '../components/jobs/AddressAutocomplete';
import { UploadFile } from '@/api/integrations';

// Note: attemptStatusOptions is no longer directly used for rendering the status buttons,
// but it defines the possible values and their associated icons/colors, which might be
// useful for other parts of the application or future expansions.
const attemptStatusOptions = [
  { value: "served", label: "Successfully Served", icon: CheckCircle, color: "text-green-600" },
  { value: "not_served", label: "Not Served", icon: AlertCircle, color: "text-red-600" },
  { value: "contact_made", label: "Contact Made", icon: UserIcon, color: "text-blue-600" },
  { value: "vacant", label: "Property Vacant", icon: AlertCircle, color: "text-orange-600" },
  { value: "bad_address", label: "Bad Address", icon: MapPin, color: "text-red-600" },
];

export default function LogAttemptPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get job ID from URL params
  const [jobId, setJobId] = useState(null);

  // State
  const [job, setJob] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null); // Added error state
  const [currentUser, setCurrentUser] = useState(null); // Add state for current user

  // Form state
  const [serverId, setServerId] = useState('');
  const [attemptDate, setAttemptDate] = useState(new Date());
  const [attemptTime, setAttemptTime] = useState(format(new Date(), "HH:mm"));
  const [status, setStatus] = useState('served'); // Changed default status to 'served'
  const [serviceTypeDetail, setServiceTypeDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [addressOfAttempt, setAddressOfAttempt] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddressDetails, setNewAddressDetails] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal_code: ''
  });
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [manualServerName, setManualServerName] = useState('');

  // New state for served person details
  const [personServedName, setPersonServedName] = useState('');
  const [personServedAge, setPersonServedAge] = useState('');
  const [personServedHeight, setPersonServedHeight] = useState('');
  const [personServedWeight, setPersonServedWeight] = useState('');
  const [personServedHairColor, setPersonServedHairColor] = useState('');
  const [personServedSex, setPersonServedSex] = useState('');
  const [personServedDescription, setPersonServedDescription] = useState('');
  const [relationshipToRecipient, setRelationshipToRecipient] = useState('');

  // New state for toggling description buttons
  // Note: The toggle button itself has been removed from the UI,
  // but this state variable is still used to determine if the quick selectors
  // for physical description fields should be visible, based on CompanySettings.
  const [showDescriptionButtons, setShowDescriptionButtons] = useState(true);

  // Add new state for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // New state for custom service types from CompanySettings
  const [serviceTypes, setServiceTypes] = useState({ successful: [], unsuccessful: [] });

  // Effect to manage jobId extraction and persistence
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    let idFromUrl = urlParams.get('jobId');

    if (idFromUrl) {
      sessionStorage.setItem('lastLogAttemptJobId', idFromUrl);
      setJobId(idFromUrl);
    } else {
      const idFromSession = sessionStorage.getItem('lastLogAttemptJobId');
      if (idFromSession) {
        setJobId(idFromSession);
      } else {
        console.error("No job ID provided");
        alert("No job ID found. Returning to the jobs list.");
        navigate(createPageUrl("Jobs"));
      }
    }

    // Fetch current user
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("No user logged in for activity tracking.", e);
        // It's not critical for the page to break if user can't be fetched,
        // but activity log might show "System" as user.
      }
    };
    fetchUser();

  }, [location.search, navigate]);

  const loadData = useCallback(async () => {
    if (!jobId) return;

    setIsLoading(true);
    try {
      const [jobData, employeesData, companySettings] = await Promise.all([
        Job.get(jobId),
        Employee.list(),
        CompanySettings.filter({ setting_key: 'service_types' }), // Fetch service types from settings
      ]);

      if (!jobData) {
        throw new Error("Job not found");
      }

      setJob(jobData);
      setEmployees(employeesData || []);

      // Process company settings for service types and description buttons toggle
      const serviceTypeSetting = companySettings?.find(s => s.setting_key === 'service_types');
      if (serviceTypeSetting && serviceTypeSetting.setting_value) {
        setServiceTypes(serviceTypeSetting.setting_value);

        // Set description buttons visibility - explicitly check the boolean value
        const showButtons = serviceTypeSetting.setting_value.show_description_buttons;
        setShowDescriptionButtons(showButtons === true); // Only true if explicitly true

        console.log("Description buttons setting:", showButtons, "Will show buttons:", showButtons === true); // Debug log
      } else {
        // If no settings found, use default service types (empty arrays)
        // and default to showing description buttons (which is the initial state).
        setServiceTypes({ successful: [], unsuccessful: [] });
        setShowDescriptionButtons(true);
        console.log("No service type settings found. Defaulting service types and showing buttons.");
      }

      // Set defaults
      if (jobData.assigned_server_id) {
        setServerId(jobData.assigned_server_id);
        setManualServerName('');
      } else {
        setServerId('');
        setManualServerName('');
      }

      const primaryAddress = jobData.addresses?.find(a => a.primary) || jobData.addresses?.[0];
      if (primaryAddress) {
        const fullAddr = `${primaryAddress.address1}, ${primaryAddress.city}, ${primaryAddress.state}`;
        setAddressOfAttempt(fullAddr);
      }

    } catch (error) {
      console.error("Error loading data:", error);
      setError("Error loading job data: " + error.message);
      alert("Error loading job data");
      navigate(createPageUrl("Jobs"));
    }
    setIsLoading(false);
  }, [jobId, navigate]);

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId, loadData]);

  // Effect to update serviceTypeDetail and person served name when status or serviceTypes change
  useEffect(() => {
    // Helper to clear person served details
    const clearPersonServedDetails = () => {
      setPersonServedName('');
      setPersonServedAge('');
      setPersonServedHeight('');
      setPersonServedWeight('');
      setPersonServedHairColor('');
      setPersonServedSex('');
      setPersonServedDescription('');
      setRelationshipToRecipient('');
    };

    if (status === 'served') {
      const successfulTypes = serviceTypes.successful;
      if (successfulTypes && successfulTypes.length > 0) {
        const defaultType = successfulTypes[0].label;
        setServiceTypeDetail(defaultType);

        // If it's personal service and we have a job recipient, pre-populate the name
        const isPersonalService = defaultType.toLowerCase().includes('personal') || defaultType.toLowerCase().includes('individual');
        if (isPersonalService && job?.recipient?.name) {
          setPersonServedName(job.recipient.name);
        } else {
          setPersonServedName(''); // Clear if not personal or no recipient
        }
      } else {
        setServiceTypeDetail('');
        clearPersonServedDetails();
      }
    } else if (status === 'not_served') {
      const unsuccessfulTypes = serviceTypes.unsuccessful;
      if (unsuccessfulTypes && unsuccessfulTypes.length > 0) {
        setServiceTypeDetail(unsuccessfulTypes[0].label);
      } else {
        setServiceTypeDetail('');
      }
      // Clear served person details when not served
      clearPersonServedDetails();
    } else {
      setServiceTypeDetail(''); // Clear if no specific type is available or status is not 'served'/'not_served'
      clearPersonServedDetails(); // Also clear if status is neither served nor not_served
    }
  }, [status, serviceTypes, job]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location.");
        setIsGettingLocation(false);
      }
    );
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploadingFile(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Here we assume UploadFile is a utility that handles the actual upload
        // and returns a file_url. It should also handle max file size limits if needed.
        const { file_url } = await UploadFile({ file });
        return {
          id: `upload-${Date.now()}-${Math.random()}`, // Unique ID for React key and removal
          name: file.name,
          file_url: file_url,
          file_size: file.size,
          content_type: file.type,
          upload_date: new Date().toISOString()
        };
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Error uploading files: " + error.message);
    }
    setIsUploadingFile(false);
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!serverId && !manualServerName.trim()) {
      alert("Please select or manually enter a process server");
      setIsSubmitting(false);
      return;
    }

    // Validation for served attempts
    if (status === 'served') {
      if (!personServedName.trim()) {
        alert("Person served name is required for successful service.");
        setIsSubmitting(false);
        return;
      }
      // Check if relationship is required (for non-personal service)
      const isPersonalService = serviceTypeDetail.toLowerCase().includes('personal') || serviceTypeDetail.toLowerCase().includes('individual');
      if (!isPersonalService && !relationshipToRecipient.trim()) {
        alert("Relationship to recipient is required for non-personal service.");
        setIsSubmitting(false);
        return;
      }
    }

    let finalAddress;
    if (isAddingNewAddress) {
      const addressParts = [
        newAddressDetails.address1,
        newAddressDetails.address2,
        newAddressDetails.city,
        newAddressDetails.state,
        newAddressDetails.postal_code
      ].filter(part => part && part.trim());

      finalAddress = addressParts.join(', ');
    } else {
      finalAddress = addressOfAttempt;
    }

    if (!finalAddress || !finalAddress.trim()) {
      alert("Please select or enter an address for the attempt");
      setIsSubmitting(false);
      return;
    }

    try {
      const [hours, minutes] = attemptTime.split(':');
      const finalAttemptDate = new Date(attemptDate);
      finalAttemptDate.setHours(parseInt(hours, 10));
      finalAttemptDate.setMinutes(parseInt(minutes, 10));

      const attemptData = {
        job_id: job.id,
        server_id: serverId !== 'manual' ? serverId : null,
        server_name_manual: serverId === 'manual' ? manualServerName.trim() : null,
        attempt_date: finalAttemptDate.toISOString(),
        address_of_attempt: finalAddress,
        status: status,
        service_type_detail: serviceTypeDetail, // Using new serviceTypeDetail
        notes: notes,
        gps_lat: gpsCoords?.lat,
        gps_lon: gpsCoords?.lon,
        uploaded_files: uploadedFiles // Add uploaded files to attempt data
      };

      // Add served person details if status is served
      if (status === 'served') {
        attemptData.person_served_name = personServedName.trim();
        attemptData.person_served_age = personServedAge.trim();
        attemptData.person_served_height = personServedHeight.trim();
        attemptData.person_served_weight = personServedWeight.trim();
        attemptData.person_served_hair_color = personServedHairColor.trim();
        attemptData.person_served_sex = personServedSex;
        attemptData.person_served_description = personServedDescription.trim();
        attemptData.relationship_to_recipient = relationshipToRecipient.trim();
      }

      const createdAttempt = await Attempt.create(attemptData);
      console.log("Attempt created:", createdAttempt);

      // If a new address was entered for the attempt, add it to the job record.
      if (isAddingNewAddress && newAddressDetails.address1) {
        const currentAddresses = Array.isArray(job.addresses) ? job.addresses : [];
        const alreadyExists = currentAddresses.some(addr =>
          (addr.address1 || '').toLowerCase().trim() === (newAddressDetails.address1 || '').toLowerCase().trim() &&
          (addr.city || '').toLowerCase().trim() === (newAddressDetails.city || '').trim()
        );
        if (!alreadyExists) {
          const newAddressObject = {
            label: "Other", // Default label for a newly discovered address
            address1: newAddressDetails.address1,
            address2: newAddressDetails.address2,
            city: newAddressDetails.city,
            state: newAddressDetails.state,
            postal_code: newAddressDetails.postal_code,
            primary: false
          };
          await Job.update(job.id, { addresses: [...currentAddresses, newAddressObject] });
        }
      }

      // --- UPDATE JOB STATUS AND ACTIVITY LOG ---
      const jobToUpdate = await Job.get(job.id); // Fetch the latest job data to ensure current state
      let jobUpdateData = {};
      let needsJobUpdate = false;

      if (status === 'served') {
        if (jobToUpdate.status !== 'served') {
          jobUpdateData.status = 'served';
          jobUpdateData.service_date = finalAttemptDate.toISOString();
          // Map service type detail to a predefined service method
          let serviceMethod = 'personal'; // Default
          if (serviceTypeDetail) {
            const lowerCaseDetail = serviceTypeDetail.toLowerCase();
            if (lowerCaseDetail.includes('personal') || lowerCaseDetail.includes('individual')) {
              serviceMethod = 'personal';
            } else if (lowerCaseDetail.includes('substitute')) {
              serviceMethod = 'substituted';
            } else if (lowerCaseDetail.includes('posted')) {
              serviceMethod = 'posted';
            } else if (lowerCaseDetail.includes('mail')) {
              serviceMethod = 'certified_mail';
            }
          }
          jobUpdateData.service_method = serviceMethod;
          needsJobUpdate = true;
        }
      } else {
        if (jobToUpdate.status === 'pending' || jobToUpdate.status === 'assigned') {
          jobUpdateData.status = 'in_progress';
          needsJobUpdate = true;
        }
      }

      const newLogEntry = {
        timestamp: new Date().toISOString(),
        user_name: currentUser?.full_name || "System",
        event_type: "attempt_logged",
        description: `Service attempt logged: ${status === 'served' ? 'Successfully served' : serviceTypeDetail}`
      };

      const currentActivityLog = Array.isArray(jobToUpdate?.activity_log) ? jobToUpdate.activity_log : [];
      jobUpdateData.activity_log = [...currentActivityLog, newLogEntry];
      // Activity log always updates, so we always need a job update here.
      needsJobUpdate = true;

      if (needsJobUpdate) {
        await Job.update(job.id, jobUpdateData);
        console.log("Job updated with new status and activity log");
      }
      // --- END JOB UPDATE ---

      // Navigate back to job details with success message in URL params
      navigate(`${createPageUrl("JobDetails")}?id=${job.id}&success=attempt_saved`);

    } catch (error) {
      console.error("Error saving attempt:", error);
      setError("Failed to save attempt: " + error.message);
      alert("Failed to save attempt: " + error.message);
    }

    setIsSubmitting(false);
  };

  const handleAddressSelectChange = (value) => {
    if (value === 'new_address') {
      setIsAddingNewAddress(true);
      setAddressOfAttempt('');
      setNewAddressDetails({
        address1: '',
        address2: '',
        city: '',
        state: '',
        postal_code: ''
      });
    } else {
      setIsAddingNewAddress(false);
      setAddressOfAttempt(value);
      setNewAddressDetails({
        address1: '',
        address2: '',
        city: '',
        state: '',
        postal_code: ''
      });
    }
  };

  // This function now properly updates all fields when autocomplete selects an address
  const handleNewAddressSelected = (addressDetails) => {
    // Update all fields at once with the selected address details
    setNewAddressDetails({
      address1: addressDetails.address1 || '',
      address2: addressDetails.address2 || '', // This might come from the autocomplete or stay empty
      city: addressDetails.city || '',
      state: addressDetails.state || '',
      postal_code: addressDetails.postal_code || ''
    });
  };

  const handleAddressFieldChange = (field, value) => {
    setNewAddressDetails(prev => ({
      ...prev,
      [field]: value
    }));
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
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-slate-600 mb-4">The job you're trying to log an attempt for could not be found.</p>
          <Link to={createPageUrl("Jobs")}>
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Log Service Attempt</h1>
            <p className="text-slate-600 mt-1">Job #{job.job_number} - {job.recipient?.name}</p>
          </div>
        </div>

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
                  value={serverId}
                  onValueChange={(value) => {
                    setServerId(value);
                    if (value !== 'manual') {
                      setManualServerName('');
                    }
                  }}
                >
                  <SelectTrigger id="server" className="w-full mt-1 h-12">
                    <SelectValue placeholder="Select a process server..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.role === 'process_server').map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="manual">Type in manually</SelectItem>
                  </SelectContent>
                </Select>

                {serverId === 'manual' && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      placeholder="Enter server's full name"
                      value={manualServerName}
                      onChange={(e) => setManualServerName(e.target.value)}
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[240px] justify-start text-left font-normal h-12">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {attemptDate ? format(attemptDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={attemptDate}
                        onSelect={setAttemptDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={attemptTime}
                    onChange={(e) => setAttemptTime(e.target.value)}
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
                    variant={status === 'served' ? 'default' : 'outline'}
                    onClick={() => setStatus('served')}
                    className={`flex-1 h-12 gap-2 ${
                      status === 'served'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Successfully Served
                  </Button>
                  <Button
                    type="button"
                    variant={status === 'not_served' ? 'default' : 'outline'}
                    onClick={() => setStatus('not_served')}
                    className={`flex-1 h-12 gap-2 ${
                      status === 'not_served'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'border-red-200 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Not Served
                  </Button>
                </div>
              </div>

              {/* Service Type Detail Dropdown */}
              {((status === 'served' && serviceTypes.successful.length > 0) || (status === 'not_served' && serviceTypes.unsuccessful.length > 0)) && (
                <div>
                  <Label htmlFor="service-type-detail">Service Type</Label>
                  <Select
                    value={serviceTypeDetail}
                    onValueChange={(value) => {
                      const newServiceTypeDetail = value;
                      setServiceTypeDetail(newServiceTypeDetail);
                      // Auto-populate person served name for personal service
                      if (status === 'served') {
                        const isPersonalService = newServiceTypeDetail.toLowerCase().includes('personal') || newServiceTypeDetail.toLowerCase().includes('individual');
                        if (isPersonalService && job?.recipient?.name) {
                          setPersonServedName(job.recipient.name);
                        } else {
                          setPersonServedName('');
                        }
                      }
                    }}
                  >
                    <SelectTrigger id="service-type-detail" className="w-full mt-1 h-12">
                      <SelectValue placeholder="Select service type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {status === 'served'
                        ? serviceTypes.successful.map(type => (
                            <SelectItem key={type.id || type.label} value={type.label}>
                              {type.label}
                            </SelectItem>
                          ))
                        : serviceTypes.unsuccessful.map(type => (
                            <SelectItem key={type.id || type.label} value={type.label}>
                              {type.label}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Served Person Details - Only show when status is 'served' */}
              {status === 'served' && (
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
                        value={personServedName}
                        onChange={(e) => setPersonServedName(e.target.value)}
                        placeholder="Enter the full name of the person served"
                        required={status === 'served'}
                        className="mt-1"
                      />
                    </div>

                    {/* Relationship (only show for non-personal service) */}
                    {!serviceTypeDetail.toLowerCase().includes('personal') && !serviceTypeDetail.toLowerCase().includes('individual') && (
                      <div>
                        <Label htmlFor="relationship">Relationship to Recipient *</Label>
                        <Input
                          id="relationship"
                          value={relationshipToRecipient}
                          onChange={(e) => setRelationshipToRecipient(e.target.value)}
                          placeholder="e.g., Spouse, Employee, Authorized Agent, etc."
                          required={status === 'served'}
                          className="mt-1"
                        />
                      </div>
                    )}

                    {/* Physical Description Fields with Quick Selectors */}
                    <div className="space-y-6 pt-4">
                      <div>
                        <Label htmlFor="person-age">Approximate Age</Label>
                        <Input
                          id="person-age"
                          value={personServedAge}
                          onChange={(e) => setPersonServedAge(e.target.value)}
                          placeholder="e.g., 35-40"
                          className="mt-1"
                        />
                        {showDescriptionButtons && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['<18', '18-27', '28-38', '39-48', '49-55', '56-65', '66-75', '>75'].map(age => (
                              <Button key={age} type="button" size="sm" variant={personServedAge === age ? "secondary" : "outline"} onClick={() => setPersonServedAge(age)}>{age}</Button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="person-height">Height</Label>
                        <Input
                          id="person-height"
                          value={personServedHeight}
                          onChange={(e) => setPersonServedHeight(e.target.value)}
                          placeholder="e.g., 5 feet 8 inches"
                          className="mt-1"
                        />
                        {showDescriptionButtons && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {["< 5'", "5'0\"-5'3\"", "5'4\"-5'7\"", "5'8\"-5'11\"", "6'0\"-6'3\"", "> 6'3\""].map(height => (
                              <Button key={height} type="button" size="sm" variant={personServedHeight === height ? "secondary" : "outline"} onClick={() => setPersonServedHeight(height)}>{height}</Button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="person-weight">Weight</Label>
                        <Input
                          id="person-weight"
                          value={personServedWeight}
                          onChange={(e) => setPersonServedWeight(e.target.value)}
                          placeholder="e.g., 150-160 lbs"
                          className="mt-1"
                        />
                        {showDescriptionButtons && (
                           <div className="flex flex-wrap gap-2 mt-2">
                            {["< 120", "120-150", "151-180", "181-210", "211-240", "> 240"].map(weight => (
                              <Button key={weight} type="button" size="sm" variant={personServedWeight.startsWith(weight) ? "secondary" : "outline"} onClick={() => setPersonServedWeight(`${weight} lbs`)}>{weight} lbs</Button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="person-hair">Hair Color</Label>
                        <Input
                          id="person-hair"
                          value={personServedHairColor}
                          onChange={(e) => setPersonServedHairColor(e.target.value)}
                          placeholder="e.g., Brown, Blonde, Black"
                          className="mt-1"
                        />
                        {showDescriptionButtons && (
                           <div className="flex flex-wrap gap-2 mt-2">
                            {['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Bald'].map(hair => (
                              <Button key={hair} type="button" size="sm" variant={personServedHairColor === hair ? "secondary" : "outline"} onClick={() => setPersonServedHairColor(hair)}>{hair}</Button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="person-sex">Sex</Label>
                        <select
                          id="person-sex"
                          value={personServedSex}
                          onChange={(e) => setPersonServedSex(e.target.value)}
                          className="w-full mt-1 h-12 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Other">Other</option>
                        </select>
                        {showDescriptionButtons && (
                           <div className="flex flex-wrap gap-2 mt-2">
                            <Button type="button" size="sm" variant={personServedSex === 'Male' ? "secondary" : "outline"} onClick={() => setPersonServedSex('Male')}>Male</Button>
                            <Button type="button" size="sm" variant={personServedSex === 'Female' ? "secondary" : "outline"} onClick={() => setPersonServedSex('Female')}>Female</Button>
                            <Button type="button" size="sm" variant={personServedSex === 'Non-binary' ? "secondary" : "outline"} onClick={() => setPersonServedSex('Non-binary')}>Non-binary</Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Physical Description */}
                    <div>
                      <Label htmlFor="person-description">Additional Physical Description</Label>
                      <Textarea
                        id="person-description"
                        value={personServedDescription}
                        onChange={(e) => setPersonServedDescription(e.target.value)}
                        rows={3}
                        className="mt-1 resize-none"
                        placeholder="Additional distinguishing features, clothing description, etc."
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Address Selection */}
              <div>
                <Label htmlFor="address">Address of Attempt</Label>
                <Select
                  value={isAddingNewAddress ? 'new_address' : addressOfAttempt}
                  onValueChange={handleAddressSelectChange}
                >
                  <SelectTrigger id="address" className="w-full mt-1 h-12">
                    <SelectValue placeholder="Select an address..." />
                  </SelectTrigger>
                  <SelectContent>
                    {job.addresses?.map((addr, idx) => {
                      const fullAddr = `${addr.address1}, ${addr.city}, ${addr.state}`;
                      return (
                        <SelectItem key={idx} value={fullAddr}>
                          {fullAddr} {addr.primary && '(Primary)'}
                        </SelectItem>
                      );
                    })}
                    <SelectSeparator />
                    <SelectItem value="new_address" className="font-semibold text-blue-600">
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Enter a new address
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Address Form */}
              {isAddingNewAddress && (
                <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                  <Label className="font-semibold">Enter New Address</Label>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="new-address1">Street Address *</Label>
                        <AddressAutocomplete
                          id="new-address1"
                          value={newAddressDetails.address1}
                          onChange={(value) => {
                            // Only update address1 field when typing
                            handleAddressFieldChange('address1', value);
                          }}
                          onAddressSelect={(addressData) => {
                            // Update ALL fields when an address is selected from autocomplete
                            handleNewAddressSelected(addressData);
                          }}
                          onLoadingChange={setIsAddressLoading}
                          placeholder="Start typing an address..."
                          required
                        />
                      </div>

                      <div className="col-span-1">
                        <Label htmlFor="new-address2">Suite/Apt</Label>
                        <Input
                          id="new-address2"
                          value={newAddressDetails.address2}
                          onChange={(e) => handleAddressFieldChange('address2', e.target.value)}
                          placeholder="Apt 2B"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="new-city">City *</Label>
                        <Input
                          id="new-city"
                          value={newAddressDetails.city}
                          onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                          placeholder="City"
                          required
                          disabled={isAddressLoading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="new-state">State *</Label>
                        <Input
                          id="new-state"
                          value={newAddressDetails.state}
                          onChange={(e) => handleAddressFieldChange('state', e.target.value)}
                          placeholder="CA"
                          maxLength={2}
                          required
                          disabled={isAddressLoading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="new-zip">ZIP Code *</Label>
                        <Input
                          id="new-zip"
                          value={newAddressDetails.postal_code}
                          onChange={(e) => handleAddressFieldChange('postal_code', e.target.value)}
                          placeholder="90210"
                          required
                          disabled={isAddressLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Detailed Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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

              {/* GPS Location */}
              <div>
                <Label>GPS Location (Optional)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="gap-2"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    Capture Current Location
                  </Button>
                  {gpsCoords && (
                    <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      ✓ Location captured: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lon.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>

              {/* File Upload Section */}
              <div>
                <Label>Photos & Videos</Label>
                <p className="text-sm text-slate-600 mb-3">Upload photos, videos, or other documentation from this attempt</p>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploadingFile}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      {isUploadingFile ? (
                        <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-4" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                          <Plus className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <p className="text-slate-600 font-medium mb-2">
                        {isUploadingFile ? 'Uploading files...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-slate-500">
                        Photos, videos, PDFs, and documents up to 10MB each
                      </p>
                    </div>
                  </label>
                </div>

                {/* Display uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</Label>
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {file.content_type?.startsWith('image/') && (
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {file.content_type?.startsWith('video/') && (
                            <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {!file.content_type?.startsWith('image/') && !file.content_type?.startsWith('video/') && (
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                              <FileText className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.file_size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting} className="gap-2 px-8">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSubmitting ? 'Saving...' : 'Save Attempt'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
