import React, { useState, useEffect, useMemo } from 'react';
import { CourtCase } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronDown,
  ChevronRight,
  Briefcase,
  Calendar,
  MapPin,
  User,
  Building,
  AlertTriangle,
  Eye,
  Receipt,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  pending: { color: "bg-slate-100 text-slate-700", label: "Pending" },
  assigned: { color: "bg-blue-100 text-blue-700", label: "Assigned" },
  in_progress: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
  served: { color: "bg-green-100 text-green-700", label: "Served" },
  needs_affidavit: { color: "bg-purple-100 text-purple-700", label: "Needs Affidavit" },
  unable_to_serve: { color: "bg-red-100 text-red-700", label: "Unable to Serve" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

const priorityConfig = {
  standard: { color: "bg-slate-100 text-slate-700" },
  rush: { color: "bg-orange-100 text-orange-700" },
  emergency: { color: "bg-red-100 text-red-700" }
};

export default function CaseView({ jobs, clients, employees, isLoading }) {
  const [courtCases, setCourtCases] = useState([]);
  const [expandedCases, setExpandedCases] = useState(new Set());
  const [casesLoading, setCasesLoading] = useState(true);

  useEffect(() => {
    loadCourtCases();
  }, []);

  const loadCourtCases = async () => {
    setCasesLoading(true);
    try {
      const cases = await CourtCase.list();
      setCourtCases(cases);
    } catch (error) {
      console.error("Error loading court cases:", error);
    }
    setCasesLoading(false);
  };

  const groupedJobs = useMemo(() => {
    const groups = new Map();
    
    jobs.forEach(job => {
      const caseId = job.court_case_id || 'no-case';
      if (!groups.has(caseId)) {
        groups.set(caseId, []);
      }
      groups.get(caseId).push(job);
    });

    return groups;
  }, [jobs]);

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

  const getCaseInfo = (caseId) => {
    if (caseId === 'no-case') {
      return {
        case_name: 'Jobs Without Case Information',
        case_number: 'N/A',
        court_name: 'N/A'
      };
    }
    return courtCases.find(c => c.id === caseId) || {
      case_name: 'Unknown Case',
      case_number: 'Unknown',
      court_name: 'Unknown'
    };
  };

  const toggleCase = (caseId) => {
    const newExpanded = new Set(expandedCases);
    if (newExpanded.has(caseId)) {
      newExpanded.delete(caseId);
    } else {
      newExpanded.add(caseId);
    }
    setExpandedCases(newExpanded);
  };

  const isOverdue = (job) => {
    return job.due_date &&
           new Date(job.due_date) < new Date() &&
           !['served', 'cancelled'].includes(job.status);
  };

  // Helper function to check if status should show a badge
  const shouldShowStatusBadge = (status) => {
    return statusConfig.hasOwnProperty(status);
  };

  if (isLoading || casesLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <div className="ml-6 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h3>
        <p className="text-slate-500">Create your first job or adjust your search filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Jobs Organized by Case
        </h2>
        <p className="text-slate-600 text-sm mt-1">
          {Array.from(groupedJobs.keys()).length} cases with {jobs.length} total jobs
        </p>
      </div>

      <div className="divide-y divide-slate-200">
        {Array.from(groupedJobs.entries()).map(([caseId, caseJobs]) => {
          const caseInfo = getCaseInfo(caseId);
          const isExpanded = expandedCases.has(caseId);
          const hasOverdueJobs = caseJobs.some(job => isOverdue(job));

          return (
            <div key={caseId}>
              {/* Case Header */}
              <div 
                className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => toggleCase(caseId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-slate-700"
                    >
                      {isExpanded ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </Button>
                    
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {caseInfo.case_number}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {caseInfo.case_name}
                      </p>
                      {caseInfo.court_name !== 'N/A' && (
                        <p className="text-xs text-slate-500 mt-1">
                          {caseInfo.court_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasOverdueJobs && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Overdue</span>
                      </div>
                    )}
                    <Badge variant="outline" className="bg-slate-50">
                      {caseJobs.length} job{caseJobs.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Expanded Jobs */}
              {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-200">
                  <div className="divide-y divide-slate-200">
                    {caseJobs.map(job => (
                      <div key={job.id} className="p-4 ml-12">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="font-medium text-slate-900">
                                {job.job_number}
                              </span>
                              
                              {/* Only show status badge if it's a recognized status */}
                              {shouldShowStatusBadge(job.status) && (
                                <Badge className={statusConfig[job.status].color}>
                                  {statusConfig[job.status].label}
                                </Badge>
                              )}
                              
                              {job.priority !== 'standard' && (
                                <Badge
                                  variant="outline"
                                  className={priorityConfig[job.priority]?.color}
                                >
                                  {job.priority}
                                </Badge>
                              )}
                              
                              {/* Invoice Status */}
                              {job.invoiced && (
                                <Badge className="bg-green-100 text-green-800 gap-1">
                                  <Receipt className="w-3 h-3" />
                                  Invoiced
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-2 text-sm text-slate-600 mb-3">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{job.recipient?.name}</span>
                              </div>
                              
                              {job.addresses?.[0] && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">
                                    {job.addresses[0].address1}, {job.addresses[0].city}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span>{getClientName(job.client_id)}</span>
                              </div>
                            </div>

                            {/* Invoice Information */}
                            {job.invoiced && job.invoice_id && (
                              <div className="text-xs text-slate-500 mb-2">
                                Invoice ID: {job.invoice_id}
                              </div>
                            )}
                          </div>

                          <div className="ml-4 flex flex-col items-end gap-3">
                            {/* Due Date */}
                            {job.due_date && (
                              <div className={`flex items-center gap-1 text-sm ${isOverdue(job) ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                                <Calendar className="w-4 h-4" />
                                <span>Due {format(new Date(job.due_date), "MMM d")}</span>
                              </div>
                            )}
                            
                            {/* Server Info */}
                            <div className="text-slate-500 text-sm">
                              Server: {getServerName(job.assigned_server_id)}
                            </div>

                            {/* View Job Details Button */}
                            <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
                              <Button size="sm" variant="outline" className="gap-2">
                                <Eye className="w-4 h-4" />
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}