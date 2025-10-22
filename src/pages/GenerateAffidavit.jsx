
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Job, Client, Employee, CourtCase, Attempt, Document, CompanySettings, AffidavitTemplate, SystemAffidavitTemplate } from '@/api/entities';
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

export default function GenerateAffidavitPage() {
  const { companyData } = useGlobalData();
  const [job, setJob] = useState(null);
  const [client, setClient] = useState(null);
  const [courtCase, setCourtCase] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
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
  const [selectedTemplateId, setSelectedTemplateId] = useState('general');
  const [selectedTemplate, setSelectedTemplate] = useState(null); // Full template object

  const location = useLocation();

  const allPhotosCount = attempts.flatMap(attempt => attempt.uploaded_files?.filter(file => file.content_type?.startsWith('image/')) || []).length;

  const loadData = useCallback(async (jobId) => {
    setIsLoading(true);
    setError(null);
    try {
      const jobData = await Job.findById(jobId);
      if (!jobData) throw new Error("Job not found.");

      const [clientData, courtCaseData, attemptsData, documentsData, employeesData] = await Promise.all([
        jobData.client_id ? Client.findById(jobData.client_id) : null,
        jobData.court_case_id ? CourtCase.findById(jobData.court_case_id) : null,
        Attempt.filter({ job_id: jobId }).catch(e => { console.error("Error loading attempts:", e); return []; }),
        Document.filter({ job_id: jobId }).catch(e => { console.error("Error loading documents:", e); return []; }),
        Employee.list().catch(e => { console.error("Error loading employees:", e); return []; }),
      ]);

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
        setAffidavitTemplates([
          { id: 'general', name: 'General Affidavit Template', jurisdiction: 'General', isSystem: true },
          { id: 'illinois', name: 'Illinois – Circuit Court Affidavit', jurisdiction: 'IL', isSystem: true },
          { id: 'california', name: 'California Proof of Service', jurisdiction: 'CA', isSystem: true },
          { id: 'texas', name: 'Texas Affidavit of Service', jurisdiction: 'TX', isSystem: true },
        ]);
      }
    } catch (err) {
      console.error("Error loading affidavit templates:", err);
      // Fallback: use a few defaults
      setAffidavitTemplates([
        { id: 'general', name: 'General Affidavit Template', jurisdiction: 'General', isSystem: true },
        { id: 'illinois', name: 'Illinois – Circuit Court Affidavit', jurisdiction: 'IL', isSystem: true },
        { id: 'california', name: 'California Proof of Service', jurisdiction: 'CA', isSystem: true },
        { id: 'texas', name: 'Texas Affidavit of Service', jurisdiction: 'TX', isSystem: true },
      ]);
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

    const serviceDocuments = documents.filter(doc => doc.document_category === 'to_be_served');

    let serverName = 'ServeMax Agent';
    let serverLicense = '';
    if (latestServedAttempt) {
        if (latestServedAttempt.server_id) {
            const server = employees.find(e => e.id === latestServedAttempt.server_id);
            if (server) {
                serverName = `${server.first_name} ${server.last_name}`;
                serverLicense = server.license_number || '';
            } else {
                serverName = latestServedAttempt.server_name_manual || 'Unknown Server';
            }
        } else if (latestServedAttempt.server_name_manual) {
            serverName = latestServedAttempt.server_name_manual;
        }
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
      service_date: latestServedAttempt?.attempt_date ? new Date(latestServedAttempt.attempt_date).toISOString().split('T')[0] : '',
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

      // Attempts data for advanced template usage
      attempts: attempts || [],
      successful_attempts: servedAttempts || [],
      successful_attempt: latestServedAttempt || null,
    };

    setAffidavitData(data);
  }, [job, client, courtCase, attempts, documents, employees, selectedPhotos, includeNotary, includeCompanyInfo, companyInfo, hasCompanyInfo, selectedTemplateId]);

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
    setIsGenerating(true);
    try {
      const response = await generateAffidavit(affidavitData);

      const blob = new Blob([response.data], { type: 'application/pdf' });
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
    setAffidavitData(prev => ({...prev, [field]: value}));
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
