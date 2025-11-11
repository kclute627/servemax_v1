import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Loader2, Users, CheckCircle, XCircle, Building } from 'lucide-react';

const PartnershipRequests = ({ companyId }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    if (!companyId) return;

    // Listen to pending partnership requests for this company
    const q = query(
      collection(db, 'partnership_requests'),
      where('target_company_id', '==', companyId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to partnership requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const handleResponse = async (requestId, accept) => {
    setResponding(requestId);
    try {
      const respondToRequest = httpsCallable(functions, 'respondToPartnershipRequest');
      await respondToRequest({
        requestId,
        accept
      });

      toast({
        title: accept ? "Partnership Accepted" : "Request Declined",
        description: accept
          ? "You can now share jobs with this company."
          : "Partnership request has been declined.",
      });
    } catch (error) {
      console.error('Error responding to partnership request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to respond: ${error.message}`,
      });
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No pending partnership requests</p>
        <p className="text-sm mt-1">
          Partnership requests will appear here when other companies want to work with you
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-lg">
                      {request.requesting_company_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      wants to partner with you for job sharing
                    </p>
                  </div>
                </div>

                {request.message && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm italic">"{request.message}"</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Requested by {request.requesting_user_name} •{' '}
                  {request.created_at?.toDate ?
                    new Date(request.created_at.toDate()).toLocaleDateString() :
                    'Recently'
                  }
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleResponse(request.id, true)}
                  disabled={responding === request.id}
                  className="gap-2"
                >
                  {responding === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Accept
                </Button>
                <Button
                  onClick={() => handleResponse(request.id, false)}
                  disabled={responding === request.id}
                  variant="outline"
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PartnershipRequests;
