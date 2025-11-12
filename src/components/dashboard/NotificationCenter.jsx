import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Loader2,
  Building,
  MapPin,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const NotificationCenter = ({ companyId }) => {
  const { toast } = useToast();
  const [partnershipRequests, setPartnershipRequests] = useState([]);
  const [jobShareRequests, setJobShareRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [responding, setResponding] = useState(null);

  const totalNotifications = partnershipRequests.length + jobShareRequests.length;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // Listen to partnership requests
    const partnershipQuery = query(
      collection(db, 'partnership_requests'),
      where('target_company_id', '==', companyId),
      where('status', '==', 'pending')
    );

    const unsubPartnership = onSnapshot(partnershipQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'partnership',
        ...doc.data()
      }));
      setPartnershipRequests(requests);
      setLoading(false);
    });

    // Listen to job share requests
    const jobShareQuery = query(
      collection(db, 'job_share_requests'),
      where('target_company_id', '==', companyId),
      where('status', '==', 'pending')
    );

    const unsubJobShare = onSnapshot(jobShareQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'job_share',
        ...doc.data()
      }));
      setJobShareRequests(requests);
      setLoading(false);
    });

    return () => {
      unsubPartnership();
      unsubJobShare();
    };
  }, [companyId]);

  const handlePartnershipResponse = async (requestId, accept) => {
    setResponding(requestId);
    try {
      const respondToRequest = httpsCallable(functions, 'respondToPartnershipRequest');
      await respondToRequest({ requestId, accept });

      toast({
        title: accept ? "Partnership Accepted" : "Request Declined",
        description: accept
          ? "You can now share jobs with this company."
          : "Partnership request has been declined.",
        variant: "success",
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

  const handleJobShareResponse = async (requestId, accept) => {
    setResponding(requestId);
    try {
      const respond = httpsCallable(functions, 'respondToShareRequest');
      await respond({ requestId, accept });

      toast({
        title: accept ? "Job Accepted" : "Job Declined",
        description: accept ? "Job share accepted successfully!" : "Job share has been declined",
        variant: "success",
      });
    } catch (error) {
      console.error('Error responding to job share request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to respond: ${error.message}`,
      });
    } finally {
      setResponding(null);
    }
  };

  // Don't show notification center if no notifications
  if (totalNotifications === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-green-100/50 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              Notification Center
              <Badge className="bg-green-600 text-white">
                {totalNotifications}
              </Badge>
            </h3>
            <p className="text-sm text-green-700">
              You have {totalNotifications} pending {totalNotifications === 1 ? 'notification' : 'notifications'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-green-700 hover:bg-green-100">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </div>

      {/* Notifications List */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {/* Partnership Requests */}
          {partnershipRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg border border-green-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Partnership Request
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-1">
                      {request.requesting_company_name}
                    </h4>
                    <p className="text-sm text-slate-600 mb-2">
                      wants to partner with you for job sharing
                    </p>
                    {request.message && (
                      <div className="bg-slate-50 p-2 rounded text-sm italic text-slate-700 mb-2">
                        "{request.message}"
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      Requested by {request.requesting_user_name} •{' '}
                      {request.created_at?.toDate ?
                        format(request.created_at.toDate(), 'MMM d, yyyy') :
                        'Recently'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handlePartnershipResponse(request.id, true)}
                    disabled={responding === request.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {responding === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePartnershipResponse(request.id, false)}
                    disabled={responding === request.id}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Job Share Requests */}
          {jobShareRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg border border-green-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Job Share Request
                      </Badge>
                      {request.auto_assigned && (
                        <Badge variant="secondary" className="text-xs">Auto-Assigned</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-1">
                      From: {request.requesting_company_name}
                    </h4>
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-3 h-3" />
                        <span>{request.job_preview?.service_address}, {request.job_preview?.city}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-600">Fee: </span>
                        <span className="font-bold text-green-600">${request.proposed_fee}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {request.created_at?.toDate &&
                        format(request.created_at.toDate(), 'MMM d, yyyy h:mm a')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleJobShareResponse(request.id, true)}
                    disabled={responding === request.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {responding === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleJobShareResponse(request.id, false)}
                    disabled={responding === request.id}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
