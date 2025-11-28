import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Users, DollarSign, TrendingUp, AlertCircle, Filter, X } from "lucide-react";
import {
  Select,
  SelectItem,
} from "@/components/ui/select";

import ClientsTable from "../components/clients/ClientsTable";
import NewClientDialog from "../components/clients/NewClientDialog";
import { useGlobalData } from "../components/GlobalDataContext";

export default function ClientsPage() {
  const { clients, isLoading, refreshData, jobs } = useGlobalData();
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [error, setError] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    partner: "all" // "all", "partners", "non-partners"
  });

  // Loading timeout to show message if stuck
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    const partners = clients.filter(c => c.is_job_share_partner === true).length;
    const totalRevenue = jobs.reduce((sum, job) => {
      const jobTotal = job.total_fee || job.service_fee || 0;
      return sum + jobTotal;
    }, 0);

    return {
      total: clients.length,
      active: activeClients,
      partners: partners,
      revenue: totalRevenue,
      jobCount: jobs.length
    };
  }, [clients, jobs]);

  const filterClients = useCallback(() => {
    let filtered = clients;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contacts?.some(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
        client.contacts?.some(c => c.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (filters.type !== "all") {
      filtered = filtered.filter(client => client.company_type === filters.type);
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(client => client.status === filters.status);
    }

    // Partner filter
    if (filters.partner === "partners") {
      filtered = filtered.filter(client => client.is_job_share_partner === true);
    } else if (filters.partner === "non-partners") {
      filtered = filtered.filter(client => client.is_job_share_partner !== true);
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm, filters]);

  useEffect(() => {
    filterClients();
  }, [filterClients]);

  const handleClientCreated = () => {
    refreshData();
    setShowNewClientDialog(false);
  };

  const hasActiveFilters = filters.type !== "all" || filters.status !== "all" || filters.partner !== "all";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Clients</h1>
              <p className="text-slate-600">Manage your client relationships</p>
            </div>
            <Button
              onClick={() => setShowNewClientDialog(true)}
              className="bg-slate-900 hover:bg-slate-800 gap-2"
            >
              <Plus className="w-4 h-4" />
              New Client
            </Button>
          </div>

          {/* Loading Timeout Warning */}
          {loadingTimeout && isLoading && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Still loading clients...</p>
                  <p className="text-sm text-amber-700">This is taking longer than expected. Please check your connection.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Clients</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Clients</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{stats.active}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Job Share Partners</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{stats.partners}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search clients by company name, contact, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Select value={filters.type} onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="law_firm">Law Firm</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="process_serving">Process Serving Company</SelectItem>
                      <SelectItem value="independent_process_server">Independent Process Server</SelectItem>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Select value={filters.partner} onChange={(e) => setFilters(prev => ({ ...prev, partner: e.target.value }))}>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="partners">Job Share Partners</SelectItem>
                      <SelectItem value="non-partners">Regular Clients</SelectItem>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={() => setFilters({ type: "all", status: "all", partner: "all" })}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                {(searchTerm || hasActiveFilters) && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Filter className="w-4 h-4" />
                    <span>{filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'} found</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Error loading clients</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Clients Table */}
          <ClientsTable
            clients={filteredClients}
            isLoading={isLoading}
            onClientUpdate={refreshData}
          />

          {/* New Client Dialog */}
          <NewClientDialog
            open={showNewClientDialog}
            onOpenChange={setShowNewClientDialog}
            onClientCreated={handleClientCreated}
          />
        </div>
      </div>
    </div>
  );
}