
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/firebase/schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  User,
  CheckCircle,
  AlertTriangle,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  pending: { color: "bg-slate-100 text-slate-700", label: "Pending" },
  assigned: { color: "bg-blue-100 text-blue-700", label: "Assigned" },
  in_progress: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
  served: { color: "bg-green-100 text-green-700", label: "Served" },
  needs_affidavit: { color: "bg-purple-100 text-purple-700", label: "Needs Affidavit" },
  unable_to_serve: { color: "bg-red-100 text-red-700", label: "Unable to Serve" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

// Workflow status configuration
const workflowStatusConfig = {
  needs_first_attempt: { color: "bg-blue-100 text-blue-700", label: "Needs 1st Attempt" },
  needs_additional_attempt: { color: "bg-amber-100 text-amber-700", label: "Needs Additional Attempt" },
  needs_affidavit: { color: "bg-purple-100 text-purple-700", label: "Needs Affidavit" },
  needs_invoice: { color: "bg-orange-100 text-orange-700", label: "Needs Invoice" },
  completed: { color: "bg-green-100 text-green-700", label: "Completed" },
  unable_to_serve: { color: "bg-red-100 text-red-700", label: "Unable to Serve" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

/**
 * Determine the workflow status of a job based on its progress
 * @param {Object} job - The job object
 * @param {Object|null} jobInvoice - The associated invoice (if any)
 * @returns {string} The workflow status key
 */
function getWorkflowStatus(job, jobInvoice) {
  // Check for terminal statuses first
  if (job.status === 'cancelled') return 'cancelled';
  if (job.status === 'unable_to_serve') return 'unable_to_serve';

  // Check if invoice is issued → Completed
  if (jobInvoice && jobInvoice.status === 'issued') return 'completed';

  // Check if has signed affidavit but no issued invoice → Needs Invoice
  if (job.has_signed_affidavit) return 'needs_invoice';

  // Check if served but no signed affidavit → Needs Affidavit
  if (job.status === 'served' || job.status === 'needs_affidavit') return 'needs_affidavit';

  // Check attempts
  const attemptCount = job.attempts?.length || job.attempt_count || 0;

  if (attemptCount === 0) {
    return 'needs_first_attempt';
  } else {
    return 'needs_additional_attempt';
  }
}

const sharedStatusConfig = {
  pending_acceptance: { color: "bg-amber-100 text-amber-800", label: "Pending Acceptance" },
  accepted: { color: "bg-blue-100 text-blue-800", label: "Accepted" },
  declined: { color: "bg-red-100 text-red-800", label: "Declined" },
};

const priorityConfig = {
  standard: { color: "bg-slate-100 text-slate-700" },
  rush: { color: "bg-orange-100 text-orange-700" },
  emergency: { color: "bg-red-100 text-red-700" }
};

export default function JobsTable({
  jobs,
  clients,
  employees,
  invoices = [],
  isLoading,
  onJobUpdate,
  myCompanyClientId,
  onUpdateSharedJobStatus,
  selectedJobs = [],
  onJobSelection,
  onSelectAll
}) {
  const isAllSelected = jobs.length > 0 && selectedJobs.length === jobs.length;
  const isIndeterminate = selectedJobs.length > 0 && selectedJobs.length < jobs.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                />
              </TableHead>
              <TableHead className="font-semibold text-slate-700">Job</TableHead>
              <TableHead className="font-semibold text-slate-700">Recipient</TableHead>
              <TableHead className="font-semibold text-slate-700">Client</TableHead>
              <TableHead className="font-semibold text-slate-700">Due Date</TableHead>
              <TableHead className="font-semibold text-slate-700">Server</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length > 0 ? (
              jobs.map(job => (
                <JobsTableRow
                  key={job.id}
                  job={job}
                  clients={clients}
                  employees={employees}
                  invoices={invoices}
                  onJobUpdate={onJobUpdate}
                  myCompanyClientId={myCompanyClientId}
                  onUpdateSharedJobStatus={onUpdateSharedJobStatus}
                  isSelected={selectedJobs.includes(job.id)}
                  onSelectionChange={onJobSelection}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h3>
                  <p className="text-slate-500">Create your first job or adjust your search filters</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function JobsTableRow({
  job,
  clients,
  employees,
  invoices = [],
  onJobUpdate,
  myCompanyClientId,
  onUpdateSharedJobStatus,
  isSelected,
  onSelectionChange,
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "Unknown Client";
  };

  const getServerName = (serverId) => {
    if (!serverId || serverId === "unassigned") {
      return "Unassigned";
    }
    
    const employee = employees.find(e => e.id === serverId);
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    
    const contractor = clients.find(c => c.id === serverId);
    if (contractor) {
      return contractor.company_name;
    }
    
    return "Unknown Server";
  };

  const isOverdue = (job) => {
    return job.due_date &&
           new Date(job.due_date) < new Date() &&
           job.status !== 'served' &&
           job.status !== 'cancelled';
  };

  const handleAccept = async (jobId) => {
    setIsUpdating(true);
    await onUpdateSharedJobStatus(jobId, 'accepted');
    setIsUpdating(false);
  };

  const handleDecline = async (jobId) => {
    const reason = window.prompt("Please provide a reason for declining this job (optional):");
    if (reason !== null) { 
      setIsUpdating(true);
      await onUpdateSharedJobStatus(jobId, 'declined', reason);
      setIsUpdating(false);
    }
  };

  const isIncomingSharedJob = job.assigned_server_id === myCompanyClientId && job.shared_from_client_id;
  const jobIsOverdue = isOverdue(job);

  // Find associated invoice
  const jobInvoice = invoices.find(inv =>
    inv.job_ids && (inv.job_ids.includes(job.id) || inv.job_ids === job.id)
  );

  // Get workflow status (only for process serving jobs)
  const isProcessServing = !job.job_type || job.job_type === JOB_TYPES.PROCESS_SERVING;
  const workflowStatus = isProcessServing ? getWorkflowStatus(job, jobInvoice) : null;
  const workflowConfig = workflowStatus ? workflowStatusConfig[workflowStatus] : null;

  return (
    <TableRow
      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(job.id, checked)}
        />
      </TableCell>
      <TableCell>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`} className="font-medium text-slate-900 hover:text-blue-600 hover:underline">
              {job.job_number}
            </Link>
            {/* Job Type Badge - show for non-process-serving jobs */}
            {job.job_type && job.job_type !== JOB_TYPES.PROCESS_SERVING && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-slate-100 text-slate-600 border-slate-300">
                {job.job_type === JOB_TYPES.COURT_REPORTING ? 'CR' :
                 job.job_type === JOB_TYPES.EFILING ? 'EF' :
                 job.job_type === JOB_TYPES.DOCUMENT_RETRIEVAL ? 'DR' :
                 JOB_TYPE_LABELS[job.job_type]?.substring(0, 2) || job.job_type}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Workflow Status Badge (Process Serving only) or Regular Status Badge */}
            {workflowConfig ? (
              <Badge variant="outline" className={`w-fit ${workflowConfig.color}`}>
                {workflowConfig.label}
              </Badge>
            ) : (
              <StatusBadge status={job.status} />
            )}

            {job.priority !== 'standard' && (
              <PriorityBadge priority={job.priority} />
            )}
          </div>
          {job.client_job_number && (
            <p className="text-sm text-slate-500 truncate max-w-24 mt-1" title={job.client_job_number}>
              Ref: {job.client_job_number}
            </p>
          )}
          {isIncomingSharedJob && (
             <Badge variant="outline" className={`w-fit gap-1.5 mt-2 ${sharedStatusConfig[job.shared_job_status]?.color}`}>
               <Share2 className="w-3 h-3" />
               {sharedStatusConfig[job.shared_job_status]?.label || "Shared"}
             </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div>
          {/* Process Serving - show recipient & address */}
          {(!job.job_type || job.job_type === JOB_TYPES.PROCESS_SERVING) ? (
            <>
              <p className="font-medium text-slate-900">{job.recipient?.name}</p>
              {job.addresses?.[0] && (
                <p className="text-sm text-slate-500 max-w-sm whitespace-normal">
                  {job.addresses[0].address1}{job.addresses[0].address2 ? `, ${job.addresses[0].address2}` : ''}, {job.addresses[0].city}, {job.addresses[0].state} {job.addresses[0].postal_code}
                </p>
              )}
            </>
          ) : job.job_type === JOB_TYPES.COURT_REPORTING ? (
            /* Court Reporting - show case name & deposition date */
            <>
              <p className="font-medium text-slate-900">{job.case_name || job.case_number || 'No case info'}</p>
              {job.deposition_date && (
                <p className="text-sm text-slate-500">
                  {format(new Date(job.deposition_date), "MMM d, yyyy")}
                  {job.deposition_time && ` at ${job.deposition_time}`}
                </p>
              )}
              {job.witnesses?.[0]?.name && (
                <p className="text-sm text-slate-500">Witness: {job.witnesses[0].name}</p>
              )}
            </>
          ) : (
            /* Other job types - show case info if available */
            <>
              <p className="font-medium text-slate-900">{job.case_name || job.case_number || '—'}</p>
              {job.court_name && (
                <p className="text-sm text-slate-500">{job.court_name}</p>
              )}
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="text-slate-700">
        {getClientName(job.client_id)}
      </TableCell>
      <TableCell>
        {/* Show appropriate date based on job type */}
        {job.job_type === JOB_TYPES.COURT_REPORTING ? (
          job.deposition_date ? (
            <div className="text-slate-700">
              <div>{format(new Date(job.deposition_date), "MMM d, yyyy")}</div>
              <span className="text-xs text-slate-500">Deposition</span>
            </div>
          ) : (
            <span className="text-slate-400">No date set</span>
          )
        ) : job.due_date ? (
          <div className={jobIsOverdue ? "text-red-600 font-medium" : "text-slate-700"}>
            {format(new Date(job.due_date), "MMM d, yyyy")}
            {jobIsOverdue && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">Overdue</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400">No due date</span>
        )}
      </TableCell>
      <TableCell className="text-slate-700">
        {/* Show appropriate assignment based on job type */}
        {job.job_type === JOB_TYPES.COURT_REPORTING ? (
          job.assigned_personnel?.length > 0 ? (
            <div>
              {job.assigned_personnel.map((p, i) => (
                <span key={i} className={i > 0 ? "text-slate-500 text-sm" : ""}>
                  {i > 0 && ", "}
                  {employees.find(e => e.id === p.employee_id)?.first_name || 'Unassigned'}
                </span>
              ))}
            </div>
          ) : (
            "Unassigned"
          )
        ) : (
          getServerName(job.assigned_server_id)
        )}
      </TableCell>
      <TableCell>
        {isIncomingSharedJob && job.shared_job_status === 'pending_acceptance' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 gap-1.5 h-9"
              onClick={() => handleAccept(job.id)}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin"/> : <ThumbsUp className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 gap-1.5 h-9"
              onClick={() => handleDecline(job.id)}
              disabled={isUpdating}
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" asChild>
                <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Job
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Mark as Served
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }) {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <Badge variant="outline" className={`w-fit ${config.color}`}>
      {config.label}
    </Badge>
  );
}

function PriorityBadge({ priority }) {
  const config = priorityConfig[priority];
  if (!config || priority === 'standard') return null;
  return (
    <Badge variant="outline" className={`w-fit ${config.color}`}>
      {priority}
    </Badge>
  );
}
