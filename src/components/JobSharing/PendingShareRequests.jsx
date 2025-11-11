import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useToast } from '../ui/use-toast';
import { Loader2, Clock, MapPin, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const PendingShareRequests = ({ companyId }) => {
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // Subscribe to pending requests
    const q = query(
      collection(db, 'job_share_requests'),
      where('target_company_id', '==', companyId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingRequests(requests);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching pending requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const respondToRequest = async (requestId, accept, counterFee = null) => {
    setResponding(prev => ({ ...prev, [requestId]: true }));

    try {
      const respond = httpsCallable(functions, 'respondToShareRequest');
      const result = await respond({
        requestId,
        accept,
        counterFee
      });

      console.log('Response result:', result.data);
      toast({
        title: accept ? "Job Accepted" : "Job Declined",
        description: accept ? "Job share accepted successfully!" : "Job share has been declined",
      });
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to respond: ${error.message}`,
      });
    } finally {
      setResponding(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const expireDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const hoursUntilExpire = (expireDate - new Date()) / (1000 * 60 * 60);
    return hoursUntilExpire < 2 && hoursUntilExpire > 0;
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    const expireDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expireDate < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Job Share Requests
          {pendingRequests.length > 0 && (
            <Badge variant="default" className="ml-2">
              {pendingRequests.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and respond to incoming job share requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No pending job share requests</p>
            <p className="text-sm mt-2">
              When companies send you job share requests, they'll appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const expired = isExpired(request.expires_at);
              const expiringSoon = isExpiringSoon(request.expires_at);

              return (
                <Card
                  key={request.id}
                  className={`${expired ? 'opacity-50' : ''} ${expiringSoon ? 'border-orange-500' : ''}`}
                >
                  <CardContent className="pt-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">
                          From: {request.requesting_company_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {request.created_at?.toDate &&
                            format(request.created_at.toDate(), 'MMM d, yyyy h:mm a')
                          }
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {request.auto_assigned && (
                          <Badge variant="secondary">Auto-Assigned</Badge>
                        )}
                        {expired && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {expiringSoon && !expired && (
                          <Badge variant="outline" className="border-orange-500 text-orange-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Job Details */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-sm text-muted-foreground">Job Details</h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Service Address</p>
                            <p className="text-sm">
                              {request.job_preview.service_address}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.job_preview.city}, {request.job_preview.state}{' '}
                              {request.job_preview.zip}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Service Type</p>
                            <p className="text-sm capitalize">
                              {request.job_preview.service_type}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.job_preview.documents_count} document
                              {request.job_preview.documents_count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium">Due Date</p>
                          <p className="text-sm">
                            {request.job_preview.due_date || 'Not specified'}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium">Proposed Fee</p>
                          <p className="text-lg font-bold text-green-600">
                            ${request.proposed_fee}
                          </p>
                        </div>
                      </div>

                      {request.job_preview.special_instructions && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Special Instructions</p>
                          <p className="text-sm">{request.job_preview.special_instructions}</p>
                        </div>
                      )}

                      {request.expires_at && !expired && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Expires:{' '}
                          {request.expires_at.toDate &&
                            format(request.expires_at.toDate(), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => respondToRequest(request.id, true)}
                        disabled={responding[request.id] || expired}
                        className="flex-1"
                      >
                        {responding[request.id] ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Accept Job
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => respondToRequest(request.id, false)}
                        disabled={responding[request.id] || expired}
                        className="flex-1"
                      >
                        {responding[request.id] ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Decline
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingShareRequests;
