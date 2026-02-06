import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  User as UserIcon,
  FileText,
  ClipboardList,
  Building2,
  Phone,
  AlertCircle,
  CheckCircle,
  PenLine,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import JobNotesThread from "@/components/jobs/JobNotesThread";

// Status badge colors
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  served: "bg-green-100 text-green-800",
  unable_to_serve: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800"
};

export default function ICJobDetails() {
  const { jobId } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
    }
  }, [jobId]);

  const loadJobDetails = async () => {
    setIsLoading(true);
    try {
      // Get job
      const jobDoc = await getDoc(doc(db, "jobs", jobId));
      if (!jobDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Job not found",
          description: "This job may have been deleted."
        });
        navigate("/ic/jobs");
        return;
      }

      const jobData = { id: jobDoc.id, ...jobDoc.data() };

      // Verify this job is assigned to the current IC user
      if (jobData.assigned_server_id !== user.uid) {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "You don't have access to this job."
        });
        navigate("/ic/jobs");
        return;
      }

      setJob(jobData);

      // Get company
      if (jobData.company_id) {
        const companyDoc = await getDoc(doc(db, "companies", jobData.company_id));
        if (companyDoc.exists()) {
          setCompany({ id: companyDoc.id, ...companyDoc.data() });
        }
      }

      // Get attempts
      const attemptsQuery = query(
        collection(db, "attempts"),
        where("job_id", "==", jobId),
        orderBy("created_at", "desc")
      );
      const attemptsSnap = await getDocs(attemptsQuery);
      setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Get documents (affidavits for signing)
      const docsQuery = query(
        collection(db, "documents"),
        where("job_id", "==", jobId),
        where("document_category", "==", "affidavit")
      );
      const docsSnap = await getDocs(docsQuery);
      setDocuments(docsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error("Error loading job details:", error);
      toast({
        variant: "destructive",
        title: "Error loading job",
        description: "Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const d = typeof date === 'string' ? new Date(date) : date.toDate?.() || new Date(date);
      return format(d, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateShort = (date) => {
    if (!date) return "N/A";
    try {
      const d = typeof date === 'string' ? new Date(date) : date.toDate?.() || new Date(date);
      return format(d, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const serverPay = job.server_pay_items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ic/jobs")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Job #{job.job_number || job.id.slice(0, 8)}
              </h1>
              <Badge className={STATUS_COLORS[job.status] || STATUS_COLORS.pending}>
                {job.status?.replace(/_/g, ' ') || 'Pending'}
              </Badge>
            </div>
            <p className="text-slate-600 mt-1">
              Assigned by {company?.name || company?.company_name || 'Unknown Company'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipient & Service Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Recipient & Service Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Recipient Name</p>
                <p className="font-medium">{job.recipient_name || 'Not specified'}</p>
                {job.recipient_type && (
                  <Badge variant="outline" className="mt-1">
                    {job.recipient_type}
                  </Badge>
                )}
              </div>

              {job.addresses?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Service Address(es)</p>
                  {job.addresses.map((addr, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                      <div>
                        <p className="font-medium">{addr.label || `Address ${i + 1}`}</p>
                        <p className="text-slate-600">
                          {addr.address1}
                          {addr.address2 && `, ${addr.address2}`}
                        </p>
                        <p className="text-slate-600">
                          {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                        {addr.primary && (
                          <Badge variant="secondary" className="mt-1">Primary</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {job.service_instructions && (
                <div>
                  <p className="text-sm text-slate-500">Service Instructions</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{job.service_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Attempts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Service Attempts
                </CardTitle>
                <CardDescription>
                  {attempts.length} attempt{attempts.length !== 1 ? 's' : ''} recorded
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate(`/ic/log-attempt/${jobId}`)}
                disabled={job.status === 'served' || job.status === 'cancelled'}
              >
                <PenLine className="w-4 h-4 mr-2" />
                Log Attempt
              </Button>
            </CardHeader>
            <CardContent>
              {attempts.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No attempts logged yet</p>
              ) : (
                <div className="space-y-4">
                  {attempts.map((attempt, i) => (
                    <div key={attempt.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Attempt #{attempts.length - i}</span>
                        <Badge className={
                          attempt.status === 'served'
                            ? 'bg-green-100 text-green-700'
                            : attempt.status === 'unable_to_serve'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }>
                          {attempt.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDate(attempt.attempt_date || attempt.created_at)}
                        </p>
                        {attempt.notes && (
                          <p className="mt-2">{attempt.notes}</p>
                        )}
                        {attempt.person_served && (
                          <p className="mt-2 font-medium">
                            Served to: {attempt.person_served.name}
                            {attempt.person_served.relationship && ` (${attempt.person_served.relationship})`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Affidavits */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Affidavits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium">{doc.title || 'Affidavit'}</p>
                          <p className="text-sm text-slate-500">
                            Created {formatDateShort(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.is_signed ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Signed
                          </Badge>
                        ) : (
                          <>
                            <Badge className="bg-yellow-100 text-yellow-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Needs Signature
                            </Badge>
                            {doc.file_url && (
                              <Button size="sm" asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Sign
                                </a>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JobNotesThread
                jobId={job?.id}
                job={job}
                userType="server"
                currentUserId={user?.uid}
                companyId={user?.company_id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Due Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatDateShort(job.due_date)}
                </p>
              </div>

              {job.priority && (
                <div>
                  <p className="text-sm text-slate-500">Priority</p>
                  <Badge variant="outline" className="capitalize">{job.priority}</Badge>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-slate-500">Server Pay</p>
                <p className="text-xl font-bold text-emerald-600 flex items-center gap-1">
                  <DollarSign className="w-5 h-5" />
                  {serverPay.toFixed(2)}
                </p>
                {job.server_pay_items?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {job.server_pay_items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.description}</span>
                        <span>${item.amount?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Assigned By
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{company?.name || company?.company_name}</p>
              {company?.email && (
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {company.email}
                </p>
              )}
              {company?.phone && (
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {company.phone}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
