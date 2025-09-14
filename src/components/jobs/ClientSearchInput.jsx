import React, { useState, useEffect } from "react";
import { Client } from "@/api/entities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Plus,
  Building2,
  Check
} from "lucide-react";

export default function ClientSearchInput({ value, onValueChange, onClientSelected, onShowNewClient, selectedClient }) {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (value.length > 0) {
      const filtered = clients.filter(client =>
        client.company_name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowDropdown(true);
    } else {
      setFilteredClients([]);
      setShowDropdown(false);
    }
  }, [value, clients]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const clientsData = await Client.list();
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
    setIsLoading(false);
  };

  const handleClientSelect = (client) => {
    setShowDropdown(false);
    onClientSelected(client);
  };

  const handleInputFocus = () => {
    if (value.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow clicking on items
    setTimeout(() => setShowDropdown(false), 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Search for a client..."
          className="pl-10"
          required
        />
        {selectedClient && (
          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 w-4 h-4" />
        )}
      </div>

      {showDropdown && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
          <CardContent className="p-2 max-h-60 overflow-y-auto">
            {filteredClients.length > 0 ? (
              <div className="space-y-1">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleClientSelect(client)}
                  >
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{client.company_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {client.company_type?.replace('_', ' ')}
                        </Badge>
                        {client.collaborating && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Collaborating
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center">
                <p className="text-slate-500 text-sm mb-3">No clients found matching "{value}"</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onShowNewClient}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New Client
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}