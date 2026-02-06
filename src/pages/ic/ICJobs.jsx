import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  User as UserIcon,
  Briefcase
} from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// Status badge colors
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  served: "bg-green-100 text-green-800",
  unable_to_serve: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800"
};

const PRIORITY_COLORS = {
  standard: "bg-slate-100 text-slate-700",
  rush: "bg-orange-100 text-orange-700",
  emergency: "bg-red-100 text-red-700"
};

export default function ICJobs() {
  const { user, userData } = useOutletContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobsByCompany, setJobsByCompany] = useState({});
  const [companies, setCompanies] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState(null);

  useEffect(() => {
    if (userData?.companies?.length > 0) {
      loadJobs();
    } else {
      setIsLoading(false);
    }
  }, [userData]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const companyIds = userData.companies || [];
      const jobsGrouped = {};
      const companiesData = {};

      // Get company details
      for (const companyId of companyIds) {
        const companyDoc = await getDoc(doc(db, "companies", companyId));
        if (companyDoc.exists()) {
          companiesData[companyId] = { id: companyId, ...companyDoc.data() };
        }
      }

      // Get jobs assigned to this IC user
      const jobsQuery = query(
        collection(db, "jobs"),
        where("assigned_server_id", "==", user.uid)
      );
      const jobsSnap = await getDocs(jobsQuery);

      // Group jobs by company
      jobsSnap.forEach((jobDoc) => {
        const job = { id: jobDoc.id, ...jobDoc.data() };
        const companyId = job.company_id;

        if (!jobsGrouped[companyId]) {
          jobsGrouped[companyId] = [];
        }
        jobsGrouped[companyId].push(job);
      });

      // Sort jobs within each company (by due date, then by priority)
      Object.keys(jobsGrouped).forEach((companyId) => {
        jobsGrouped[companyId].sort((a, b) => {
          // Pending acceptance first
          if (a.ic_acceptance_status === 'pending' && b.ic_acceptance_status !== 'pending') return -1;
          if (b.ic_acceptance_status === 'pending' && a.ic_acceptance_status !== 'pending') return 1;
          // Then by due date
          const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
          const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
          return dateA - dateB;
        });
      });

      setCompanies(companiesData);
      setJobsByCompany(jobsGrouped);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast({
        variant: "destructive",
        title: "Error loading jobs",
        description: "Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptJob = async (jobId) => {
    setProcessingJobId(jobId);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        ic_acceptance_status: 'accepted',
        ic_accepted_at: serverTimestamp(),
        status: 'assigned',
        updated_at: serverTimestamp()
      });

      toast({
        title: "Job Accepted",
        description: "You have accepted this job assignment."
      });

      // Refresh jobs
      await loadJobs();
    } catch (error) {
      console.error("Error accepting job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to accept job. Please try again."
      });
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleDeclineJob = async (jobId) => {
    setProcessingJobId(jobId);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        ic_acceptance_status: 'declined',
        ic_declined_at: serverTimestamp(),
        assigned_server_id: 'unassigned',
        updated_at: serverTimestamp()
      });

      toast({
        title: "Job Declined",
        description: "You have declined this job assignment."
      });

      // Refresh jobs
      await loadJobs();
    } catch (error) {
      console.error("Error declining job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to decline job. Please try again."
      });
    } finally {
      setProcessingJobId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "No date";
    try {
      const d = typeof date === 'string' ? new Date(date) : date.toDate?.() || new Date(date);
      return format(d, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'served' || status === 'cancelled') return false;
    try {
      const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate.toDate?.() || new Date(dueDate);
      return d < new Date();
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const companyIds = Object.keys(jobsByCompany);
  const totalJobs = Object.values(jobsByCompany).flat().length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>
          <p className="text-slate-600 mt-1">
            {totalJobs} job{totalJobs !== 1 ? 's' : ''} across {companyIds.length} compan{companyIds.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <Button variant="outline" onClick={loadJobs}>
          Refresh
        </Button>
      </div>

      {/* No jobs state */}
      {totalJobs === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No jobs yet</h3>
              <p className="text-slate-600">
                When companies assign jobs to you, they&apos;ll appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs grouped by company */}
      {companyIds.map((companyId) => {
        const company = companies[companyId];
        const jobs = jobsByCompany[companyId] || [];

        if (jobs.length === 0) return null;

        return (
          <Card key={companyId}>
            <CardHeader className="border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                  {company?.branding?.logo_url ? (
                    <img
                      src={company.branding.logo_url}
                      alt={company.name}
                      className="w-8 h-8 object-contain rounded"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">
                    {company?.name || company?.company_name || 'Unknown Company'}
                  </CardTitle>
                  <p className="text-sm text-slate-500">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="divide-y">
              {jobs.map((job) => {
                const isPending = job.ic_acceptance_status === 'pending' || !job.ic_acceptance_status;
                const isProcessing = processingJobId === job.id;
                const overdue = isOverdue(job.due_date, job.status);

                return (
                  <div
                    key={job.id}
                    className={`py-4 ${isPending ? 'bg-yellow-50 -mx-6 px-6' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Job header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">
                            #{job.job_number || job.id.slice(0, 8)}
                          </span>
                          <Badge className={STATUS_COLORS[job.status] || STATUS_COLORS.pending}>
                            {job.status?.replace(/_/g, ' ') || 'Pending'}
                          </Badge>
                          {job.priority && job.priority !== 'standard' && (
                            <Badge className={PRIORITY_COLORS[job.priority]}>
                              {job.priority}
                            </Badge>
                          )}
                          {overdue && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {isPending && (
                            <Badge className="bg-yellow-500 text-white">
                              Awaiting Your Response
                            </Badge>
                          )}
                        </div>

                        {/* Recipient */}
                        <div className="mt-2 flex items-center gap-2 text-slate-700">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <span>{job.recipient_name || 'No recipient'}</span>
                        </div>

                        {/* Address */}
                        {job.addresses?.[0] && (
                          <div className="mt-1 flex items-start gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span>
                              {job.addresses[0].address1}, {job.addresses[0].city}, {job.addresses[0].state} {job.addresses[0].postal_code}
                            </span>
                          </div>
                        )}

                        {/* Due date & Server pay */}
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Calendar className={`w-4 h-4 ${overdue ? 'text-red-500' : 'text-slate-400'}`} />
                            <span className={overdue ? 'text-red-600 font-medium' : ''}>
                              Due: {formatDate(job.due_date)}
                            </span>
                          </div>
                          {job.server_pay_items?.length > 0 && (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium">
                                ${job.server_pay_items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeclineJob(job.id)}
                              disabled={isProcessing}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleAcceptJob(job.id)}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/ic/job/${job.id}`)}
                          >
                            View Details
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
