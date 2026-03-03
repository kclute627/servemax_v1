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

export default function ClientSearchInput({ value, onValueChange, onClientSelected, onTextChange, selectedClient, onUseAsNewClient }) {
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedForNewClient, setDismissedForNewClient] = useState(false);
  const searchTimeoutRef = useRef(null);
  const lastSearchResultsRef = useRef({ hasResults: false });
  const currentSearchTermRef = useRef(""); // Track current search to prevent stale results

  // Debounced search effect - triggers after user stops typing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Track the current search term to prevent stale results
    currentSearchTermRef.current = value;

    // Only search if 3+ characters
    if (value.length >= 3) {
      setIsLoading(true);
      if (!dismissedForNewClient) {
        setShowDropdown(true);
      }

      // Debounce search by 300ms
      searchTimeoutRef.current = setTimeout(() => {
        searchClients(value);
      }, 300);
    } else {
      setFilteredClients([]);
      setShowDropdown(value.length > 0); // Show "type 3 chars" message
      setIsLoading(false);
      // Notify parent that there's no valid search (too short)
      if (onTextChange && value.length < 3) {
        onTextChange(value, false);
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value, onTextChange]);

  const searchClients = async (searchTerm) => {
    setIsLoading(true);
    try {
      // Get all clients for this company
      const clientsData = await SecureClientAccess.list();

      // Check if this search is still relevant (user may have typed more)
      if (currentSearchTermRef.current !== searchTerm) {
        console.log('[ClientSearchInput] Ignoring stale search results for:', searchTerm);
        return;
      }

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

      // Double-check search is still current before updating state
      if (currentSearchTermRef.current !== searchTerm) {
        console.log('[ClientSearchInput] Ignoring stale results after filtering for:', searchTerm);
        return;
      }

      console.log('[ClientSearchInput] Filtered results:', {
        count: filtered.length,
        clients: filtered.map(c => c.company_name)
      });

      setFilteredClients(filtered);

      // Hide dropdown if no results found
      if (filtered.length === 0) {
        setShowDropdown(false);
      }

      // Track results and notify parent about text change
      const hasResults = filtered.length > 0;
      lastSearchResultsRef.current = { hasResults };
      if (onTextChange) {
        onTextChange(searchTerm, hasResults);
      }
    } catch (error) {
      console.error("Error searching clients:", error);
      // Only update state if search is still current
      if (currentSearchTermRef.current === searchTerm) {
        setFilteredClients([]);
        lastSearchResultsRef.current = { hasResults: false };
        if (onTextChange) {
          onTextChange(searchTerm, false);
        }
      }
    }
    setIsLoading(false);
  };

  const handleClientSelect = (client) => {
    setShowDropdown(false);
    onClientSelected(client);
  };

  const handleInputFocus = () => {
    if (dismissedForNewClient) return;
    if (value.length > 0 && (value.length < 3 || filteredClients.length > 0 || isLoading)) {
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
          onChange={(e) => {
            if (dismissedForNewClient) setDismissedForNewClient(false);
            onValueChange(e.target.value);
          }}
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
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    onClick={() => {
                      setShowDropdown(false);
                      setDismissedForNewClient(true);
                      if (onUseAsNewClient) {
                        onUseAsNewClient(value);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Create "{value}" as new client
                  </button>
                </div>
              </>
            ) : (
              <div className="p-3 text-center">
                <p className="text-slate-500 text-sm">No clients found matching "{value}"</p>
                <p className="text-blue-600 text-xs mt-1">Keep typing to create a new client</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}