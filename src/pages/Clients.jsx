import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

import ClientsTable from "../components/clients/ClientsTable";
import NewClientDialog from "../components/clients/NewClientDialog";
import { useGlobalData } from "../components/GlobalDataContext";

export default function ClientsPage() {
  const { clients, isLoading, refreshData } = useGlobalData();
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);

  const filterClients = useCallback(() => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contacts?.some(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
        client.contacts?.some(c => c.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  useEffect(() => {
    filterClients();
  }, [filterClients]);

  const handleClientCreated = () => {
    refreshData();
    setShowNewClientDialog(false);
  };

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

          {/* Search */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search clients by company name, contact, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

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