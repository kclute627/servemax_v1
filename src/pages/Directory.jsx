import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Loader2, Server, MapPin, Phone, Mail, Info, Navigation } from "lucide-react";
import { DirectoryManager } from "@/firebase/schemas";
import { isValidZipCode, formatDistance } from "@/utils/geolocation";

export default function DirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const zipCode = searchTerm.trim();

    setIsLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);

    try {
      console.log('Searching for companies near ZIP:', zipCode);

      // Validate ZIP code format
      if (!isValidZipCode(zipCode)) {
        setError("Please enter a valid 5-digit ZIP code.");
        setIsLoading(false);
        return;
      }

      // Use distance-based search for ZIP codes
      const companies = await DirectoryManager.searchDirectoryByDistance(
        zipCode,
        50 // Search within 50 miles by default
      );

      console.log(`Found ${companies.length} companies within 50 miles`);

      // Transform data to match expected format (companies already have distance calculated)
      const transformedResults = companies.map(company => ({
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: `${company.address}, ${company.city}, ${company.state} ${company.zip}`,
        blurb: company.blurb,
        distance: company.distance, // Now contains actual calculated distance
        company_type: company.company_type,
        services_offered: company.services_offered,
        rating_average: company.rating_average,
        total_jobs_completed: company.total_jobs_completed
      }));

      setResults(transformedResults);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err.message || "Failed to search directory. Please try a different ZIP code or try again later.");
    }

    setIsLoading(false);
  };

  const CompanyCard = ({ company }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-slate-900">{company.name}</p>
                <p className="text-sm font-medium text-blue-600">
                  {company.company_type === 'process_serving' ? 'Process Serving Company' : 'Independent Contractor'}
                </p>
              </div>
              {company.distance !== undefined && (
                <div className="flex items-center gap-1 text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-full">
                  <Navigation className="w-3 h-3" />
                  <span>{formatDistance(company.distance)}</span>
                </div>
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-slate-600 italic">"{company.blurb || "No description provided."}"</p>
        <div className="pt-3 border-t space-y-2 text-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{company.address}</span>
          </div>
          {company.phone && (
            <div className="flex items-center gap-3 text-slate-700">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <a href={`tel:${company.phone}`} className="hover:underline">{company.phone}</a>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-3 text-slate-700">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <a href={`mailto:${company.email}`} className="hover:underline">{company.email}</a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">ServeMax Directory</h1>
            <p className="text-lg text-slate-600">Find process serving companies near you by entering a ZIP code.</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Enter a 5-digit ZIP code (e.g., 10001)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                  maxLength={5}
                  pattern="[0-9]{5}"
                />
              </div>
              <Button type="submit" size="lg" className="h-12" disabled={isLoading || !searchTerm.trim()}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              We'll search for companies within 50 miles and sort them by distance.
            </p>
          </form>

          {/* Results */}
          <div>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Search Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : searched && results.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Navigation className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold">No Companies Found Within 50 Miles</h3>
                <p className="text-slate-500 mt-2">
                  No process serving companies were found within 50 miles of that ZIP code.
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Try searching a different ZIP code or contact us to add companies in your area.
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {/* Results Summary */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      Found {results.length} companies within 50 miles
                    </span>
                  </div>
                  <span className="text-sm text-blue-700">
                    Sorted by distance (closest first)
                  </span>
                </div>

                {/* Company Cards */}
                {results.map((company, index) => (
                  <CompanyCard key={index} company={company} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}