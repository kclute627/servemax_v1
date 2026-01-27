import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import {
  Loader2,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  Briefcase,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useGlobalData } from '../GlobalDataContext';

const PendingShareRequests = ({ companyId, compact = false }) => {
  const { toast } = useToast();
  const { refreshData } = useGlobalData();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

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

  const respondToRequest = async (requestId, accept) => {
    setResponding(prev => ({ ...prev, [requestId]: true }));

    try {
      const respond = httpsCallable(functions, 'respondToShareRequest');
      await respond({ requestId, accept });

      if (accept) {
        await refreshData();
      }

      const requestData = pendingRequests.find(r => r.id === requestId);
      const isCarbonCopy = requestData?.create_carbon_copy;

      toast({
        title: accept ? "Job Accepted" : "Job Declined",
        description: accept
          ? (isCarbonCopy
              ? `Job copy created in your jobs list (Job #${requestData?.shared_job_number || ''})`
              : "Job share accepted successfully!")
          : "Job share has been declined",
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

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (pendingRequests.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-100/50 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              Incoming Job Requests
              <Badge className="bg-blue-600 text-white">
                {pendingRequests.length}
              </Badge>
            </h3>
            <p className="text-sm text-blue-700">
              {pendingRequests.length === 1
                ? 'A partner company has sent you a job'
                : `${pendingRequests.length} job requests waiting for your response`}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-blue-700 hover:bg-blue-100">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </div>

      {/* Request Cards */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {pendingRequests.map((request) => {
            const expired = isExpired(request.expires_at);
            const expiringSoon = isExpiringSoon(request.expires_at);
            const preview = request.job_preview || {};
            const dueFormatted = formatDueDate(preview.due_date);

            return (
              <div
                key={request.id}
                className={`bg-white rounded-xl border ${expired ? 'opacity-50 border-slate-200' : expiringSoon ? 'border-orange-300 shadow-orange-100' : 'border-blue-100'} shadow-sm hover:shadow-md transition-all`}
              >
                <div className="p-5">
                  {/* Top row: From company + badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {request.requesting_company_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Shared {request.created_at?.toDate
                            ? format(request.created_at.toDate(), 'MMM d, yyyy \'at\' h:mm a')
                            : 'recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {request.shared_job_number && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-mono">
                          #{request.shared_job_number}
                        </Badge>
                      )}
                      {expired && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Expired
                        </Badge>
                      )}
                      {expiringSoon && !expired && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300 gap-1">
                          <Clock className="h-3 w-3" />
                          Expiring Soon
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {/* Address */}
                    <div className="col-span-2 bg-slate-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Serve Location</p>
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {preview.service_address || 'Address not provided'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {[preview.city, preview.state, preview.zip].filter(Boolean).join(', ') || ''}
                          </p>
                          {preview.recipient_name && (
                            <p className="text-sm font-semibold text-slate-800 mt-1">
                              {preview.recipient_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fee */}
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Rate</p>
                          <p className="text-lg font-bold text-green-700">
                            ${Number(request.proposed_fee || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Due Date</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {dueFormatted || 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Extra details row */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {preview.service_type && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 capitalize">
                        <FileText className="w-3 h-3 mr-1" />
                        {preview.service_type}
                      </Badge>
                    )}
                    {preview.documents_count > 0 && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-600">
                        <FileText className="w-3 h-3 mr-1" />
                        {preview.documents_count} page{preview.documents_count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {request.auto_assigned && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        Auto-Assigned
                      </Badge>
                    )}
                    {request.expires_at && !expired && !expiringSoon && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires {request.expires_at.toDate
                          ? format(request.expires_at.toDate(), 'MMM d \'at\' h:mm a')
                          : ''}
                      </span>
                    )}
                  </div>

                  {/* Special Instructions */}
                  {preview.special_instructions && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Special Instructions</p>
                      <p className="text-sm text-amber-900">{preview.special_instructions}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => respondToRequest(request.id, true)}
                      disabled={responding[request.id] || expired}
                      className="flex-1 bg-green-600 hover:bg-green-700 h-11 text-sm font-semibold"
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
                      className="flex-1 border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 h-11 text-sm font-semibold"
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingShareRequests;
