import React, { useState, useEffect, useRef } from 'react';
import { CourtCase } from "@/api/entities";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, X } from "lucide-react";

export default function CaseNumberAutocomplete({ 
  value, 
  onChange, 
  onCaseSelect,
  placeholder = "Enter case number...",
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
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!value || value.length < 2) {
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
  }, [value]);

  const fetchSuggestions = async (query) => {
    setIsLoading(true);
    try {
      const cases = await CourtCase.list();
      const filtered = cases.filter(courtCase => 
        courtCase.case_number?.toLowerCase().includes(query.toLowerCase()) ||
        courtCase.case_name?.toLowerCase().includes(query.toLowerCase()) ||
        courtCase.plaintiff?.toLowerCase().includes(query.toLowerCase()) ||
        courtCase.defendant?.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching case suggestions:', error);
      setSuggestions([]);
    }
    setIsLoading(false);
  };

  const handleSuggestionSelect = (courtCase) => {
    setIsLoading(false);
    setShowSuggestions(false);
    setSuggestions([]);
    justSelectedRef.current = true;
    
    // Update the case number field
    onChange(courtCase.case_number);
    
    if (onCaseSelect) {
      onCaseSelect(courtCase);
    }
  };

  const handleInputChange = (e) => {
    justSelectedRef.current = false;
    onChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
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
    if (value.length >= 2 && !justSelectedRef.current && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e) => {
    if (suggestionsRef.current?.contains(e.relatedTarget)) {
      return;
    }
    setTimeout(() => setShowSuggestions(false), 200);
  };

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
          {...props}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          {!isLoading && showSuggestions && (
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
            {suggestions.map((courtCase, index) => (
              <div
                key={courtCase.id}
                className={`flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors ${
                  selectedIndex === index ? 'bg-slate-100' : ''
                }`}
                onMouseDown={() => handleSuggestionSelect(courtCase)}
              >
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">{courtCase.case_number}</p>
                  <p className="text-sm text-slate-600">{courtCase.case_name}</p>
                  <p className="text-xs text-slate-500">
                    {courtCase.court_name} • {courtCase.court_county}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}