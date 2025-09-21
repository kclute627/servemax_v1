
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Job, Client, Employee, CourtCase, Attempt, Document } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, Printer, Pencil, Save, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AffidavitPreview from '../components/affidavit/AffidavitPreview';
import { generateAffidavit } from '@/api/functions';
import PhotoModal from '../components/affidavit/PhotoModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function GenerateAffidavitPage() {
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

  const location = useLocation();

  const allPhotosCount = attempts.flatMap(attempt => attempt.uploaded_files?.filter(file => file.content_type?.startsWith('image/')) || []).length;

  const loadData = useCallback(async (jobId) => {
    setIsLoading(true);
    setError(null);
    try {
      const jobData = await Job.get(jobId);
      if (!jobData) throw new Error("Job not found.");

      const [clientData, courtCaseData, attemptsData, documentsData, employeesData] = await Promise.all([
        jobData.client_id ? Client.get(jobData.client_id) : null,
        jobData.court_case_id ? CourtCase.get(jobData.court_case_id) : null,
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
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobId = params.get('jobId');
    if (jobId) {
      loadData(jobId);
    } else {
      setError("No Job ID provided.");
      setIsLoading(false);
    }
  }, [location.search, loadData]);

  // Auto-generate affidavit data when dependencies are loaded
  useEffect(() => {
    if (!job || !courtCase || !attempts || !documents || !employees) return;
    
    const servedAttempts = attempts.filter(attempt => attempt.status === 'served');
    const latestServedAttempt = servedAttempts.length > 0 
      ? servedAttempts.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date))[0]
      : (attempts.length > 0 ? attempts.sort((a, b) => new Date(b.attempt_date) - new Date(a.attempt_date))[0] : null);

    const serviceDocuments = documents.filter(doc => doc.document_category === 'to_be_served');

    let serverName = 'ServeMax Agent';
    if (latestServedAttempt) {
        if (latestServedAttempt.server_id) {
            const server = employees.find(e => e.id === latestServedAttempt.server_id);
            if (server) {
                serverName = `${server.first_name} ${server.last_name}`;
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
      document_title: defaultTitle, // Add document title field
      recipient_name: job.recipient?.name || '',
      court_name: courtCase?.court_name || '',
      court_county: courtCase?.court_county || '',
      court_state: 'CA',
      case_caption: courtCase ? `${courtCase.plaintiff} v. ${courtCase.defendant}` : '',
      case_number: courtCase?.case_number || '',
      documents_served: serviceDocuments.map(doc => ({ title: doc.affidavit_text || doc.title })),
      service_date: latestServedAttempt?.attempt_date ? new Date(latestServedAttempt.attempt_date).toISOString().split('T')[0] : '',
      service_time: latestServedAttempt?.attempt_date ? new Date(latestServedAttempt.attempt_date).toTimeString().split(' ')[0].substring(0, 5) : '',
      service_address: latestServedAttempt?.address_of_attempt || (job.addresses && job.addresses[0] ? `${job.addresses[0].address1}, ${job.addresses[0].city}, ${job.addresses[0].state} ${job.addresses[0].postal_code}` : ''),
      service_manner: latestServedAttempt?.service_type_detail ? (latestServedAttempt.service_type_detail.toLowerCase().includes('personal') ? 'personal' : latestServedAttempt.service_type_detail.toLowerCase().includes('substitute') ? 'substitute_abode' : latestServedAttempt.service_type_detail.toLowerCase().includes('corporate') ? 'corporate_agent' : 'other') : (job.status === 'served' ? 'personal' : 'non_service'),
      person_served_name: latestServedAttempt?.person_served_name || '',
      person_relationship: latestServedAttempt?.relationship_to_recipient || '',
      server_name: serverName,
      selected_photos: selectedPhotos,
      person_sex: latestServedAttempt?.person_served_sex || '',
      person_age: latestServedAttempt?.person_served_age || '',
      person_height: latestServedAttempt?.person_served_height || '',
      person_weight: latestServedAttempt?.person_served_weight || '',
      person_hair: latestServedAttempt?.person_served_hair_color || '',
      person_description_other: latestServedAttempt?.person_served_description || ''
    };
    
    setAffidavitData(data);
  }, [job, client, courtCase, attempts, documents, employees, selectedPhotos]);
  
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
      const fileName = `affidavit-${job?.job_number || 'service'}.pdf`;

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
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <PhotoModal
        open={isPhotoModalOpen}
        onOpenChange={setIsPhotoModalOpen}
        attempts={attempts}
        selectedPhotos={selectedPhotos}
        onPhotosChange={setSelectedPhotos}
      />
      
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 sticky top-0 bg-slate-100/80 backdrop-blur-sm py-4 z-10 rounded-lg">
        <div className="flex items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link to={job ? createPageUrl(`JobDetails?id=${job.id}`) : createPageUrl('Jobs')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Generate Affidavit
              </h1>
              <p className="text-slate-600">For Job #{job?.job_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* The div wrapper enables the tooltip even when the button is disabled. */}
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
                    Attach Photos
                    {selectedPhotos.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{selectedPhotos.length}</Badge>
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
      </div>

      {/* Main Content - Affidavit Preview */}
      <main className="flex justify-center">
        <div className="w-full max-w-[8.5in] bg-white shadow-2xl rounded-lg aspect-[8.5/11]">
          {affidavitData ? (
            <AffidavitPreview 
              affidavitData={affidavitData} 
              isEditing={isEditing}
              onDataChange={handleAffidavitDataChange}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
               <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
