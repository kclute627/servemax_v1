import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { useToast } from '../ui/use-toast';
import {
  Loader2,
  Clock,
  MapPin,
  Check,
  X,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { useGlobalData } from '../GlobalDataContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';

const PendingShareRequests = ({ companyId, compact = false }) => {
  const { toast } = useToast();
  const { refreshData } = useGlobalData();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [decliningRequestId, setDecliningRequestId] = useState(null);

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

  const respondToRequest = async (requestId, accept, reason = null) => {
    setResponding(requestId);

    try {
      const respond = httpsCallable(functions, 'respondToShareRequest');
      await respond({ requestId, accept, declineReason: reason });

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
      setResponding(null);
    }
  };

  const handleDeclineClick = (requestId) => {
    setDecliningRequestId(requestId);
    setDeclineReason('');
    setShowDeclineDialog(true);
  };

  const confirmDecline = async () => {
    setShowDeclineDialog(false);
    await respondToRequest(decliningRequestId, false, declineReason);
    setDecliningRequestId(null);
    setDeclineReason('');
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
      return format(new Date(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (pendingRequests.length === 0) return null;

  return (
    <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden mb-6">
      {/* Slim Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50/50 transition-colors border-b border-blue-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Incoming Job Requests</span>
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {pendingRequests.length}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Notifications List */}
      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {pendingRequests.map((request) => {
            const expired = isExpired(request.expires_at);
            const expiringSoon = isExpiringSoon(request.expires_at);
            const preview = request.job_preview || {};
            const dueFormatted = formatDueDate(preview.due_date);
            const fullAddress = [preview.service_address, preview.city, preview.state].filter(Boolean).join(', ');

            return (
              <div
                key={request.id}
                className={`px-4 py-3 hover:bg-slate-50/50 transition-colors ${expired ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Type + Job Number + Status */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Job Share</span>
                      {request.shared_job_number && (
                        <span className="text-xs text-slate-400 font-mono">#{request.shared_job_number}</span>
                      )}
                      {expired && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">Expired</span>
                      )}
                      {expiringSoon && !expired && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Expiring Soon
                        </span>
                      )}
                    </div>

                    {/* Recipient Name - BOLD */}
                    <p className="font-bold text-slate-900 text-sm mb-1">
                      {preview.recipient_name || 'Unknown Recipient'}
                    </p>

                    {/* Address */}
                    {fullAddress && (
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600 leading-tight">{fullAddress}</span>
                      </div>
                    )}

                    {/* Meta row: Client + Rate + Due */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="text-slate-500">
                        from <span className="font-medium text-slate-700">{request.requesting_company_name}</span>
                      </span>
                      <span className="text-emerald-600 font-semibold">${Number(request.proposed_fee || 0).toFixed(0)}</span>
                      {dueFormatted && (
                        <span className="text-slate-400">Due {dueFormatted}</span>
                      )}
                      {request.auto_assigned && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Auto-Assigned</span>
                      )}
                    </div>

                    {/* Special Instructions */}
                    {preview.special_instructions && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 border border-amber-200">
                        <span className="font-medium">Note:</span> {preview.special_instructions}
                      </div>
                    )}
                  </div>

                  {/* Accept / Deny */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); respondToRequest(request.id, true); }}
                      disabled={responding === request.id || expired}
                      className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {responding === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeclineClick(request.id); }}
                      disabled={responding === request.id || expired}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Reason Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Job Share</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for declining this job (optional). This will be sent to the requesting company.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Outside service area, schedule conflict, etc."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDecliningRequestId(null); setDeclineReason(''); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDecline} className="bg-red-600 hover:bg-red-700">
              Decline Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PendingShareRequests;
