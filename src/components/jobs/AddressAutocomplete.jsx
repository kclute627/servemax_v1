
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X } from "lucide-react";
import { googlePlaces, googlePlaceDetails } from "@/api/functions";

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onAddressSelect, 
  onLoadingChange,
  placeholder = "Start typing an address...",
  ...props 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedAddress, setSelectedAddress] = useState(null); // Track the selected address text
  const [isFocused, setIsFocused] = useState(false); // New state
  const justSelectedRef = useRef(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Only run search logic if the input is focused
    if (!isFocused) {
      setShowSuggestions(false);
      return;
    }

    // Guard: Don't fetch if a selection was just made.
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    // Don't show suggestions if user has selected an address and hasn't deleted enough
    if (selectedAddress && value.length > 0) {
      // Only show suggestions again if user has deleted 3+ characters from selected address
      const charsDeleted = selectedAddress.length - value.length;
      if (charsDeleted < 3) {
        return;
      }
    }

    if (!value || value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      if (!value) {
        setSelectedAddress(null); // Reset when completely cleared
      }
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
  }, [value, selectedAddress, isFocused]); // Dependency on isFocused is key

  const fetchSuggestions = async (query) => {
    setIsLoading(true);
    try {
      const response = await googlePlaces({ query });
      if (response.data?.suggestions) {
        setSuggestions(response.data.suggestions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
    setIsLoading(false);
  };

  const handleSuggestionSelect = async (suggestion) => {
    setIsLoading(true);
    if (onLoadingChange) onLoadingChange(true);
    setShowSuggestions(false);
    setSuggestions([]);
    justSelectedRef.current = true;

    try {
      const response = await googlePlaceDetails({ place_id: suggestion.place_id });
      if (response.data?.address) {
        const addressText = response.data.address.address1;
        setSelectedAddress(addressText); // Store the selected address text
        if (onAddressSelect) {
          onAddressSelect(response.data.address);
        }
        onChange(addressText);
      } else {
        setSelectedAddress(suggestion.description);
        onChange(suggestion.description);
      }
    } catch (error) {
      console.error('Error fetching address details:', error);
      setSelectedAddress(suggestion.description);
      onChange(suggestion.description);
    }

    setIsLoading(false);
    if (onLoadingChange) onLoadingChange(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    justSelectedRef.current = false;
    onChange(newValue);
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
    setIsFocused(true); // Set focus state
    // Only show suggestions if we have valid conditions AND user hasn't made a recent selection
    if (value.length >= 3 && !justSelectedRef.current && suggestions.length > 0) {
      // Additional check: if there's a selected address, only show if significantly different
      if (selectedAddress) {
        const charsDeleted = selectedAddress.length - value.length;
        if (charsDeleted >= 3) {
          setShowSuggestions(true);
        }
      } else {
        setShowSuggestions(true);
      }
    }
  };

  const handleInputBlur = (e) => {
    setIsFocused(false); // Unset focus state
    if (suggestionsRef.current?.contains(e.relatedTarget)) {
      return;
    }
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const clearInput = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedAddress(null); // Reset selected address
    justSelectedRef.current = false;
    inputRef.current?.focus();
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
          autoComplete="new-password"
          data-form-type="other"
          {...props}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          {!isLoading && value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearInput}
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
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id}
                className={`flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors ${
                  selectedIndex === index ? 'bg-slate-100' : ''
                }`}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">{suggestion.main_text}</p>
                  <p className="text-sm text-slate-600">{suggestion.secondary_text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
