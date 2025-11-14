import React, { useState, useEffect, useRef } from 'react';
import { SecureCourtAccess } from "@/firebase/multiTenantAccess";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, Loader2, X, Plus } from "lucide-react";

export default function CourtAutocomplete({ 
  value, 
  onChange, 
  onCourtSelect,
  selectedCourt,
  onClearSelection,
  disabled = false,
  placeholder = "Start typing a court name...",
  ...props 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const justSelectedRef = useRef(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Don't search if disabled
    if (disabled) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!value || value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      await fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, disabled]);

  const fetchSuggestions = async (query) => {
    setIsLoading(true);
    try {
      // Query only courts created by the user's company
      const courts = await SecureCourtAccess.list();

      const normalizedQuery = query.toLowerCase().trim();

      const filtered = courts.filter(court =>
        court.branch_name?.toLowerCase().includes(normalizedQuery) ||
        court.county?.toLowerCase().includes(normalizedQuery) ||
        court.court_name?.toLowerCase().includes(normalizedQuery)
      );

      console.log('[CourtAutocomplete] Search results:', {
        query: normalizedQuery,
        total_courts: courts.length,
        filtered: filtered.length
      });

      setSuggestions(filtered);
      // Show suggestions dropdown when query is 3+ characters
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching court suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setIsLoading(false);
  };

  const handleSuggestionSelect = (court) => {
    setIsLoading(false);
    setShowSuggestions(false);
    setSuggestions([]);
    justSelectedRef.current = true;

    if (onCourtSelect) {
      onCourtSelect(court);
    }
  };

  const handleInputChange = (e) => {
    justSelectedRef.current = false;
    onChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    const totalItems = suggestions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputFocus = () => {
    if (disabled) return;

    if (value.length >= 3 && !justSelectedRef.current && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e) => {
    if (suggestionsRef.current?.contains(e.relatedTarget)) {
      return;
    }
    setTimeout(() => setShowSuggestions(false), 200);
  };

  if (selectedCourt) {
    return (
      <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">{selectedCourt.branch_name}</p>
            {selectedCourt.county && <p className="text-sm text-slate-600">{selectedCourt.county}</p>}
            {selectedCourt.address?.city && (
              <p className="text-xs text-slate-500">{selectedCourt.address.city}, {selectedCourt.address.state}</p>
            )}
          </div>
        </div>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-slate-500 hover:bg-slate-200"
          onClick={onClearSelection}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          autoComplete="off"
          data-form-type="other"
          disabled={disabled}
          {...props}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          {!isLoading && showSuggestions && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowSuggestions(false);
                setSuggestions([]);
                inputRef.current?.blur();
              }}
              className="h-5 w-5 p-0 hover:bg-slate-100"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg max-h-60 overflow-y-auto">
          <CardContent ref={suggestionsRef} className="p-2">
            {suggestions.map((court, index) => (
              <div
                key={court.id}
                className={`flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors ${
                  selectedIndex === index ? 'bg-slate-100' : ''
                }`}
                onMouseDown={() => handleSuggestionSelect(court)}
              >
                <Landmark className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">{court.branch_name}</p>
                  <p className="text-sm text-slate-600">{court.county}</p>
                  {court.address?.city && (
                    <p className="text-xs text-slate-500">{court.address.city}, {court.address.state}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}