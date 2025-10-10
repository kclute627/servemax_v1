import React, { useState, useEffect, useRef } from "react";
import { SecureClientAccess } from "@/firebase/multiTenantAccess";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { matchesSearchTerms } from "@/utils/searchTerms";
import {
  Search,
  Plus,
  Building2,
  Check,
  Loader2
} from "lucide-react";

export default function ClientSearchInput({ value, onValueChange, onClientSelected, onShowNewClient, selectedClient }) {
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Debounced search effect - triggers after user stops typing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if 3+ characters
    if (value.length >= 3) {
      setIsLoading(true);
      setShowDropdown(true);

      // Debounce search by 300ms
      searchTimeoutRef.current = setTimeout(() => {
        searchClients(value);
      }, 300);
    } else {
      setFilteredClients([]);
      setShowDropdown(value.length > 0); // Show "type 3 chars" message
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value]);

  const searchClients = async (searchTerm) => {
    setIsLoading(true);
    try {
      // Get all clients for this company
      const clientsData = await SecureClientAccess.list();

      console.log('[ClientSearchInput] Retrieved clients from database:', {
        count: clientsData.length,
        clients: clientsData.map(c => ({
          id: c.id,
          name: c.company_name,
          has_search_terms: !!c.search_terms,
          search_terms: c.search_terms
        }))
      });

      const normalizedSearchTerm = searchTerm.toLowerCase().trim();

      console.log('[ClientSearchInput] Searching for:', normalizedSearchTerm);

      // Filter using search_terms array if available, fallback to company_name
      const filtered = clientsData.filter(client => {
        // First try using search_terms array (more robust)
        if (client.search_terms && Array.isArray(client.search_terms)) {
          return matchesSearchTerms(client.search_terms, normalizedSearchTerm);
        }

        // Fallback to company_name for older clients without search_terms
        const fallbackMatch = client.company_name?.toLowerCase().includes(normalizedSearchTerm);
        console.log('[ClientSearchInput] Fallback match for', client.company_name, ':', fallbackMatch);
        return fallbackMatch;
      });

      console.log('[ClientSearchInput] Filtered results:', {
        count: filtered.length,
        clients: filtered.map(c => c.company_name)
      });

      setFilteredClients(filtered);
    } catch (error) {
      console.error("Error searching clients:", error);
      setFilteredClients([]);
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
            {value.length < 3 ? (
              <div className="p-3 text-center">
                <p className="text-slate-500 text-sm">Type at least 3 characters to search...</p>
              </div>
            ) : isLoading ? (
              <div className="p-3 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                <p className="text-slate-500 text-sm mt-2">Searching...</p>
              </div>
            ) : filteredClients.length > 0 ? (
              <>
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
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onShowNewClient}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Client
                  </Button>
                </div>
              </>
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