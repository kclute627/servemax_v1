import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  FileText,
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Calendar,
  Building2,
  User,
  AlertCircle,
  ExternalLink,
  Filter,
  X
} from "lucide-react";
import { FirebaseFunctions } from "@/firebase/functions";
import { format } from "date-fns";

export default function LegacyJobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState({
    service_status: searchParams.get("status") || "",
    job_status: searchParams.get("job_status") || ""
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load jobs on mount and filter changes
  useEffect(() => {
    loadJobs(true);
  }, [filters]);

  const loadJobs = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setCursor(null);
    }

    try {
      // If there's a search term, use search endpoint
      if (searchTerm.trim()) {
        setSearching(true);
        const result = await FirebaseFunctions.searchLegacyJobs(searchTerm, filters);
        setJobs(result.jobs || []);
        setHasMore(false);
        setCursor(null);
      } else {
        // Otherwise use paginated list
        const result = await FirebaseFunctions.getLegacyJobs(
          50,
          reset ? null : cursor,
          filters
        );

        if (reset) {
          setJobs(result.jobs || []);
        } else {
          setJobs(prev => [...prev, ...(result.jobs || [])]);
        }

        setCursor(result.cursor);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error("Failed to load legacy jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load legacy jobs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSearch = useCallback(() => {
    // Update URL params
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (filters.service_status) params.set("status", filters.service_status);
    if (filters.job_status) params.set("job_status", filters.job_status);
    setSearchParams(params);

    loadJobs(true);
  }, [searchTerm, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? "" : value
    }));
  };

  const clearFilters = () => {
    setFilters({ service_status: "", job_status: "" });
    setSearchTerm("");
    setSearchParams({});
  };

  const hasActiveFilters = filters.service_status || filters.job_status || searchTerm;

  const getServiceStatusBadge = (status) => {
    const config = {
      "Served": { color: "bg-green-100 text-green-700", label: "Served" },
      "Non-Service": { color: "bg-red-100 text-red-700", label: "Non-Service" },
      "Attempted": { color: "bg-amber-100 text-amber-700", label: "Attempted" },
    };

    const { color, label } = config[status] || { color: "bg-slate-100 text-slate-700", label: status || "Unknown" };

    return (
      <Badge className={`${color} text-xs`}>
        {label}
      </Badge>
    );
  };

  const getJobStatusBadge = (status) => {
    const color = status === "Closed" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700";
    return (
      <Badge variant="outline" className={`${color} text-xs`}>
        {status || "Unknown"}
      </Badge>
    );
  };

  const formatAddress = (addresses) => {
    if (!addresses || addresses.length === 0) return "No address";
    const primary = addresses.find(a => a.primary) || addresses[0];
    return `${primary.address1 || ""}, ${primary.city || ""}, ${primary.state || ""}`.replace(/^,\s*/, "").replace(/,\s*$/, "");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Archive className="w-8 h-8 text-slate-600" />
              <h1 className="text-3xl font-bold text-slate-900">ServeManager Archive</h1>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                Read-Only
              </Badge>
            </div>
            <p className="text-slate-600">
              View your historical data imported from ServeManager. This data cannot be modified.
            </p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search jobs, recipients, case numbers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? "bg-slate-100" : ""}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5">
                        {[filters.service_status, filters.job_status, searchTerm].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Service Status:</label>
                    <Select
                      value={filters.service_status || "all"}
                      onValueChange={(value) => handleFilterChange("service_status", value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Served">Served</SelectItem>
                        <SelectItem value="Non-Service">Non-Service</SelectItem>
                        <SelectItem value="Attempted">Attempted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Job Status:</label>
                    <Select
                      value={filters.job_status || "all"}
                      onValueChange={(value) => handleFilterChange("job_status", value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}

          {/* Empty State */}
          {!loading && jobs.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {searchTerm || hasActiveFilters ? "No jobs found" : "No legacy jobs imported"}
                  </h3>
                  <p className="text-slate-500 mb-4">
                    {searchTerm || hasActiveFilters
                      ? "Try adjusting your search or filters"
                      : "Import your ServeManager data from Settings → Data Import"}
                  </p>
                  {!(searchTerm || hasActiveFilters) && (
                    <Button onClick={() => navigate("/Settings?tab=data-import")}>
                      Go to Data Import
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jobs List */}
          {!loading && jobs.length > 0 && (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/LegacyJobDetails?id=${job.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-slate-900">
                            #{job.servemanager_job_number || job._serveManagerId}
                          </span>
                          {getServiceStatusBadge(job.service_status)}
                          {getJobStatusBadge(job.job_status)}
                        </div>

                        <div className="flex items-center gap-2 text-slate-700 mb-1">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium truncate">
                            {job.recipient?.name || "Unknown Recipient"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{formatAddress(job.addresses)}</span>
                        </div>

                        {job.court_case?.case_number && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Case: {job.court_case.case_number}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Meta Info */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm text-slate-500 mb-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(job.created_at)}
                        </div>

                        {job.client_company?.name && (
                          <div className="flex items-center gap-1 text-sm text-slate-500 justify-end">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate max-w-[150px]">{job.client_company.name}</span>
                          </div>
                        )}

                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/LegacyJobDetails?id=${job.id}`);
                            }}
                          >
                            View Details
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => loadJobs(false)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    Load More
                  </Button>
                </div>
              )}

              {/* Results Count */}
              <div className="text-center text-sm text-slate-500 py-2">
                Showing {jobs.length} jobs
                {!hasMore && jobs.length > 0 && " (end of results)"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
