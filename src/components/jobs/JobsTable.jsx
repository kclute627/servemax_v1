import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Clock,
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
  unable_to_serve: { color: "bg-red-100 text-red-700", label: "Unable to Serve" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

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
  isLoading,
  onJobUpdate,
  myCompanyClientId,
  onUpdateSharedJobStatus,
  selectedJobs = [],
  onJobSelection,
  onSelectAll
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [updatingJobId, setUpdatingJobId] = useState(null);

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "Unknown Client";
  };

  const getServerName = (serverId) => {
    if (!serverId || serverId === "unassigned") {
      return "Unassigned";
    }
    
    // Check if the server is an employee
    const employee = employees.find(e => e.id === serverId);
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    
    // Check if the server is a contractor (a client)
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
    setUpdatingJobId(jobId);
    await onUpdateSharedJobStatus(jobId, 'accepted');
    setUpdatingJobId(null);
  };

  const handleDecline = async (jobId) => {
    const reason = window.prompt("Please provide a reason for declining this job (optional):");
    if (reason !== null) { // Prompt returns null if user clicks Cancel
      setUpdatingJobId(jobId);
      await onUpdateSharedJobStatus(jobId, 'declined', reason);
      setUpdatingJobId(null);
    }
  };

  const isAllSelected = jobs.length > 0 && selectedJobs.length === jobs.length;
  const isIndeterminate = selectedJobs.length > 0 && selectedJobs.length < jobs.length;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Case & Recipient</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-28" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h3>
          <p className="text-slate-500">Create your first job or adjust your search filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-0">
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
                <TableHead className="font-semibold text-slate-700">Case & Recipient</TableHead>
                <TableHead className="font-semibold text-slate-700">Client</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Due Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Server</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const isIncomingSharedJob = job.assigned_server_id === myCompanyClientId && job.shared_from_client_id;
                const isSelected = selectedJobs.includes(job.id);
                const jobIsOverdue = isOverdue(job);

                return (
                <TableRow
                  key={job.id}
                  className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onJobSelection(job.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`} className="font-medium text-slate-900 hover:text-blue-600 hover:underline">
                        {job.job_number}
                      </Link>
                      {job.client_job_number && (
                        <p className="text-sm text-slate-500 truncate max-w-24" title={job.client_job_number}>
                          Ref: {job.client_job_number}
                        </p>
                      )}
                      <div className="flex flex-col gap-2 mt-2">
                        {job.priority !== 'standard' && (
                          <Badge
                            variant="outline"
                            className={`w-fit ${priorityConfig[job.priority]?.color}`}
                          >
                            {job.priority}
                          </Badge>
                        )}
                        {isIncomingSharedJob && (
                           <Badge variant="outline" className={`w-fit gap-1.5 ${sharedStatusConfig[job.shared_job_status]?.color}`}>
                             <Share2 className="w-3 h-3" />
                             {sharedStatusConfig[job.shared_job_status]?.label || "Shared"}
                           </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{job.recipient?.name}</p>
                      {job.addresses?.[0] && (
                        <p className="text-sm text-slate-500 truncate max-w-48">
                          {job.addresses[0].address1}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {getClientName(job.client_id)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[job.status]?.color || "bg-slate-100 text-slate-700"}>
                      {statusConfig[job.status]?.label || job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {job.due_date ? (
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
                    {getServerName(job.assigned_server_id)}
                  </TableCell>
                  <TableCell>
                    {isIncomingSharedJob && job.shared_job_status === 'pending_acceptance' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 gap-1.5 h-9"
                          onClick={() => handleAccept(job.id)}
                          disabled={updatingJobId === job.id}
                        >
                          {updatingJobId === job.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <ThumbsUp className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 gap-1.5 h-9"
                          onClick={() => handleDecline(job.id)}
                          disabled={updatingJobId === job.id}
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
                          <DropdownMenuItem className="gap-2">
                            <Eye className="w-4 h-4" />
                            View Details
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
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}