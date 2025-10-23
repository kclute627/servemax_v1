
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Job, Client, Employee, CourtCase, Attempt, Document, CompanySettings, AffidavitTemplate, SystemAffidavitTemplate, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertTriangle, Printer, Pencil, Save, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AffidavitPreview from '../components/affidavit/AffidavitPreview';
import { generateAffidavit } from '@/api/functions';
import PhotoModal from '../components/affidavit/PhotoModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGlobalData } from '@/components/GlobalDataContext';
import { STARTER_TEMPLATES } from '@/utils/starterTemplates';

export default function GenerateAffidavitPage() {
  const { companyData } = useGlobalData();
  const [job, setJob] = useState(null);
  const [client, setClient] = useState(null);
  const [courtCase, setCourtCase] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [affidavitData, setAffidavitData] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [includeNotary, setIncludeNotary] = useState(false);
  const [includeCompanyInfo, setIncludeCompanyInfo] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null); // Changed initial state to null
  const [hasCompanyInfo, setHasCompanyInfo] = useState(false); // New state variable
  const [affidavitTemplates, setAffidavitTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('standard');
  const [selectedTemplate, setSelectedTemplate] = useState(null); // Full template object

  const location = useLocation();

  const allPhotosCount = attempts.flatMap(attempt => attempt.uploaded_files?.filter(file => file.content_type?.startsWith('image/')) || []).length;

  const loadData = useCallback(async (jobId) => {
    setIsLoading(true);
    setError(null);
    try {
      const jobData = await Job.findById(jobId);
      if (!jobData) throw new Error("Job not found.");

      console.log('[LoadData] Job ID:', jobId);
      console.log('[LoadData] Job Data:', jobData);
      console.log('[LoadData] Job company_id:', jobData.company_id);

      // Attempts are embedded in the job object, not separate documents
      const attemptsData = Array.isArray(jobData.attempts) ? jobData.attempts : [];
      console.log('[LoadData] Attempts from job object:', attemptsData);

      const [clientData, courtCaseData, documentsData, employeesData] = await Promise.all([
        jobData.client_id ? Client.findById(jobData.client_id) : null,
        jobData.court_case_id ? CourtCase.findById(jobData.court_case_id) : null,
        Document.filter({ job_id: jobId }).catch(e => { console.error("Error loading documents:", e); return []; }),
        Employee.list().catch(e => { console.error("Error loading employees:", e); return []; }),
      ]);

      console.log('[LoadData] Final attempts array:', attemptsData);

      setJob(jobData);
      setClient(clientData);
      setCourtCase(courtCaseData);
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

    } catch (e) {
      console.error("Failed to load affidavit data:", e);
      setError(e.message);
    }
    // setIsLoading(false); // Do not set loading to false here, wait for company info as well
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const companyInfoSettings = await CompanySettings.filter({ setting_key: "company_information" });
      if (companyInfoSettings.length > 0 && companyInfoSettings[0].setting_value) {
        const info = companyInfoSettings[0].setting_value;
        // Check if company info has meaningful data to display
        if (info.company_name || info.address1 || info.city || info.state || info.zip) {
          // Keep as object for the affidavit preview component
          setCompanyInfo(info);
          setHasCompanyInfo(true);
        }
      }
    } catch (error) {
      console.error("Error loading company info:", error);
    } finally {
      // Ensure loading state is turned off after all data is fetched
      setIsLoading(false);
    }
  };

  // Helper function to enrich fallback templates with HTML from starter templates
  const enrichFallbackTemplate = (template) => {
    const starterTemplate = STARTER_TEMPLATES[template.id];
    if (starterTemplate) {
      return {
        ...template,
        template_mode: 'html',
        html_content: starterTemplate.html,
        service_status: starterTemplate.service_status || 'both',
        description: starterTemplate.description,
      };
    }
    return template;
  };

  const loadAffidavitTemplates = async () => {
    try {
      // Load system templates (available to all companies)
      const systemTemplates = await SystemAffidavitTemplate.list();
      const systemTemplatesWithFlag = (systemTemplates || []).map(tmpl => ({
        ...tmpl,
        isSystem: true
      }));

      // Load company-specific templates
      let companyTemplates = [];
      if (companyData?.id) {
        companyTemplates = await AffidavitTemplate.filter({ company_id: companyData.id });
      }
      const companyTemplatesWithFlag = (companyTemplates || []).map(tmpl => ({
        ...tmpl,
        isSystem: false
      }));

      // Merge both lists
      const allTemplates = [...systemTemplatesWithFlag, ...companyTemplatesWithFlag];

      if (allTemplates.length > 0) {
        setAffidavitTemplates(allTemplates);
      } else {
        // Fallback: use a few defaults if no templates exist
        const fallbackTemplates = [
          { id: 'standard', name: 'Standard Affidavit Template', jurisdiction: 'General', isSystem: true },
          { id: 'ao440_federal', name: 'AO 440 Federal Proof of Service', jurisdiction: 'Federal', isSystem: true },
          { id: 'illinois', name: 'Illinois – Circuit Court Affidavit', jurisdiction: 'IL', isSystem: true },
          { id: 'california', name: 'California Proof of Service', jurisdiction: 'CA', isSystem: true },
          { id: 'due_diligence', name: 'Due Diligence with Attempts Table', jurisdiction: 'General', isSystem: true },
        ].map(enrichFallbackTemplate);

        setAffidavitTemplates(fallbackTemplates);
      }
    } catch (err) {
      console.error("Error loading affidavit templates:", err);
      // Fallback: use a few defaults
      const fallbackTemplates = [
        { id: 'standard', name: 'Standard Affidavit Template', jurisdiction: 'General', isSystem: true },
        { id: 'ao440_federal', name: 'AO 440 Federal Proof of Service', jurisdiction: 'Federal', isSystem: true },
        { id: 'illinois', name: 'Illinois – Circuit Court Affidavit', jurisdiction: 'IL', isSystem: true },
        { id: 'california', name: 'California Proof of Service', jurisdiction: 'CA', isSystem: true },
        { id: 'due_diligence', name: 'Due Diligence with Attempts Table', jurisdiction: 'General', isSystem: true },
      ].map(enrichFallbackTemplate);

      setAffidavitTemplates(fallbackTemplates);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobId = params.get('jobId');
    if (jobId) {
      // Set loading to true explicitly before starting both loads
      setIsLoading(true);
      loadData(jobId);
      loadCompanyInfo();
      loadAffidavitTemplates();

      // Load current user for server name fallback
      User.me().then(user => setCurrentUser(user)).catch(err => console.error("Error loading current user:", err));
    } else {
      setError("No Job ID provided.");
      setIsLoading(false);
    }
  }, [location.search, loadData]);

  // Auto-generate affidavit data when dependencies are loaded
  useEffect(() => {
    // Only proceed if job data is loaded AND companyInfo has been processed (either loaded or confirmed absent)
    if (!job || !courtCase || !attempts || !documents || !employees || (companyInfo === null && hasCompanyInfo)) return;
    
    const servedAttempts = attempts.filter(attempt => attempt.status === 'served');
    const latestServedAttempt = servedAttempts.length > 0
      ? servedAttempts.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date))[0]
      : (attempts.length > 0 ? attempts.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date))[0] : null);

    // Debug logging
    console.log('All Attempts:', attempts);
    console.log('Served Attempts:', servedAttempts);
    console.log('Latest Attempt:', latestServedAttempt);
    console.log('Attempt Date:', latestServedAttempt?.attempt_date);
    console.log('Company Info from state:', companyInfo);
    console.log('Company Data from context:', companyData);

    const serviceDocuments = documents.filter(doc => doc.document_category === 'to_be_served');

    let serverName = 'ServeMax Agent';
    let serverLicense = '';
    let serverObject = null;

    // Try to get server from attempt
    if (latestServedAttempt) {
        if (latestServedAttempt.server_id) {
            const server = employees.find(e => e.id === latestServedAttempt.server_id);
            if (server) {
                serverName = `${server.first_name} ${server.last_name}`;
                serverLicense = server.license_number || '';
                serverObject = server;
            } else {
                serverName = latestServedAttempt.server_name_manual || 'Unknown Server';
            }
        } else if (latestServedAttempt.server_name_manual) {
            serverName = latestServedAttempt.server_name_manual;
        }
    }

    // Fallback to current logged-in user if still default
    if (serverName === 'ServeMax Agent' && currentUser) {
        serverName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email || 'Unknown Server';
        // Try to find current user in employees list for license
        const currentUserEmployee = employees.find(e => e.email === currentUser.email || e.id === currentUser.id);
        if (currentUserEmployee) {
            serverLicense = currentUserEmployee.license_number || '';
            serverObject = currentUserEmployee;
        }
    }

    // Map service_type_detail to AO 440 service_method
    let serviceMethod = 'personal'; // default
    if (latestServedAttempt?.service_type_detail) {
      const serviceDetail = latestServedAttempt.service_type_detail.toLowerCase();
      if (serviceDetail.includes('personal')) {
        serviceMethod = 'personal';
      } else if (serviceDetail.includes('substitute') || serviceDetail.includes('residence')) {
        serviceMethod = 'residence';
      } else if (serviceDetail.includes('corporate') || serviceDetail.includes('organization')) {
        serviceMethod = 'organization';
      } else if (serviceDetail.includes('unexecuted') || serviceDetail.includes('unsuccessful')) {
        serviceMethod = 'unexecuted';
      } else {
        serviceMethod = 'other';
      }
    } else if (job.status === 'not_served') {
      serviceMethod = 'unexecuted';
    }

    // Determine default document title based on status
    const defaultTitle = job.status === 'served' ? 'AFFIDAVIT OF SERVICE' : 'AFFIDAVIT OF NON-SERVICE / DUE DILIGENCE';

    const data = {
      job: job,
      status: job.status,
      document_title: defaultTitle,
      recipient_name: job.recipient?.name || '',
      court_name: courtCase?.court_name || '',
      court_county: courtCase?.court_county || '',
      court_state: 'CA',
      case_caption: courtCase ? `${courtCase.plaintiff} v. ${courtCase.defendant}` : '',
      case_number: courtCase?.case_number || '',
      documents_served: serviceDocuments.map(doc => ({ title: doc.affidavit_text || doc.title })),
      service_date: latestServedAttempt?.attempt_date || '',
      service_time: latestServedAttempt?.attempt_date ? format(new Date(latestServedAttempt.attempt_date), 'h:mm a') : '',
      service_address: latestServedAttempt?.address_of_attempt || (job.addresses && job.addresses[0] ? `${job.addresses[0].address1}, ${job.addresses[0].city}, ${job.addresses[0].state} ${job.addresses[0].postal_code}` : ''),
      service_manner: latestServedAttempt?.service_type_detail ? (latestServedAttempt.service_type_detail.toLowerCase().includes('personal') ? 'personal' : latestServedAttempt.service_type_detail.toLowerCase().includes('substitute') ? 'substitute_abode' : latestServedAttempt.service_type_detail.toLowerCase().includes('corporate') ? 'corporate_agent' : 'other') : (job.status === 'served' ? 'personal' : 'non_service'),
      person_served_name: latestServedAttempt?.person_served_name || '',
      person_relationship: latestServedAttempt?.relationship_to_recipient || '',
      server_name: serverName,
      server_license_number: serverLicense,
      selected_photos: selectedPhotos,
      person_sex: latestServedAttempt?.person_served_sex || '',
      person_age: latestServedAttempt?.person_served_age || '',
      person_height: latestServedAttempt?.person_served_height || '',
      person_weight: latestServedAttempt?.person_served_weight || '',
      person_hair: latestServedAttempt?.person_served_hair_color || '',
      person_description_other: latestServedAttempt?.person_served_description || '',
      include_notary: includeNotary,
      include_company_info: includeCompanyInfo,
      company_info: companyInfo, // Object with company_name, address1, address2, city, state, zip, phone
      affidavit_template_id: selectedTemplateId,

      // Template data (send full template to backend to avoid Firestore lookup)
      template_mode: selectedTemplate?.template_mode || 'simple',
      html_content: selectedTemplate?.html_content || null,
      header_html: selectedTemplate?.header_html || null,
      footer_html: selectedTemplate?.footer_html || null,
      margin_top: selectedTemplate?.margin_top || null,
      margin_bottom: selectedTemplate?.margin_bottom || null,
      margin_left: selectedTemplate?.margin_left || null,
      margin_right: selectedTemplate?.margin_right || null,

      // Attempts data for advanced template usage
      attempts: attempts || [],
      successful_attempts: servedAttempts || [],
      successful_attempt: latestServedAttempt || null,

      // AO 440 Federal Template Specific Fields
      date_received: job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      service_method: serviceMethod,
      service_place: latestServedAttempt?.address_of_attempt || (job.addresses && job.addresses[0] ? `${job.addresses[0].address1}, ${job.addresses[0].city}, ${job.addresses[0].state} ${job.addresses[0].postal_code}` : ''),

      // Residence service fields
      residence_recipient: job.recipient?.name || '',
      residence_person_name: latestServedAttempt?.person_served_name || '',
      residence_person: latestServedAttempt?.person_served_name || '',
      residence_date: latestServedAttempt?.attempt_date || '',
      residence_address: latestServedAttempt?.address_of_attempt || '',
      residence_relationship: latestServedAttempt?.relationship_to_recipient || '',

      // Organization service fields
      organization_agent: latestServedAttempt?.person_served_name || '',
      organization_name: job.recipient?.name || '',
      organization_date: latestServedAttempt?.attempt_date || '',

      // Unexecuted service fields
      unexecuted_recipient: job.recipient?.name || '',
      unexecuted_reason: latestServedAttempt?.notes || 'Unable to complete service',

      // Other service fields
      other_recipient: job.recipient?.name || '',
      other_description: latestServedAttempt?.service_type_detail || '',
      other_details: latestServedAttempt?.notes || '',

      // Server information for AO 440
      server_printed_name: serverName,
      server_title: serverLicense ? `Process Server - License #${serverLicense}` : 'Process Server',
      server_name_and_title: serverLicense ? `${serverName}, Process Server - License #${serverLicense}` : `${serverName}, Process Server`,
      server_address: (companyInfo || companyData) ? `${(companyInfo?.address1 || companyData?.address || '')}${(companyInfo?.address2 || companyData?.address2) ? ', ' + (companyInfo?.address2 || companyData?.address2) : ''}, ${(companyInfo?.city || companyData?.city || '')}, ${(companyInfo?.state || companyData?.state || '')} ${(companyInfo?.zip || companyData?.zip || '')}`.trim() : (serverObject ? `${serverObject.address1 || ''}${serverObject.address2 ? ', ' + serverObject.address2 : ''}, ${serverObject.city || ''}, ${serverObject.state || ''} ${serverObject.postal_code || ''}`.trim() : ''),

      // Fee fields
      travel_fee: '',
      service_fee: '',
      total_fee: '0.00',

      // Additional info
      additional_info: latestServedAttempt?.notes || '',
    };

    console.log('Service Date being set:', data.service_date);
    console.log('Server Address being set:', data.server_address);
    console.log('Server Name and Title:', data.server_name_and_title);

    setAffidavitData(data);
  }, [job, client, courtCase, attempts, documents, employees, selectedPhotos, includeNotary, includeCompanyInfo, companyInfo, hasCompanyInfo, selectedTemplateId, selectedTemplate, currentUser]);

  // Smart auto-select template based on court location with priority matching
  useEffect(() => {
    if (courtCase?.court_state && affidavitTemplates.length > 0) {
      let match = null;

      // Filter templates by service status first (served, not_served, or both)
      const jobStatus = job?.status; // 'served' or 'not_served'
      const applicableTemplates = affidavitTemplates.filter(t =>
        !t.service_status ||
        t.service_status === 'both' ||
        t.service_status === jobStatus
      );

      // Priority 1: Exact match with county (e.g., "IL" + "Cook County")
      if (courtCase.court_county) {
        match = applicableTemplates.find(t =>
          t.jurisdiction?.toLowerCase() === courtCase.court_state.toLowerCase() &&
          t.county?.toLowerCase() === courtCase.court_county.toLowerCase()
        );
      }

      // Priority 2: State match with specific court type
      if (!match && courtCase.court_name) {
        match = applicableTemplates.find(t =>
          t.jurisdiction?.toLowerCase() === courtCase.court_state.toLowerCase() &&
          t.court_type && courtCase.court_name.toLowerCase().includes(t.court_type.toLowerCase())
        );
      }

      // Priority 3: State match, no county/court type specified (general state template)
      if (!match) {
        match = applicableTemplates.find(t =>
          t.jurisdiction?.toLowerCase() === courtCase.court_state.toLowerCase() &&
          !t.county &&
          !t.court_type
        );
      }

      // Priority 4: Any state match
      if (!match) {
        match = applicableTemplates.find(t =>
          t.jurisdiction?.toLowerCase() === courtCase.court_state.toLowerCase()
        );
      }

      // Priority 5: General/universal template
      if (!match) {
        match = applicableTemplates.find(t =>
          t.jurisdiction?.toLowerCase() === 'general' ||
          t.name?.toLowerCase().includes('universal') ||
          t.name?.toLowerCase().includes('general')
        );
      }

      if (match) {
        setSelectedTemplateId(match.id);
      }
    }
  }, [courtCase, affidavitTemplates, job]);

  // Update selected template object when ID changes
  useEffect(() => {
    if (selectedTemplateId && affidavitTemplates.length > 0) {
      const template = affidavitTemplates.find(t => t.id === selectedTemplateId);
      setSelectedTemplate(template || null);

      // Set default include flags from template if available
      if (template) {
        if (template.include_notary_default !== undefined) {
          setIncludeNotary(template.include_notary_default);
        }
        if (template.include_company_info_default !== undefined && hasCompanyInfo) {
          setIncludeCompanyInfo(template.include_company_info_default);
        }
      }
    }
  }, [selectedTemplateId, affidavitTemplates, hasCompanyInfo]);

  const handlePrint = async () => {
    if (isEditing) {
      alert("Please save your changes before printing.");
      return;
    }
    if (!affidavitData) {
      alert("Affidavit data is not ready to print.");
      return;
    }

    // Validate AO 440 form if that template is selected
    const isAO440Template = selectedTemplateId === 'ao440_federal' ||
                            selectedTemplate?.name?.includes('AO 440') ||
                            selectedTemplate?.name?.includes('Federal Proof of Service');

    if (isAO440Template) {
      const validationErrors = validateAO440Form();
      if (validationErrors.length > 0) {
        const errorMessage = "Please complete all required fields before printing:\n\n" +
                            validationErrors.map((err, i) => `${i + 1}. ${err}`).join('\n');
        alert(errorMessage);
        return;
      }
    }

    setIsGenerating(true);
    try {
      console.log('=== PDF Generation Debug ===');
      console.log('Affidavit Data:', affidavitData);
      console.log('Selected Template:', selectedTemplate);
      console.log('Template Mode:', selectedTemplate?.template_mode);
      console.log('HTML Content length:', selectedTemplate?.html_content?.length);

      const response = await generateAffidavit(affidavitData);
      console.log('PDF Response:', response);

      // Convert response.data object to Uint8Array
      const pdfData = response.data;
      const uint8Array = new Uint8Array(Object.keys(pdfData).length);
      for (let i = 0; i < uint8Array.length; i++) {
        uint8Array[i] = pdfData[i];
      }

      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      console.log('PDF Blob size:', blob.size, 'bytes');
      console.log('PDF Blob type:', blob.type);

      const fileName = `affidavit_${job?.job_number || 'service'}_${selectedTemplateId}.pdf`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

    } catch (error) {
      console.error("Failed to generate or print affidavit:", error);
      alert("Error generating PDF: " + (error.message || "An unexpected error occurred."));
    }
    setIsGenerating(false);
  };

  const handleAffidavitDataChange = (field, value) => {
    // Special handling for AO 440 fields - merge them into affidavitData
    if (field === 'ao440_fields') {
      setAffidavitData(prev => ({...prev, ...value}));
    } else {
      setAffidavitData(prev => ({...prev, [field]: value}));
    }
  };

  // Validate AO 440 form before printing
  const validateAO440Form = () => {
    const errors = [];

    if (!affidavitData.case_number?.trim()) {
      errors.push('Case number is required');
    }

    if (!affidavitData.server_name?.trim()) {
      errors.push('Server name is required');
    }

    const serviceMethod = affidavitData.service_method;

    switch (serviceMethod) {
      case 'personal':
        if (!affidavitData.recipient_name?.trim()) errors.push('Recipient name is required for personal service');
        if (!affidavitData.date_received?.trim()) errors.push('Date is required for personal service');
        if (!affidavitData.service_place?.trim()) errors.push('Place of service is required for personal service');
        break;

      case 'residence':
        if (!affidavitData.residence_recipient?.trim()) errors.push('Recipient name is required for residence service');
        if (!affidavitData.residence_person_name?.trim()) errors.push('Person served name is required for residence service');
        if (!affidavitData.residence_date?.trim()) errors.push('Date is required for residence service');
        if (!affidavitData.residence_address?.trim()) errors.push('Address is required for residence service');
        if (!affidavitData.residence_relationship?.trim()) errors.push('Relationship is required for residence service');
        break;

      case 'organization':
        if (!affidavitData.organization_agent?.trim()) errors.push('Agent name is required for organization service');
        if (!affidavitData.organization_name?.trim()) errors.push('Organization name is required for organization service');
        if (!affidavitData.organization_date?.trim()) errors.push('Date is required for organization service');
        break;

      case 'unexecuted':
        if (!affidavitData.unexecuted_recipient?.trim()) errors.push('Recipient name is required for unexecuted service');
        if (!affidavitData.unexecuted_reason?.trim()) errors.push('Reason is required for unexecuted service');
        break;

      case 'other':
        if (!affidavitData.other_recipient?.trim()) errors.push('Recipient name is required for other service method');
        if (!affidavitData.other_description?.trim()) errors.push('Description is required for other service method');
        break;
    }

    return errors;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Error Loading Data</h2>
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

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=0.5, user-scalable=yes" />
      
      <div className="min-h-screen bg-slate-200">
        <PhotoModal
          open={isPhotoModalOpen}
          onOpenChange={setIsPhotoModalOpen}
          attempts={attempts}
          selectedPhotos={selectedPhotos}
          onPhotosChange={setSelectedPhotos}
        />
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-slate-100 border-b border-slate-300 p-4 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to={job ? createPageUrl(`JobDetails?id=${job.id}`) : createPageUrl('Jobs')}>
                  <Button variant="outline" size="icon">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Generate Affidavit</h1>
                  <p className="text-sm text-slate-600">Job #{job?.job_number} - True WYSIWYG Preview</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (allPhotosCount > 0) setIsPhotoModalOpen(true);
                        }}
                        disabled={allPhotosCount === 0}
                        className="gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Photos
                        {selectedPhotos.length > 0 && (
                          <Badge variant="secondary" className="ml-1">{selectedPhotos.length}</Badge>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {allPhotosCount === 0 && (
                    <TooltipContent>
                      <p>No photos available to attach.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <Button 
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-2"
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  {isEditing ? 'Save' : 'Edit'}
                </Button>
                <Button 
                  onClick={handlePrint} 
                  disabled={!affidavitData || isGenerating || isEditing}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      Print PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-start gap-x-6 gap-y-4 pt-4 border-t w-full">
               <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-notary"
                  checked={includeNotary}
                  onChange={(e) => setIncludeNotary(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="include-notary" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  Include Notary Block
                </label>
              </div>

              {hasCompanyInfo && ( // Only render if company info is available
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include-company-info"
                    checked={includeCompanyInfo}
                    onChange={(e) => setIncludeCompanyInfo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="include-company-info" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                    Include Company Info
                  </label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Label htmlFor="affidavit-type" className="text-sm font-medium text-slate-700">
                  Affidavit Type:
                </Label>
                <select
                  id="affidavit-type"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="text-sm border border-slate-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500 min-w-[280px]"
                >
                  {/* System Templates Group */}
                  {affidavitTemplates.filter(t => t.isSystem).length > 0 && (
                    <optgroup label="System Templates (Available to All)">
                      {affidavitTemplates
                        .filter(t => t.isSystem)
                        .sort((a, b) => (a.jurisdiction || '').localeCompare(b.jurisdiction || ''))
                        .map(template => (
                          <option key={template.id} value={template.id}>
                            {template.jurisdiction ? `[${template.jurisdiction}] ` : ''}
                            {template.name}
                          </option>
                        ))
                      }
                    </optgroup>
                  )}

                  {/* Company Templates Group */}
                  {affidavitTemplates.filter(t => !t.isSystem).length > 0 && (
                    <optgroup label="My Company Templates">
                      {affidavitTemplates
                        .filter(t => !t.isSystem)
                        .map(template => (
                          <option key={template.id} value={template.id}>
                            {template.jurisdiction ? `[${template.jurisdiction}] ` : ''}
                            {template.name}
                          </option>
                        ))
                      }
                    </optgroup>
                  )}

                  {/* Fallback if no templates */}
                  {affidavitTemplates.length === 0 && (
                    <option value="general">General Template</option>
                  )}
                </select>
              </div>

              {/* The Textarea for editing company info is removed as it's now loaded from settings */}
            </div>
          </div>
        </div>

        {/* Main Content - Actual Paper Size Preview */}
        <main className="overflow-auto p-6">
          <div className="flex justify-center">
            {/* Exact PDF dimensions: 612pt x 792pt (8.5in x 11in at 72dpi) */}
            <div 
              className="bg-white shadow-2xl" 
              style={{ 
                width: '612pt', 
                height: '792pt',
                minWidth: '612pt',
                minHeight: '792pt'
              }}
            >
              {affidavitData ? (
                <AffidavitPreview
                  affidavitData={affidavitData}
                  template={selectedTemplate}
                  isEditing={isEditing}
                  onDataChange={handleAffidavitDataChange}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
