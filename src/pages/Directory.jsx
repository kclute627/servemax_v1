import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Loader2, Server, MapPin, Phone, Mail, Info } from "lucide-react";
import { findDirectoryCompanies } from "@/api/functions";

export default function DirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);

    try {
      console.log('Searching for companies near ZIP:', searchTerm);
      const response = await findDirectoryCompanies({ zip: searchTerm });
      console.log('Function response:', response);
      
      if (response && response.data) {
        if (response.data.companies && Array.isArray(response.data.companies)) {
          setResults(response.data.companies);
          console.log('Found companies:', response.data.companies.length);
        } else if (response.data.error) {
          setError(response.data.error);
        } else {
          setError("Received an unexpected response from the server.");
        }
      } else {
        setError("No response received from the server.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 404) {
        setError("Could not find location for the provided ZIP code. Please try a different ZIP code.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
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
          <div>
            <p className="text-xl font-bold text-slate-900">{company.name}</p>
            <p className="text-sm font-medium text-blue-600">{company.distance.toFixed(1)} miles away</p>
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
            <p className="text-lg text-slate-600">Find and collaborate with other process serving companies.</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Enter a ZIP code to find nearby companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
              </Button>
            </div>
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
                <h3 className="text-xl font-semibold">No Companies Found</h3>
                <p className="text-slate-500 mt-2">No companies were found in the directory near that ZIP code. Try another location.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((company, index) => (
                  <CompanyCard key={index} company={company} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}