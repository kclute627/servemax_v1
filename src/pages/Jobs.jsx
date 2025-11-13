
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
  Search,
  Filter,
  MoreHorizontal,
  List,
  MapPin,
  Briefcase,
  Columns,
  Route
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "react-router-dom"; // Import useLocation
import { createPageUrl } from "@/utils";
// FIREBASE TRANSITION: This will call your new Firebase Cloud Function.
import { updateSharedJobStatus } from "@/api/functions";

import JobsTable from "../components/jobs/JobsTable";
import JobFilters from "../components/jobs/JobFilters";
import JobsMap from "../components/jobs/JobsMap";
import KanbanView from "../components/jobs/KanbanView";
import CaseView from "../components/jobs/CaseView";
import RoutingView from "../components/jobs/RoutingView";
import { useGlobalData } from "../components/GlobalDataContext"; // Changed from useJobs to useGlobalData
import { StatsManager } from "@/firebase/stats";

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
    companySettings,
    isLoading,
    refreshData
  } = useGlobalData(); // Changed from useJobs() to useGlobalData()

  const location = useLocation(); // Get location object

  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "open", // Default to 'open'
    priority: "all",
    assignedServer: "all",
    needsAttention: false
  });
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [currentView, setCurrentView] = useState('list'); // Add view state

  // New pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage] = useState(20); // 20 jobs per page

  // The `loadData` function and its related useEffect for initial data
  // are removed as data is now provided by the JobsContext.

  // New useEffect to read URL params on initial load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const priority = params.get('priority');
    const attention = params.get('attention');

    const newFilters = {};
    if (status) {
      newFilters.status = status;
    }
    if (priority) {
      newFilters.priority = priority;
    }
    if (attention === 'true') {
      newFilters.needsAttention = true;
    }

    if (Object.keys(newFilters).length > 0) {
      setFilters(prevFilters => ({
        ...prevFilters,
        ...newFilters
      }));
    }
  }, [location.search]);

  const filterJobs = useCallback(() => {
    let jobsToSort = [...jobs];

    // --- NEW SORTING LOGIC ---
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

      if (!dateA && !dateB) return 0; // Both have no due date
      if (!dateA) return 1;          // a has no due date, so b comes first
      if (!dateB) return -1;         // b has no due date, so a comes first

      return dateA - dateB;
    });

    let filtered = jobsToSort;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.recipient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.client_job_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // --- UPDATED STATUS FILTER LOGIC ---
    if (filters.status === 'open') {
      // A job is "open" if its is_closed flag is false.
      filtered = filtered.filter(job => !job.is_closed);
    } else if (filters.status === 'closed') {
      // A job is "closed" if its is_closed flag is true.
      filtered = filtered.filter(job => job.is_closed === true);
    } else if (filters.status !== "all") {
      // For specific statuses like 'pending', 'served', etc.
      filtered = filtered.filter(job => job.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== "all") {
      filtered = filtered.filter(job => job.priority === filters.priority);
    }

    // Assigned server filter
    if (filters.assignedServer !== "all") {
      if (filters.assignedServer === 'unassigned') {
        filtered = filtered.filter(job => !job.assigned_server_id);
      } else {
        // This condition now correctly filters for internal servers AND for jobs
        // assigned to 'myCompanyClientId' (i.e., jobs shared with this company).
        filtered = filtered.filter(job => job.assigned_server_id === filters.assignedServer);
      }
    }

    // Needs attention filter
    if (filters.needsAttention) {
      filtered = filtered.filter(job => StatsManager.jobNeedsAttention(job));
    }

    console.log('[Jobs] Total jobs:', jobs.length);
    console.log('[Jobs] Filtered jobs:', filtered.length);
    console.log('[Jobs] Current filter:', filters);

    setFilteredJobs(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [jobs, searchTerm, filters]); // 'jobs' is now from context

  useEffect(() => {
    filterJobs();
  }, [filterJobs]);

  // Reset page when search term or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

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

  // New handler for Kanban drag-and-drop column updates
  const handleJobStatusUpdate = useCallback(async (jobId, newColumnId) => {
    // The KanbanView component handles optimistic UI updates locally
    // We only update the database here and don't refresh to keep the drag smooth
    try {
      await Job.update(jobId, { kanban_column_id: newColumnId });
      // Don't refresh here - rely on optimistic UI for smooth dragging
    } catch (error) {
      console.error("Failed to update job kanban column via drag-and-drop:", error);
      await refreshData(); // Refresh on error to revert optimistic update
    }
  }, [refreshData]);

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

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col gap-4">
                {/* Search Row */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search by recipient, job #, or client ref #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filters Row */}
                <div>
                  <JobFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    employees={allAssignableServers} // Now from context
                  />
                </div>
              </div>
            </div>

            {/* View Mode Selector */}
            <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex justify-center">
              <div className="flex items-center gap-2 bg-slate-200 p-1.5 rounded-xl">
                <Button
                  variant={currentView === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('list')}
                  className={`gap-2 h-9 px-4 ${currentView === 'list' ? 'bg-white text-slate-900 shadow-md hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <List className="w-4 h-4" />
                  List
                </Button>
                <Button
                  variant={currentView === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('map')}
                  className={`gap-2 h-9 px-4 ${currentView === 'map' ? 'bg-white text-slate-900 shadow-md hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <MapPin className="w-4 h-4" />
                  Map
                </Button>
                <Button
                  variant={currentView === 'case' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('case')}
                  className={`gap-2 h-9 px-4 ${currentView === 'case' ? 'bg-white text-slate-900 shadow-md hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <Briefcase className="w-4 h-4" />
                  Case
                </Button>
                <Button
                  variant={currentView === 'routing' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('routing')}
                  className={`gap-2 h-9 px-4 ${currentView === 'routing' ? 'bg-white text-slate-900 shadow-md hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <Route className="w-4 h-4" />
                  Routing
                </Button>
                {companySettings?.kanbanBoard?.enabled && (
                  <Button
                    variant={currentView === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('kanban')}
                    className={`gap-2 h-9 px-4 ${currentView === 'kanban' ? 'bg-white text-slate-900 shadow-md hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <Columns className="w-4 h-4" />
                    Kanban
                  </Button>
                )}
              </div>
            </div>

            {/* Pagination and Filter Summary */}
            <div className="p-4 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
                </span>
                {(searchTerm || filters.status !== 'open' || filters.priority !== 'all' || filters.assignedServer !== 'all' || filters.needsAttention) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({
                        status: "open",
                        priority: "all",
                        assignedServer: "all",
                        needsAttention: false
                      });
                    }}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    ‹
                  </Button>

                  <span className="text-sm text-slate-600 px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    ›
                  </Button>
                </div>
              )}
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

          {/* Jobs Display - pass context refresh function */}
          {currentView === 'list' && (
            <JobsTable
              jobs={paginatedJobs} // Use paginated jobs instead of filteredJobs
              clients={clients}
              employees={employees} // JobsTable still receives the original employees for internal server lookup
              invoices={invoices} // Pass invoices for badge logic
              isLoading={isLoading}
              onJobUpdate={refreshData} // Use context refresh
              myCompanyClientId={myCompanyClientId} // Pass myCompanyClientId for JobsTable to identify shared jobs assigned to us
              onUpdateSharedJobStatus={handleUpdateSharedJobStatus}
              selectedJobs={selectedJobs}
              onJobSelection={handleJobSelection}
              onSelectAll={handleSelectAll}
            />
          )}

          {/* Always render JobsMap for preloading, hide when not active */}
          <div style={{ display: currentView === 'map' ? 'block' : 'none' }}>
            <JobsMap jobs={filteredJobs} isLoading={isLoading} />
          </div>

          {currentView === 'case' && (
            <CaseView
              jobs={filteredJobs}
              clients={clients}
              employees={employees}
              courtCases={courtCases}
              isLoading={isLoading}
            />
          )}

          {currentView === 'kanban' && (
            <KanbanView
              jobs={filteredJobs} // Kanban uses all filtered jobs
              clients={clients}
              employees={employees} // Keep employees as it's likely used for display/filtering within Kanban
              onJobStatusChange={handleJobStatusUpdate} // Pass the new handler
              isLoading={isLoading}
              statusColumns={companySettings?.kanbanBoard?.columns || []}
            />
          )}

          {currentView === 'routing' && (
            <RoutingView
              jobs={filteredJobs}
              employees={employees}
              clients={clients}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
