
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Job, Client, Employee, CourtCase, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  List,
  MapPin,
  Briefcase,
  Columns
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { updateSharedJobStatus } from "@/api/functions";

import JobsTable from "../components/jobs/JobsTable";
import JobFilters from "../components/jobs/JobFilters";
import JobsMap from "../components/jobs/JobsMap";
import KanbanView from "../components/jobs/KanbanView"; // New import

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [courtCases, setCourtCases] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "open", // Default to 'open'
    priority: "all",
    client: "all",
    assignedServer: "all"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [myCompanyClientId, setMyCompanyClientId] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [currentView, setCurrentView] = useState('list'); // Add view state

  // This function is now stable and won't cause re-renders on its own.
  const loadData = useCallback(async (companyId) => {
    setIsLoading(true);
    try {
      const [clientsData, employeesData, courtCasesData, myJobs] = await Promise.all([
        Client.list(),
        Employee.list(), // Fetch all employees, not just process servers
        CourtCase.list(),
        Job.list("-created_date"),
      ]);

      setClients(clientsData);
      setEmployees(employeesData);
      setCourtCases(courtCasesData);

      let sharedJobs = [];
      // If we have a companyId, fetch jobs shared with us
      if (companyId) {
        // Jobs assigned to this company (myCompanyClientId) from other companies
        sharedJobs = await Job.filter({ assigned_server_id: companyId });
      }

      // Combine and deduplicate jobs
      const allJobsMap = new Map();
      myJobs.forEach(job => allJobsMap.set(job.id, job));
      sharedJobs.forEach(job => allJobsMap.set(job.id, job));
      const combinedJobs = Array.from(allJobsMap.values()).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setJobs(combinedJobs);

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // This effect runs once on component mount to load all initial data.
    const loadInitialData = async () => {
      let companyId = null;
      try {
        const currentUser = await User.me();
        if (currentUser?.email) {
          // Find the Client ID for the current user's company's job sharing email
          const companyClients = await Client.filter({ job_sharing_email: currentUser.email });
          if (companyClients.length > 0) {
            companyId = companyClients[0].id;
            setMyCompanyClientId(companyId);
          }
        }
      } catch (error) {
        console.error("Error fetching user/company ID:", error);
      }
      // Pass the found companyId directly to loadData to avoid state update delays
      loadData(companyId);
    };

    loadInitialData();
  }, [loadData]);

  // Create a combined list of assignable servers for the filter dropdown
  // This includes internal employees and a representation for jobs shared with "my company"
  const allAssignableServers = useMemo(() => {
    const servers = [...employees]; // Start with actual internal employees
    if (myCompanyClientId) {
      // Add a virtual entry for jobs that are assigned to our company (shared with us)
      // This allows 'Jobs Shared With My Company' to appear as a selectable filter option
      servers.push({ id: myCompanyClientId, name: "Jobs Shared With My Company" });
    }
    return servers;
  }, [employees, myCompanyClientId]);


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

    // Client filter
    if (filters.client !== "all") {
      filtered = filtered.filter(job => job.client_id === filters.client);
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

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, filters]);

  useEffect(() => {
    filterJobs();
  }, [filterJobs]);

  const handleJobSelection = useCallback((jobId, isSelected) => {
    if (isSelected) {
      setSelectedJobs(prev => [...prev, jobId]);
    } else {
      setSelectedJobs(prev => prev.filter(id => id !== jobId));
    }
  }, []);

  const handleSelectAll = useCallback((isSelected) => {
    if (isSelected) {
      setSelectedJobs(filteredJobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
    }
  }, [filteredJobs]);

  const handleBulkStatusUpdate = async (newStatus) => {
    try {
      // Update all selected jobs to the new status
      await Promise.all(
        selectedJobs.map(jobId =>
          Job.update(jobId, { status: newStatus })
        )
      );
      // Clear selection and refresh data
      setSelectedJobs([]);
      loadData(myCompanyClientId);
    } catch (error) {
      console.error("Failed to update job statuses:", error);
      alert("Failed to update some jobs. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedJobs.length} selected jobs? This action cannot be undone.`)) {
      try {
        await Promise.all(
          selectedJobs.map(jobId => Job.delete(jobId))
        );
        setSelectedJobs([]);
        loadData(myCompanyClientId);
      } catch (error) {
        console.error("Failed to delete jobs:", error);
        alert("Failed to delete some jobs. Please try again.");
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
      loadData(myCompanyClientId);
    } catch (error) {
      console.error("Failed to update shared job status:", error);
      alert("There was an error updating the job status. Please try again.");
    }
  };

  const exportJobs = () => {
    const csvContent = [
      "Job Number,Case Name,Client,Defendant,Status,Priority,Due Date,Service Fee",
      ...filteredJobs.map(job => {
        const client = clients.find(c => c.id === job.client_id);
        return [
          job.job_number,
          job.case_name,
          client?.company_name || "Unknown",
          job.defendant_name,
          job.status,
          job.priority,
          job.due_date || "",
          job.service_fee || 0
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs-export.csv";
    a.click();
    URL.revokeObjectURL(url);
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
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={exportJobs}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
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
                {/* Search and View Selector Row */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search by recipient, job #, or client ref #..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* View Mode Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <Button
                      variant={currentView === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('list')}
                      className={`gap-2 h-8 px-3 ${currentView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                    >
                      <List className="w-4 h-4" />
                      List
                    </Button>
                    <Button
                      variant={currentView === 'map' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('map')}
                      className={`gap-2 h-8 px-3 ${currentView === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                    >
                      <MapPin className="w-4 h-4" />
                      Map
                    </Button>
                    <Button
                      variant={currentView === 'case' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('case')}
                      className={`gap-2 h-8 px-3 ${currentView === 'case' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                    >
                      <Briefcase className="w-4 h-4" />
                      Case
                    </Button>
                    <Button
                      variant={currentView === 'kanban' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('kanban')}
                      className={`gap-2 h-8 px-3 ${currentView === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                    >
                      <Columns className="w-4 h-4" />
                      Kanban
                    </Button>
                  </div>
                </div>
                
                {/* Filters Row */}
                <div>
                  <JobFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    clients={clients}
                    employees={allAssignableServers}
                  />
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {filteredJobs.length} of {jobs.length} jobs
                </p>
                {(searchTerm || filters.status !== 'open' || filters.priority !== 'all' || filters.client !== 'all' || filters.assignedServer !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({
                        status: "open",
                        priority: "all",
                        client: "all",
                        assignedServer: "all"
                      });
                    }}
                  >
                    Clear Filters
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

          {/* Jobs Display */}
          {currentView === 'list' && (
            <JobsTable
              jobs={filteredJobs}
              clients={clients}
              employees={employees} // JobsTable still receives the original employees for internal server lookup
              isLoading={isLoading}
              onJobUpdate={() => loadData(myCompanyClientId)}
              myCompanyClientId={myCompanyClientId} // Pass myCompanyClientId for JobsTable to identify shared jobs assigned to us
              onUpdateSharedJobStatus={handleUpdateSharedJobStatus}
              selectedJobs={selectedJobs}
              onJobSelection={handleJobSelection}
              onSelectAll={handleSelectAll}
            />
          )}

          {currentView === 'map' && (
            <JobsMap jobs={filteredJobs} isLoading={isLoading} />
          )}

          {currentView === 'kanban' && (
            <KanbanView
              jobs={filteredJobs}
              clients={clients}
              employees={employees}
              onJobUpdate={() => loadData(myCompanyClientId)}
              isLoading={isLoading}
            />
          )}

          {/* Placeholder for other views */}
          {currentView === 'case' && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Case View</h3>
              <p className="text-slate-500">This view is coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
