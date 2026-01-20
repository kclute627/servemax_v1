
// FIREBASE TRANSITION: This page contains significant data fetching and manipulation logic.
// - `loadData`: Replace `Job.list`, `Client.list`, etc. with `getDocs` from Firestore. Shared job logic will require a more complex query, potentially `query(collection(db, 'jobs'), where('assigned_server_id', '==', companyId))`.
// - `handleBulkStatusUpdate`, `handleBulkDelete`: Replace `Job.update` and `Job.delete` with batched writes (`writeBatch`) in Firestore for efficiency.
// - `handleUpdateSharedJobStatus`: Replace the function call with a call to your new Firebase Cloud Function.
// - `User.me()`: Replace with Firebase Auth to get the current user.

import React, { useState, useEffect, useCallback, useMemo } from "react";
// FIREBASE TRANSITION: Replace these with Firebase SDK imports.
// Job, Client, Employee, CourtCase, User are now managed by JobsContext
import { Job } from "@/api/entities"; // Keep Job for update/delete operations
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation, useSearchParams } from "react-router-dom"; // Import useLocation and useSearchParams
import { createPageUrl } from "@/utils";
// FIREBASE TRANSITION: This will call your new Firebase Cloud Function.
import { updateSharedJobStatus } from "@/api/functions";

import JobTypeSection from "../components/jobs/JobTypeSection";
import { useGlobalData } from "../components/GlobalDataContext"; // Changed from useJobs to useGlobalData
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/firebase/schemas";

export default function JobsPage() {
  // Get data from context instead of loading it here
  const {
    jobs,
    clients,
    employees,
    invoices,
    courtCases,
    allAssignableServers,
    myCompanyClientId,
    companyData,
    companySettings,
    isLoading,
    refreshData
  } = useGlobalData(); // Changed from useJobs() to useGlobalData()

  const location = useLocation(); // Get location object
  const [searchParams, setSearchParams] = useSearchParams();

  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [selectedJobs, setSelectedJobs] = useState([]);

  // New pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage] = useState(20); // 20 jobs per page

  // Job type sections - for companies with multiple enabled job types
  const enabledJobTypes = companyData?.enabled_job_types || [JOB_TYPES.PROCESS_SERVING];
  const hasMultipleJobTypes = enabledJobTypes.length > 1;

  // State for which sections are expanded (all expanded by default)
  const [expandedSections, setExpandedSections] = useState(() =>
    enabledJobTypes.reduce((acc, type) => ({ ...acc, [type]: true }), {})
  );

  // Toggle section expansion
  const toggleSection = useCallback((jobType) => {
    setExpandedSections(prev => ({
      ...prev,
      [jobType]: !prev[jobType]
    }));
  }, []);

  // Group filtered jobs by job type (only computed when needed)
  const jobsByType = useMemo(() => {
    if (!hasMultipleJobTypes) return null;

    const groups = {};
    enabledJobTypes.forEach(type => groups[type] = []);

    filteredJobs.forEach(job => {
      const type = job.job_type || JOB_TYPES.PROCESS_SERVING;
      if (groups[type]) {
        groups[type].push(job);
      } else {
        // If job has an unknown type, put it in process_serving
        groups[JOB_TYPES.PROCESS_SERVING]?.push(job);
      }
    });

    return groups;
  }, [filteredJobs, enabledJobTypes, hasMultipleJobTypes]);

  // The `loadData` function and its related useEffect for initial data
  // are removed as data is now provided by the JobsContext.

  // URL params handling removed - filters are now per-section

  // Global search filter - status/priority/server filtering is now per-section
  const filterJobs = useCallback(() => {
    let jobsToSort = [...jobs];

    // Sort by priority and due date
    const priorityOrder = { emergency: 3, rush: 2, standard: 1 };

    jobsToSort.sort((a, b) => {
      // 1. Priority sort (descending)
      const priorityA = priorityOrder[a.priority] || 0;
      const priorityB = priorityOrder[b.priority] || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // 2. Due Date sort (ascending - most urgent first)
      const dateA = a.due_date ? new Date(a.due_date) : null;
      const dateB = b.due_date ? new Date(b.due_date) : null;

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return dateA - dateB;
    });

    let filtered = jobsToSort;

    // Global search filter - searches across all job types
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.recipient?.name?.toLowerCase().includes(term) ||
        job.job_number?.toLowerCase().includes(term) ||
        job.client_job_number?.toLowerCase().includes(term) ||
        job.case_name?.toLowerCase().includes(term) ||
        job.case_number?.toLowerCase().includes(term)
      );
    }

    console.log('[Jobs] Total jobs:', jobs.length);
    console.log('[Jobs] Search filtered jobs:', filtered.length);

    setFilteredJobs(filtered);
    setCurrentPage(1);
  }, [jobs, searchTerm]);

  useEffect(() => {
    filterJobs();
  }, [filterJobs]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Sync URL search param with searchTerm
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // Get paginated jobs for current page
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, currentPage, jobsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedJobs([]); // Clear selected jobs when changing pages
  };

  const handleJobSelection = useCallback((jobId, isSelected) => {
    if (isSelected) {
      setSelectedJobs(prev => [...prev, jobId]);
    } else {
      setSelectedJobs(prev => prev.filter(id => id !== jobId));
    }
  }, []);

  const handleSelectAll = useCallback((isSelected) => {
    if (isSelected) {
      // Only select jobs on current page
      setSelectedJobs(paginatedJobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
    }
  }, [paginatedJobs]);

  const handleBulkStatusUpdate = async (newStatus) => {
    try {
      // Clear selection immediately for better UX
      setSelectedJobs([]);

      // Use batch update for better performance (single Firestore transaction)
      const updates = selectedJobs.map(jobId => ({
        id: jobId,
        data: { status: newStatus }
      }));

      await Job.bulkUpdate(updates);

      // Refresh to get latest data from server
      refreshData();
    } catch (error) {
      console.error("Failed to update job statuses:", error);
      alert("Failed to update some jobs. Please try again.");
      // Refresh to show accurate state
      refreshData();
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedJobs.length} selected jobs? This action cannot be undone.`)) {
      const jobsToDelete = selectedJobs;

      try {
        // Clear selection immediately for better UX
        setSelectedJobs([]);

        // Use batch delete for better performance (single Firestore transaction)
        await Job.bulkDelete(jobsToDelete);

        // Refresh to get latest data
        refreshData();
      } catch (error) {
        console.error("Failed to delete jobs:", error);
        alert("Failed to delete some jobs. Please try again.");
        // Refresh to show accurate state
        refreshData();
      }
    }
  };

  const handleUpdateSharedJobStatus = async (jobId, newStatus, declineReason = null) => {
    try {
      await updateSharedJobStatus({
        jobId: jobId,
        newSharedJobStatus: newStatus,
        declineReason: declineReason
      });
      // Refresh data to show the change
      refreshData(); // Use context refresh instead
    } catch (error) {
      console.error("Failed to update shared job status:", error);
      alert("There was an error updating the job status. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-screen mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Jobs</h1>
              <p className="text-slate-600">Manage all process serving jobs</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-start">
              {/* Changed New Job button to a Link component */}
              <Link to={createPageUrl("CreateJob")}>
                <Button className="bg-slate-900 hover:bg-slate-800 gap-2">
                  <Plus className="w-4 h-4" />
                  New Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Search - only show as separate section when multiple job types */}
          {hasMultipleJobTypes && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search all jobs by recipient, job #, case name, or client ref #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Summary */}
            <div className="p-4 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
                </span>
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </div>

            {/* Bulk Actions Bar - Show when jobs are selected */}
            {selectedJobs.length > 0 && (
              <div className="p-4 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedJobs.length} job{selectedJobs.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate('in_progress')}
                        className="bg-white hover:bg-blue-50"
                      >
                        Mark In Progress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate('served')}
                        className="bg-white hover:bg-blue-50"
                      >
                        Mark Served
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate('cancelled')}
                        className="bg-white hover:bg-blue-50"
                      >
                        Cancel Jobs
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="bg-white hover:bg-red-50 text-red-700 hover:text-red-800"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedJobs([])}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Jobs Display - each job type section has its own filters and views */}
          <div className="space-y-4">
            {enabledJobTypes.map(jobType => (
              <JobTypeSection
                key={jobType}
                jobType={jobType}
                label={JOB_TYPE_LABELS[jobType] || jobType}
                jobs={hasMultipleJobTypes ? (jobsByType?.[jobType] || []) : filteredJobs}
                isExpanded={expandedSections[jobType] ?? true}
                onToggle={() => toggleSection(jobType)}
                hideHeader={!hasMultipleJobTypes} // Hide collapsible header when only one job type
                clients={clients}
                employees={employees}
                invoices={invoices}
                isLoading={isLoading}
                onJobUpdate={refreshData}
                myCompanyClientId={myCompanyClientId}
                onUpdateSharedJobStatus={handleUpdateSharedJobStatus}
                selectedJobs={selectedJobs}
                onJobSelection={handleJobSelection}
                onSelectAll={handleSelectAll}
                allAssignableServers={allAssignableServers}
                courtCases={courtCases}
                companySettings={companySettings}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                initialView={searchParams.get('view') || 'list'}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
