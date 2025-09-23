
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Job, Employee, Attempt, User, Client } from '@/api/entities'; // Client imported as per outline
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Clock,
  MapPin,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import DocumentUpload from '../components/jobs/DocumentUpload';

const attemptStatusOptions = [
  { value: "served", label: "Successfully Served", icon: CheckCircle, color: "text-green-600" },
  { value: "not_served", label: "Not Served", icon: XCircle, color: "text-red-600" },
  { value: "contact_made", label: "Contact Made", icon: UserIcon, color: "text-blue-600" },
  { value: "vacant", label: "Property Vacant", icon: XCircle, color: "text-orange-600" },
  { value: "bad_address", label: "Bad Address", icon: MapPin, color: "text-red-600" },
];

const initialFormData = {
  job_id: "", // Will be filled by loadJobData
  server_id: "manual", // Default to manual selection
  server_name_manual: "",
  attempt_date: "", // Will be filled by loadJobData
  attempt_time: "", // Will be filled by loadJobData
  address_of_attempt: "", // Will be filled by loadJobData
  notes: "",
  status: "not_served", // Default status
  service_type_detail: "No Answer", // Default service type
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
  const [client, setClient] = useState(null); // Added client state as per outline
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // New state for edit mode and uploaded files
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAttemptId, setEditingAttemptId] = useState(null); // Renamed from attemptId in original, to match outline
  const [uploadedFiles, setUploadedFiles] = useState([]); // Separate state for uploaded files as per outline

  // Form state managed by formData
  const [formData, setFormData] = useState(initialFormData);

  // Generic handler for form field changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Effect to fetch current user and pre-fill server info (remains mostly same)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        // Pre-fill server name if user is an employee and no server is set yet
        // This logic needs to be careful not to overwrite existing server data when editing
        if (!formData.server_id || formData.server_id === "manual" && !formData.server_name_manual) {
          const employeeRecord = await Employee.filter({ email: user.email });
          if (employeeRecord.length > 0) {
            setFormData(prev => ({
              ...prev,
              server_name_manual: `${employeeRecord[0].first_name} ${employeeRecord[0].last_name}`,
              server_id: employeeRecord[0].id
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              server_name_manual: user.full_name || ''
            }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch current user", e);
      }
    };
    fetchUser();
  }, [formData.server_id, formData.server_name_manual]); // Added dependencies to re-run if server info changes

  // Main data loading function (replaces loadInitialData)
  const loadJobData = useCallback(async (jobId, attemptId = null) => {
    setIsLoading(true);
    try {
      const [jobData, employeesData] = await Promise.all([
        Job.get(jobId),
        Employee.list()
      ]);

      if (!jobData) {
        throw new Error("Job not found");
      }

      const clientData = jobData.client_id ? await Client.get(jobData.client_id) : null;
      
      setJob(jobData);
      setClient(clientData); // Set client data
      setEmployees(employeesData || []);

      if (attemptId) {
        // Edit mode: load existing attempt data
        try {
          const attemptData = await Attempt.get(attemptId);
          if (attemptData) {
            const attemptDateTime = new Date(attemptData.attempt_date);
            setFormData({
              job_id: attemptData.job_id,
              server_id: attemptData.server_id || "manual",
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
            setUploadedFiles(attemptData.uploaded_files || []); // Set separate uploadedFiles state
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
        if (jobData.addresses?.length > 0) {
          const primaryAddress = jobData.addresses.find(a => a.primary) || jobData.addresses[0];
          defaultAddress = `${primaryAddress.address1}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.postal_code}`;
        }
        setFormData(prev => ({
          ...prev,
          job_id: jobData.id,
          attempt_date: now.toISOString().split('T')[0],
          attempt_time: now.toTimeString().slice(0, 5),
          address_of_attempt: defaultAddress,
        }));
        setUploadedFiles([]); // Ensure uploadedFiles is empty for new attempts
      }

    } catch (error) {
      console.error("Error loading data:", error);
      setError("Error loading job data: " + error.message);
      alert("Error loading job data: " + error.message);
      navigate(createPageUrl("Jobs"));
    }
    setIsLoading(false);
  }, []); // Changed dependency array from [navigate] to [] to fix warning. `navigate` is stable from `useNavigate` and does not need to be a dependency.


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
  }, [location.search, navigate, loadJobData]); // Added loadJobData to dependencies, as it's now a stable function


  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoading(true); // Using isLoading for location fetching, could be separate
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          gps_lat: position.coords.latitude,
          gps_lon: position.coords.longitude,
        }));
        setIsLoading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location.");
        setIsLoading(false);
      }
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
    if (!formData.attempt_date || !formData.attempt_time) {
      alert("Please enter both a date and time for the attempt.");
      return;
    }

    setIsSubmitting(true);

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

    if (!formData.address_of_attempt || !formData.address_of_attempt.trim()) {
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
        ...serverData,
        attempt_date: combinedDateTime.toISOString(),
        address_of_attempt: formData.address_of_attempt,
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

      if (isEditMode && editingAttemptId) {
        await Attempt.update(editingAttemptId, attemptData);
      } else {
        await Attempt.create(attemptData);
      }

      // --- UPDATE JOB STATUS ---
      const allAttempts = await Attempt.filter({ job_id: job.id });
      const hasServedAttempt = allAttempts.some(a => a.status === 'served');

      let newJobStatus;
      let serviceDate = null;
      let serviceMethod = null;

      if (hasServedAttempt) {
        newJobStatus = 'served';
        const servedAttempt = allAttempts.find(a => a.status === 'served');
        serviceDate = servedAttempt ? servedAttempt.attempt_date : null;
        const serviceTypeLower = servedAttempt?.service_type_detail?.toLowerCase() || '';
        serviceMethod = serviceTypeLower.includes('personal') ? 'personal' :
                        serviceTypeLower.includes('substitute') ? 'substituted' : 'other';
      } else if (allAttempts.length > 0) {
        newJobStatus = 'in_progress';
      } else if (job.assigned_server_id && job.assigned_server_id !== 'unassigned') {
        newJobStatus = 'assigned';
      } else {
        newJobStatus = 'pending';
      }

      // Add activity log entry
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        user_name: currentUser?.full_name || "System",
        event_type: isEditMode ? "attempt_updated" : "attempt_logged",
        description: `Service attempt ${isEditMode ? 'updated' : 'logged'}: ${formData.status === 'served' ? 'Successfully served' : formData.service_type_detail}`
      };

      const jobToUpdate = await Job.get(job.id); // Fetch latest job data for activity log
      const currentActivityLog = Array.isArray(jobToUpdate?.activity_log) ? jobToUpdate.activity_log : [];

      const jobUpdatePayload = {
        status: newJobStatus,
        activity_log: [...currentActivityLog, newLogEntry],
      };

      if (serviceDate) jobUpdatePayload.service_date = serviceDate;
      if (serviceMethod) jobUpdatePayload.service_method = serviceMethod;

      await Job.update(job.id, jobUpdatePayload);
      // --- END JOB UPDATE ---

      navigate(`${createPageUrl('JobDetails')}?id=${job.id}&success=attempt_saved`);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8 max-w-4xl mx-auto"> {/* Max-width changed to 4xl as per outline */}
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
            <p className="text-slate-600 mt-1">Job #{job.job_number} - {job.recipient?.name}</p>
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
                  value={formData.server_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, server_id: value }));
                    if (value !== 'manual') {
                      setFormData(prev => ({ ...prev, server_name_manual: '' }));
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
                    onClick={() => setFormData(prev => ({ ...prev, status: 'served', service_type_detail: '' }))} // Clear detail on status change
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
                    onClick={() => setFormData(prev => ({ ...prev, status: 'not_served', service_type_detail: 'No Answer' }))} // Default to 'No Answer' for not served
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

              {/* Service Type Detail Input (Simplified, no dynamic options from CompanySettings) */}
              <div>
                <Label htmlFor="service-type-detail">Service Type Detail</Label>
                <Input
                  id="service-type-detail"
                  name="service_type_detail"
                  value={formData.service_type_detail}
                  onChange={handleInputChange}
                  placeholder={formData.status === 'served' ? "e.g., Personal Service, Substitute Service" : "e.g., No Answer, Vacant, Not Found"}
                  className="mt-1 h-12"
                  required={formData.status === 'served'}
                />
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

              {/* Address Input (Simplified, no autocomplete or multiple address selection) */}
              <div>
                <Label htmlFor="address-of-attempt">Address of Attempt</Label>
                <Input
                  id="address-of-attempt"
                  name="address_of_attempt"
                  value={formData.address_of_attempt}
                  onChange={handleInputChange}
                  placeholder="Enter the full address of the attempt"
                  required
                  className="mt-1 h-12"
                />
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

              {/* GPS Location */}
              <div>
                <Label>GPS Location (Optional)</Label>
                <div className="flex items-center gap-4 mt-2">
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
                    Capture Current Location
                  </Button>
                  {formData.gps_lat && formData.gps_lon && (
                    <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      ✓ Location captured: {formData.gps_lat.toFixed(4)}, {formData.gps_lon.toFixed(4)}
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
