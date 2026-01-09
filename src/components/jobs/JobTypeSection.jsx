import React, { useState, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown, List, MapPin, Briefcase, Route, Columns, Search, Filter, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import JobsTable from "./JobsTable";
import JobFilters from "./JobFilters";
import JobsMap from "./JobsMap";
import CaseView from "./CaseView";
import RoutingView from "./RoutingView";
import KanbanView from "./KanbanView";
import { JOB_TYPES } from "@/firebase/schemas";
import { Job } from "@/api/entities";

/**
 * JobTypeSection - A collapsible section for displaying jobs of a specific type
 * Used when a company has multiple job types enabled
 * When hideHeader is true, renders content directly without collapsible wrapper
 */
export default function JobTypeSection({
  jobType,
  label,
  jobs,
  isExpanded,
  onToggle,
  hideHeader = false, // When true, don't show collapsible header (single job type mode)
  // Props passed through to JobsTable
  clients,
  employees,
  invoices,
  isLoading,
  onJobUpdate,
  myCompanyClientId,
  onUpdateSharedJobStatus,
  selectedJobs,
  onJobSelection,
  onSelectAll,
  allAssignableServers = [],
  // Additional props for Process Serving views
  courtCases = [],
  companySettings = null,
  // Search props (for single job type mode)
  searchTerm = "",
  onSearchChange = null
}) {
  // Internal pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 20;

  // View mode state (only used for Process Serving)
  const [currentView, setCurrentView] = useState('list');

  // Filters expanded state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Internal filter state for this section
  const [filters, setFilters] = useState({
    // Job status
    jobsFilter: "active", // all, active, archived
    status: "all",
    priority: "all",
    assignedServer: "all",
    // Date range with from/to
    dateRangePreset: "all", // all, today, week, month, custom
    dateFrom: "",
    dateTo: "",
    // Service result
    serviceResult: "all", // all, served, non_served
    // Attempts (checkboxes - array of selected values)
    attempts: [], // ['0', '1', '2', '3', '4+']
    // Affidavit status (checkboxes)
    affidavit: [], // ['none', 'unsigned', 'signed']
    // Invoice status (checkboxes)
    invoice: [] // ['none', 'draft', 'issued', 'paid']
  });

  // Apply local filters to jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];

    // Jobs filter (All, Active, Archived)
    if (filters.jobsFilter === 'active') {
      filtered = filtered.filter(job => !job.is_closed);
    } else if (filters.jobsFilter === 'archived') {
      filtered = filtered.filter(job => job.is_closed === true);
    }

    // Status filter
    if (filters.status !== "all") {
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
        filtered = filtered.filter(job => job.assigned_server_id === filters.assignedServer);
      }
    }

    // Date range filter - handle presets and custom from/to
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.dateRangePreset !== "all" && filters.dateRangePreset !== "custom") {
      filtered = filtered.filter(job => {
        if (!job.created_at) return false;
        const jobDate = job.created_at.seconds
          ? new Date(job.created_at.seconds * 1000)
          : new Date(job.created_at);

        switch (filters.dateRangePreset) {
          case 'today':
            return jobDate >= startOfToday;
          case 'week':
            const weekAgo = new Date(startOfToday);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return jobDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(startOfToday);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return jobDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Custom date range (from/to)
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(job => {
        if (!job.created_at) return false;
        const jobDate = job.created_at.seconds
          ? new Date(job.created_at.seconds * 1000)
          : new Date(job.created_at);

        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (jobDate < fromDate) return false;
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (jobDate > toDate) return false;
        }

        return true;
      });
    }

    // Service result filter
    if (filters.serviceResult !== "all") {
      if (filters.serviceResult === 'served') {
        filtered = filtered.filter(job => job.status === 'served');
      } else if (filters.serviceResult === 'non_served') {
        filtered = filtered.filter(job => job.status !== 'served' && job.status !== 'cancelled');
      }
    }

    // Attempts filter (checkboxes)
    if (filters.attempts.length > 0) {
      filtered = filtered.filter(job => {
        const attemptCount = job.attempts?.length || job.attempt_count || 0;
        if (filters.attempts.includes('4+') && attemptCount >= 4) return true;
        if (filters.attempts.includes(String(attemptCount))) return true;
        return false;
      });
    }

    // Affidavit filter (checkboxes)
    if (filters.affidavit.length > 0) {
      filtered = filtered.filter(job => {
        if (filters.affidavit.includes('none') && !job.affidavit_url && !job.has_signed_affidavit) return true;
        if (filters.affidavit.includes('unsigned') && job.affidavit_url && !job.has_signed_affidavit) return true;
        if (filters.affidavit.includes('signed') && job.has_signed_affidavit) return true;
        return false;
      });
    }

    // Invoice filter (checkboxes) - requires invoices data
    if (filters.invoice.length > 0 && invoices) {
      filtered = filtered.filter(job => {
        const jobInvoice = invoices.find(inv =>
          inv.job_ids && (inv.job_ids.includes(job.id) || inv.job_ids === job.id)
        );
        if (filters.invoice.includes('none') && !jobInvoice) return true;
        if (filters.invoice.includes('draft') && jobInvoice?.status === 'draft') return true;
        if (filters.invoice.includes('issued') && jobInvoice?.status === 'issued') return true;
        if (filters.invoice.includes('paid') && jobInvoice?.status === 'paid') return true;
        return false;
      });
    }

    return filtered;
  }, [jobs, filters, invoices]);

  // Reset to page 1 when jobs or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [jobs.length, filters]);

  // Paginate filtered jobs for this section
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, currentPage, jobsPerPage]);

  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  // Filter selected jobs to only include jobs in this section
  const sectionSelectedJobs = useMemo(() => {
    const jobIds = new Set(filteredJobs.map(j => j.id));
    return selectedJobs.filter(id => jobIds.has(id));
  }, [filteredJobs, selectedJobs]);

  // Check if any filters are active (beyond default "active" jobs)
  const hasActiveFilters =
    filters.jobsFilter !== 'active' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.assignedServer !== 'all' ||
    filters.dateRangePreset !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.serviceResult !== 'all' ||
    filters.attempts.length > 0 ||
    filters.affidavit.length > 0 ||
    filters.invoice.length > 0;

  // Count active filters
  const activeFilterCount = [
    filters.jobsFilter !== 'active',
    filters.status !== 'all',
    filters.priority !== 'all',
    filters.assignedServer !== 'all',
    filters.dateRangePreset !== 'all' || filters.dateFrom !== '' || filters.dateTo !== '',
    filters.serviceResult !== 'all',
    filters.attempts.length > 0,
    filters.affidavit.length > 0,
    filters.invoice.length > 0
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      jobsFilter: "active",
      status: "all",
      priority: "all",
      assignedServer: "all",
      dateRangePreset: "all",
      dateFrom: "",
      dateTo: "",
      serviceResult: "all",
      attempts: [],
      affidavit: [],
      invoice: []
    });
  };

  // Toggle checkbox filter
  const toggleCheckboxFilter = (filterName, value) => {
    setFilters(prev => {
      const current = prev[filterName];
      if (current.includes(value)) {
        return { ...prev, [filterName]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [filterName]: [...current, value] };
      }
    });
  };

  // Handle date preset change
  const handleDatePresetChange = (preset) => {
    if (preset === 'custom') {
      setFilters(prev => ({ ...prev, dateRangePreset: 'custom' }));
    } else {
      setFilters(prev => ({
        ...prev,
        dateRangePreset: preset,
        dateFrom: '',
        dateTo: ''
      }));
    }
  };

  // Handler for Kanban drag-and-drop column updates
  const handleJobStatusUpdate = useCallback(async (jobId, newColumnId) => {
    try {
      await Job.update(jobId, { kanban_column_id: newColumnId });
      onJobUpdate?.(); // Refresh data after successful update
    } catch (error) {
      console.error("Failed to update job kanban column:", error);
      onJobUpdate?.();
    }
  }, [onJobUpdate]);

  // Handle select all for this section only
  const handleSectionSelectAll = (isSelected) => {
    if (isSelected) {
      // Select all jobs in this section's current page
      paginatedJobs.forEach(job => {
        if (!selectedJobs.includes(job.id)) {
          onJobSelection(job.id, true);
        }
      });
    } else {
      // Deselect all jobs in this section's current page
      paginatedJobs.forEach(job => {
        if (selectedJobs.includes(job.id)) {
          onJobSelection(job.id, false);
        }
      });
    }
  };

  // Check if this job type is "Coming Soon"
  const isComingSoon = jobType === JOB_TYPES.COURT_REPORTING;

  // When hideHeader is true, always show content (single job type mode)
  const showContent = hideHeader || (isExpanded && !isComingSoon);

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm mb-4 ${isComingSoon ? 'opacity-60' : ''}`}>
      {/* Collapsible Header - hidden in single job type mode */}
      {!hideHeader && (
        <div
          onClick={isComingSoon ? undefined : onToggle}
          className={`w-full p-4 flex items-center justify-between transition-colors rounded-t-lg ${isComingSoon ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'}`}
        >
          <div className="flex items-center gap-3">
            {!isComingSoon && (
              isExpanded ? (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-500" />
              )
            )}
            <span className={`font-semibold text-lg ${isComingSoon ? 'text-slate-500' : 'text-slate-900'}`}>{label}</span>
            {isComingSoon ? (
              <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-slate-300">
                Coming Soon
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {filteredJobs.length !== jobs.length
                  ? `${filteredJobs.length} of ${jobs.length} jobs`
                  : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`
                }
              </Badge>
            )}
          </div>
          {!isComingSoon && sectionSelectedJobs.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {sectionSelectedJobs.length} selected
            </Badge>
          )}
        </div>
      )}

      {/* Content - always shown when hideHeader is true */}
      {showContent && (
        <div className={hideHeader ? '' : 'border-t border-slate-200'}>
          {/* Filters and View Selector for Process Serving */}
          {jobType === JOB_TYPES.PROCESS_SERVING && (
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              {/* Search Bar Row (only in single job type mode) */}
              {hideHeader && onSearchChange && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search by recipient, job #, case name, or client ref #..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-10 bg-white"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => onSearchChange("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* View Mode Selector and Filter Toggle */}
              <div className="flex items-center justify-between gap-4 mb-4">
                {/* View Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg">
                  <Button
                    variant={currentView === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('list')}
                    className={`gap-1.5 h-8 px-3 ${currentView === 'list' ? 'bg-white text-slate-900 shadow-sm hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <List className="w-4 h-4" />
                    List
                  </Button>
                  <Button
                    variant={currentView === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('map')}
                    className={`gap-1.5 h-8 px-3 ${currentView === 'map' ? 'bg-white text-slate-900 shadow-sm hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <MapPin className="w-4 h-4" />
                    Map
                  </Button>
                  <Button
                    variant={currentView === 'case' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('case')}
                    className={`gap-1.5 h-8 px-3 ${currentView === 'case' ? 'bg-white text-slate-900 shadow-sm hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <Briefcase className="w-4 h-4" />
                    Case
                  </Button>
                  <Button
                    variant={currentView === 'routing' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('routing')}
                    className={`gap-1.5 h-8 px-3 ${currentView === 'routing' ? 'bg-white text-slate-900 shadow-sm hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <Route className="w-4 h-4" />
                    Routing
                  </Button>
                  {companySettings?.kanbanBoard?.enabled && (
                    <Button
                      variant={currentView === 'kanban' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('kanban')}
                      className={`gap-1.5 h-8 px-3 ${currentView === 'kanban' ? 'bg-white text-slate-900 shadow-sm hover:bg-white hover:text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      <Columns className="w-4 h-4" />
                      Kanban
                    </Button>
                  )}
                </div>

                {/* Filter Toggle Button */}
                <Button
                  variant={filtersExpanded ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className={`gap-2 ${filtersExpanded ? 'bg-slate-900 text-white' : ''}`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0 h-5">
                      {activeFilterCount}
                    </Badge>
                  )}
                  {filtersExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Collapsible Filters Section */}
              {filtersExpanded && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">

                    {/* Jobs Filter (Radio buttons) */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">Jobs</label>
                      <div className="space-y-1.5">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'active', label: 'Active' },
                          { value: 'archived', label: 'Archived' }
                        ].map(option => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="jobsFilter"
                              value={option.value}
                              checked={filters.jobsFilter === option.value}
                              onChange={(e) => setFilters(prev => ({ ...prev, jobsFilter: e.target.value }))}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Attempts Filter (Checkboxes) */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">Attempts</label>
                      <div className="space-y-1.5">
                        {['0', '1', '2', '3', '4+'].map(value => (
                          <label key={value} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              id={`attempts-${value}`}
                              checked={filters.attempts.includes(value)}
                              onCheckedChange={() => toggleCheckboxFilter('attempts', value)}
                              className="border-slate-300"
                            />
                            <span className="text-sm text-slate-700">{value}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Job Status Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">Job Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="served">Served</option>
                        <option value="needs_affidavit">Needs Affidavit</option>
                        <option value="unable_to_serve">Unable to Serve</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      {/* Service Result */}
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mt-4">Service Result</label>
                      <select
                        value={filters.serviceResult}
                        onChange={(e) => setFilters(prev => ({ ...prev, serviceResult: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Results</option>
                        <option value="served">Served</option>
                        <option value="non_served">Non-Served</option>
                      </select>
                    </div>

                    {/* Server/Client Dropdowns */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">Server</label>
                      <select
                        value={filters.assignedServer}
                        onChange={(e) => setFilters(prev => ({ ...prev, assignedServer: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Servers</option>
                        <option value="unassigned">Unassigned</option>
                        {allAssignableServers.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name || `${employee.first_name} ${employee.last_name}`}
                          </option>
                        ))}
                      </select>

                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mt-4">Priority</label>
                      <select
                        value={filters.priority}
                        onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Priorities</option>
                        <option value="standard">Standard</option>
                        <option value="rush">Rush</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>

                    {/* Affidavit Filter (Checkboxes) */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">Affidavit</label>
                      <div className="space-y-1.5">
                        {[
                          { value: 'none', label: 'None' },
                          { value: 'unsigned', label: 'Unsigned' },
                          { value: 'signed', label: 'Signed' }
                        ].map(option => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              id={`affidavit-${option.value}`}
                              checked={filters.affidavit.includes(option.value)}
                              onCheckedChange={() => toggleCheckboxFilter('affidavit', option.value)}
                              className="border-slate-300"
                            />
                            <span className="text-sm text-slate-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Invoice Filter (Checkboxes) */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">Invoice</label>
                      <div className="space-y-1.5">
                        {[
                          { value: 'none', label: 'None' },
                          { value: 'draft', label: 'Draft' },
                          { value: 'issued', label: 'Issued' },
                          { value: 'paid', label: 'Paid' }
                        ].map(option => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              id={`invoice-${option.value}`}
                              checked={filters.invoice.includes(option.value)}
                              onCheckedChange={() => toggleCheckboxFilter('invoice', option.value)}
                              className="border-slate-300"
                            />
                            <span className="text-sm text-slate-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Date Range Section */}
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">Date Range</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          { value: 'all', label: 'All Time' },
                          { value: 'today', label: 'Today' },
                          { value: 'week', label: 'Last 7 Days' },
                          { value: 'month', label: 'Last 30 Days' },
                          { value: 'custom', label: 'Custom' }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => handleDatePresetChange(option.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              filters.dateRangePreset === option.value
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Date Inputs */}
                      {(filters.dateRangePreset === 'custom' || filters.dateFrom || filters.dateTo) && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-slate-500 mb-1 block">From</label>
                            <div className="relative">
                              <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters(prev => ({
                                  ...prev,
                                  dateFrom: e.target.value,
                                  dateRangePreset: e.target.value || prev.dateTo ? 'custom' : 'all'
                                }))}
                                className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-slate-500 mb-1 block">To</label>
                            <div className="relative">
                              <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters(prev => ({
                                  ...prev,
                                  dateTo: e.target.value,
                                  dateRangePreset: prev.dateFrom || e.target.value ? 'custom' : 'all'
                                }))}
                                className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          {(filters.dateFrom || filters.dateTo) && (
                            <button
                              onClick={() => setFilters(prev => ({
                                ...prev,
                                dateFrom: '',
                                dateTo: '',
                                dateRangePreset: 'all'
                              }))}
                              className="mt-5 p-2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {filteredJobs.length} of {jobs.length} jobs match filters
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="text-slate-600 hover:text-slate-800"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No {label.toLowerCase()} jobs found
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No jobs match the current filters
            </div>
          ) : (
            <>
              {/* List View */}
              {currentView === 'list' && (
                <>
                  <JobsTable
                    jobs={paginatedJobs}
                    clients={clients}
                    employees={employees}
                    invoices={invoices}
                    isLoading={isLoading}
                    onJobUpdate={onJobUpdate}
                    myCompanyClientId={myCompanyClientId}
                    onUpdateSharedJobStatus={onUpdateSharedJobStatus}
                    selectedJobs={selectedJobs}
                    onJobSelection={onJobSelection}
                    onSelectAll={handleSectionSelectAll}
                  />

                  {/* Section Pagination */}
                  {totalPages > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        Showing {(currentPage - 1) * jobsPerPage + 1}-{Math.min(currentPage * jobsPerPage, filteredJobs.length)} of {filteredJobs.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage(prev => Math.max(1, prev - 1));
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage(prev => Math.min(totalPages, prev + 1));
                          }}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          ›
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Map View */}
              {currentView === 'map' && (
                <div className="p-4">
                  <JobsMap jobs={filteredJobs} isLoading={isLoading} />
                </div>
              )}

              {/* Case View */}
              {currentView === 'case' && (
                <div className="p-4">
                  <CaseView
                    jobs={filteredJobs}
                    clients={clients}
                    employees={employees}
                    courtCases={courtCases}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Routing View */}
              {currentView === 'routing' && (
                <div className="p-4">
                  <RoutingView
                    jobs={filteredJobs}
                    employees={employees}
                    clients={clients}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Kanban View */}
              {currentView === 'kanban' && companySettings?.kanbanBoard?.enabled && (
                <div className="p-4">
                  <KanbanView
                    jobs={filteredJobs}
                    clients={clients}
                    employees={employees}
                    onJobStatusChange={handleJobStatusUpdate}
                    isLoading={isLoading}
                    statusColumns={companySettings?.kanbanBoard?.columns || []}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
