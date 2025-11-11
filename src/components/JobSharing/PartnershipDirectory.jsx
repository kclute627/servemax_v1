import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { Loader2, Search, MapPin, CheckCircle, Users, Send, Clock } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const PartnershipDirectory = ({ onPartnerAdded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchZip, setSearchZip] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);
  const [existingPartners, setExistingPartners] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user?.company_id) return;

    // Fetch existing partners and pending requests to filter them out
    const fetchPartnersAndRequests = async () => {
      try {
        const companyDoc = await getDoc(doc(db, 'companies', user.company_id));
        if (companyDoc.exists()) {
          const partners = companyDoc.data().job_share_partners || [];
          setExistingPartners(partners.map(p => p.partner_company_id));
        }

        // Fetch pending partnership requests
        const requestsRef = collection(db, 'partnership_requests');
        const sentRequestsQuery = query(
          requestsRef,
          where('requesting_company_id', '==', user.company_id),
          where('status', '==', 'pending')
        );
        const receivedRequestsQuery = query(
          requestsRef,
          where('target_company_id', '==', user.company_id),
          where('status', '==', 'pending')
        );

        const [sentSnapshot, receivedSnapshot] = await Promise.all([
          getDocs(sentRequestsQuery),
          getDocs(receivedRequestsQuery)
        ]);

        const sentRequests = sentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          direction: 'sent'
        }));

        const receivedRequests = receivedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          direction: 'received'
        }));

        const allPendingRequests = [...sentRequests, ...receivedRequests];
        setPendingRequests(allPendingRequests);

        // Debug logging
        console.log('[PartnershipDirectory] Loaded existing partners:', existingPartners);
        console.log('[PartnershipDirectory] Loaded pending requests:', allPendingRequests);
        console.log('[PartnershipDirectory] Sent requests:', sentRequests.map(r => r.target_company_id));
        console.log('[PartnershipDirectory] Received requests:', receivedRequests.map(r => r.requesting_company_id));
      } catch (error) {
        console.error('Error fetching partners and requests:', error);
      }
    };

    fetchPartnersAndRequests();
  }, [user?.company_id]);

  const hasPendingRequest = (companyId) => {
    return pendingRequests.some(req =>
      req.requesting_company_id === companyId ||
      req.target_company_id === companyId
    );
  };

  const getPendingRequestDirection = (companyId) => {
    const request = pendingRequests.find(req =>
      req.requesting_company_id === companyId ||
      req.target_company_id === companyId
    );
    return request ? request.direction : null;
  };

  const searchDirectory = async () => {
    if (!searchZip || searchZip.length < 5) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid ZIP code",
      });
      return;
    }

    setLoading(true);
    try {
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
      })).filter(company =>
        company.company_id !== user.company_id // Not your own company
        // Don't filter out partners or pending requests - we'll show them with status badges
      );

      setSearchResults(results);

      if (results.length === 0) {
        toast({
          title: "No Results",
          description: "No available companies found in this ZIP code",
        });
      }
    } catch (error) {
      console.error('Directory search error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to search directory. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendPartnershipRequest = async (targetCompany) => {
    setSending(targetCompany.company_id);
    try {
      const createRequest = httpsCallable(functions, 'createPartnershipRequest');
      await createRequest({
        targetCompanyId: targetCompany.company_id,
        message: message.trim()
      });

      toast({
        title: "Request Sent",
        description: `Partnership request sent to ${targetCompany.name}!`,
      });
      setSelectedCompany(null);
      setMessage('');

      // Refresh pending requests to show updated status
      if (user?.company_id) {
        const requestsRef = collection(db, 'partnership_requests');
        const sentRequestsQuery = query(
          requestsRef,
          where('requesting_company_id', '==', user.company_id),
          where('status', '==', 'pending')
        );
        const receivedRequestsQuery = query(
          requestsRef,
          where('target_company_id', '==', user.company_id),
          where('status', '==', 'pending')
        );

        const [sentSnapshot, receivedSnapshot] = await Promise.all([
          getDocs(sentRequestsQuery),
          getDocs(receivedRequestsQuery)
        ]);

        const sentRequests = sentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          direction: 'sent'
        }));

        const receivedRequests = receivedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          direction: 'received'
        }));

        const allPendingRequests = [...sentRequests, ...receivedRequests];
        setPendingRequests(allPendingRequests);
      }

      if (onPartnerAdded) {
        onPartnerAdded();
      }
    } catch (error) {
      console.error('Partnership request error:', error);

      // Better error handling
      let errorMessage = error.message;
      if (error.message.includes('already sent') || error.message.includes('already exists')) {
        errorMessage = 'A partnership request with this company is already pending.';
      } else if (error.message.includes('already partners')) {
        errorMessage = 'You are already partners with this company.';
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to send request: ${errorMessage}`,
      });
    } finally {
      setSending(null);
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
            Find Partnership Companies
          </CardTitle>
          <CardDescription>
            Search for process servers by ZIP code to establish partnerships
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
              const isSelected = selectedCompany?.company_id === company.company_id;
              const isPartner = existingPartners.includes(company.company_id);
              const pendingRequest = hasPendingRequest(company.company_id);
              const requestDirection = getPendingRequestDirection(company.company_id);

              return (
                <Card key={company.id} className={`hover:shadow-md transition-shadow ${isSelected ? 'border-2 border-primary' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Company Info */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{company.name}</h4>

                            {isPartner && (
                              <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Partner
                              </Badge>
                            )}

                            {!isPartner && pendingRequest && requestDirection === 'sent' && (
                              <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700">
                                <Clock className="w-3 h-3" />
                                Request Pending
                              </Badge>
                            )}

                            {!isPartner && pendingRequest && requestDirection === 'received' && (
                              <Badge variant="outline" className="gap-1 border-blue-500 text-blue-700">
                                <Users className="w-3 h-3" />
                                Wants to Partner
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {company.city}, {company.state} {company.zip}
                          </div>

                          {company.service_radius_miles && (
                            <Badge variant="outline">
                              Service Radius: {company.service_radius_miles} miles
                            </Badge>
                          )}

                          {company.total_jobs_completed > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Jobs Completed:</span> {company.total_jobs_completed}
                            </div>
                          )}
                        </div>

                        {!isSelected && !isPartner && !pendingRequest && (
                          <Button
                            onClick={() => setSelectedCompany(company)}
                            variant="default"
                            className="gap-2"
                          >
                            <Users className="h-4 w-4" />
                            Request Partnership
                          </Button>
                        )}

                        {!isPartner && pendingRequest && requestDirection === 'received' && !isSelected && (
                          <div className="text-sm text-blue-600">
                            Go to Partnership Requests to respond
                          </div>
                        )}
                      </div>

                      {/* Partnership Request Form */}
                      {isSelected && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="text-sm font-medium">
                            Sending partnership request to: <span className="text-primary">{company.name}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Message (Optional)
                            </label>
                            <Textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Tell them why you'd like to partner..."
                              rows={3}
                              maxLength={500}
                            />
                            <p className="text-xs text-muted-foreground">
                              {message.length}/500 characters
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => sendPartnershipRequest(company)}
                              disabled={sending === company.company_id}
                              className="flex-1 gap-2"
                            >
                              {sending === company.company_id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4" />
                                  Send Request
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedCompany(null);
                                setMessage('');
                              }}
                              disabled={sending === company.company_id}
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

export default PartnershipDirectory;
