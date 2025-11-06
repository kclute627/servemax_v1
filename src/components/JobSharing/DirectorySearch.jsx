import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Loader2, Search, MapPin, DollarSign } from 'lucide-react';

const DirectorySearch = ({ jobId, jobZipCode, onShareRequest }) => {
  const [searchZip, setSearchZip] = useState(jobZipCode || '');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [proposedFee, setProposedFee] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');
  const [sending, setSending] = useState(false);

  const searchDirectory = async () => {
    if (!searchZip || searchZip.length < 5) {
      alert('Please enter a valid ZIP code');
      return;
    }

    setLoading(true);
    try {
      // Query directory by zip
      const directoryRef = collection(db, 'directory');
      const q = query(
        directoryRef,
        where('zip', '==', searchZip),
        where('is_active', '==', true)
      );

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSearchResults(results);

      if (results.length === 0) {
        alert('No companies found in this ZIP code');
      }
    } catch (error) {
      console.error('Directory search error:', error);
      alert('Failed to search directory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendShareRequest = async (targetCompany) => {
    if (!proposedFee || parseFloat(proposedFee) <= 0) {
      alert('Please enter a valid fee amount');
      return;
    }

    setSending(true);
    try {
      const createRequest = httpsCallable(functions, 'createJobShareRequest');
      const result = await createRequest({
        jobId,
        targetCompanyId: targetCompany.company_id,
        targetUserId: targetCompany.user_id || targetCompany.owner_id,
        proposedFee: parseFloat(proposedFee),
        expiresInHours: expiresIn === 'none' ? null : parseInt(expiresIn)
      });

      console.log('Share request created:', result.data);
      alert('Job share request sent successfully!');
      setSelectedCompany(null);
      setProposedFee('');
      onShareRequest && onShareRequest();
    } catch (error) {
      console.error('Share request error:', error);
      alert(`Failed to send share request: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchDirectory();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Directory
          </CardTitle>
          <CardDescription>
            Find process servers by ZIP code to share this job
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter ZIP code"
              value={searchZip}
              onChange={(e) => setSearchZip(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={5}
              className="max-w-xs"
            />
            <Button onClick={searchDirectory} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Found {searchResults.length} {searchResults.length === 1 ? 'company' : 'companies'}
          </h3>
          <div className="grid gap-4">
            {searchResults.map(company => (
              <Card key={company.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold text-lg">{company.name}</h4>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {company.city}, {company.state} {company.zip}
                      </div>

                      {company.service_radius_miles && (
                        <Badge variant="outline">
                          Service Radius: {company.service_radius_miles} miles
                        </Badge>
                      )}

                      {company.rates?.standard_service && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4" />
                          Standard Rate: ${company.rates.standard_service}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedCompany(company);
                        // Pre-fill with their standard rate if available
                        if (company.rates?.standard_service) {
                          setProposedFee(company.rates.standard_service.toString());
                        }
                      }}
                      variant="default"
                    >
                      Send Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Share Request Dialog */}
      {selectedCompany && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Share Job with {selectedCompany.name}</CardTitle>
            <CardDescription>
              Configure the details of your job share request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Your Fee to {selectedCompany.name}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl">$</span>
                <Input
                  type="number"
                  value={proposedFee}
                  onChange={(e) => setProposedFee(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  className="max-w-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Request Expires In</label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="24">24 Hours</SelectItem>
                  <SelectItem value="none">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => sendShareRequest(selectedCompany)}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Request'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCompany(null);
                  setProposedFee('');
                }}
                disabled={sending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DirectorySearch;
