import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Loader2, Search, MapPin, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

const DirectorySearch = ({ jobId, jobZipCode, onShareRequest }) => {
  const { toast } = useToast();
  const [searchZip, setSearchZip] = useState(jobZipCode || '');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [proposedFee, setProposedFee] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');
  const [sending, setSending] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  const searchDirectory = async () => {
    if (!searchZip || searchZip.length < 5) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please enter a valid ZIP code", });
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
        toast({ title: "No Results", description: "No companies found in this ZIP code", });
      }
    } catch (error) {
      console.error('Directory search error:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to search directory. Please try again.", });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyUser = async (company) => {
    setFetchingUser(true);
    try {
      // Fetch the company document to get the primary user
      const companyRef = doc(db, 'companies', company.company_id);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        throw new Error('Company not found');
      }

      const companyData = companyDoc.data();

      // Try to find the primary user ID from various possible fields
      let userId = companyData.owner_id ||
                   companyData.primary_user_id ||
                   companyData.created_by;

      // If no direct user field, try to get from users array
      if (!userId && companyData.users && companyData.users.length > 0) {
        // Get the first admin user, or just the first user
        const adminUser = companyData.users.find(u => u.role === 'admin' || u.employee_role === 'admin');
        userId = adminUser ? adminUser.id : companyData.users[0].id;
      }

      if (!userId) {
        throw new Error('Could not find a user for this company');
      }

      // Add the user_id to the company object
      const companyWithUser = {
        ...company,
        user_id: userId
      };

      setSelectedCompany(companyWithUser);

      // Pre-fill with their standard rate if available, otherwise default to $75
      const defaultFee = company.rates?.standard_service || 75;
      setProposedFee(defaultFee.toString());

      // Reset customize view
      setShowCustomize(false);
    } catch (error) {
      console.error('Error fetching company user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to get company information: ${error.message}`,
      });
      setSelectedCompany(null);
    } finally {
      setFetchingUser(false);
    }
  };

  const sendShareRequest = async () => {
    if (!selectedCompany) return;

    if (!proposedFee || parseFloat(proposedFee) <= 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please enter a valid fee amount", });
      return;
    }

    if (!selectedCompany.user_id) {
      toast({ variant: "destructive", title: "Validation Error", description: "Missing user information for target company", });
      return;
    }

    setSending(true);
    try {
      const createRequest = httpsCallable(functions, 'createJobShareRequest');
      const result = await createRequest({
        jobId,
        targetCompanyId: selectedCompany.company_id,
        targetUserId: selectedCompany.user_id,
        proposedFee: parseFloat(proposedFee),
        expiresInHours: expiresIn === 'none' ? null : parseInt(expiresIn)
      });

      console.log('Share request created:', result.data);
      toast({ title: "Request Sent", description: "Job share request sent successfully!", });
      setSelectedCompany(null);
      setProposedFee('');
      setExpiresIn('24');
      setShowCustomize(false);
      onShareRequest && onShareRequest();
    } catch (error) {
      console.error('Share request error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to send share request: ${error.message}`,
      });
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    setSelectedCompany(null);
    setProposedFee('');
    setExpiresIn('24');
    setShowCustomize(false);
  };

  const getExpirationLabel = () => {
    if (expiresIn === '1') return '1 hour';
    if (expiresIn === '24') return '24 hours';
    return 'never expires';
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
            {searchResults.map(company => {
              const isSelected = selectedCompany?.id === company.id;
              const defaultFee = company.rates?.standard_service || 75;

              return (
                <Card key={company.id} className={`hover:shadow-md transition-shadow ${isSelected ? 'border-2 border-primary' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Company Info and Action Button */}
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

                        {!isSelected && (
                          <Button
                            onClick={() => fetchCompanyUser(company)}
                            variant="default"
                            disabled={fetchingUser}
                          >
                            {fetchingUser ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              `Send Request - $${defaultFee} (${getExpirationLabel()})`
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Expandable Request Form */}
                      {isSelected && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              Sending to: <span className="text-primary">{company.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCustomize(!showCustomize)}
                              className="gap-2"
                            >
                              {showCustomize ? (
                                <>
                                  Hide Details <ChevronUp className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  Customize <ChevronDown className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Default values display */}
                          {!showCustomize && (
                            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Fee:</span>
                                <span className="font-semibold">${proposedFee}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Expires in:</span>
                                <span className="font-semibold">{getExpirationLabel()}</span>
                              </div>
                            </div>
                          )}

                          {/* Customization form */}
                          {showCustomize && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Your Fee to {company.name}
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
                                    <SelectValue placeholder="24 Hours" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 Hour</SelectItem>
                                    <SelectItem value="24">24 Hours</SelectItem>
                                    <SelectItem value="none">Never</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={sendShareRequest}
                              disabled={sending}
                              className="flex-1"
                            >
                              {sending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                `Send Request - $${proposedFee} (${getExpirationLabel()})`
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancel}
                              disabled={sending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorySearch;
