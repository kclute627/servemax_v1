import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Users,
  Briefcase,
  Check,
  X,
  Loader2,
  Building,
  MapPin,
  Clock,
  UserPlus,
  Eye,
  FileText,
  Zap,
  AlertTriangle,
  User,
  DollarSign,
  Calendar,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useGlobalData } from '../GlobalDataContext';

const NotificationCenter = ({ companyId }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshData } = useGlobalData();
  const [partnershipRequests, setPartnershipRequests] = useState([]);
  const [jobShareRequests, setJobShareRequests] = useState([]);
  const [clientRegistrations, setClientRegistrations] = useState([]);
  const [portalOrders, setPortalOrders] = useState([]);
  const [declinedShares, setDeclinedShares] = useState([]);
  const [jobNotes, setJobNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [responding, setResponding] = useState(null);

  // Track which notifications we've already shown toasts for
  const shownToastsRef = useRef(new Set());

  const totalNotifications = partnershipRequests.length + jobShareRequests.length + clientRegistrations.length + portalOrders.length + declinedShares.length + jobNotes.length;

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

    // Listen to client registration notifications
    const clientRegQuery = query(
      collection(db, 'client_registration_notifications'),
      where('parent_company_id', '==', companyId),
      where('status', '==', 'pending')
    );

    const unsubClientReg = onSnapshot(clientRegQuery, (snapshot) => {
      const registrations = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'client_registration',
        ...doc.data()
      }));
      setClientRegistrations(registrations);
      setLoading(false);
    });

    // Listen to portal order notifications
    const portalOrderQuery = query(
      collection(db, 'notifications'),
      where('company_id', '==', companyId),
      where('type', '==', 'new_portal_order'),
      where('read', '==', false)
    );

    const unsubPortalOrders = onSnapshot(portalOrderQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'portal_order',
        ...doc.data()
      }));
      setPortalOrders(orders);
      setLoading(false);

      // Show persistent toast for new portal orders
      orders.forEach(order => {
        if (!shownToastsRef.current.has(order.id)) {
          // PERFORMANCE: Limit Set size to prevent memory leak in long sessions
          if (shownToastsRef.current.size > 100) {
            const firstItem = shownToastsRef.current.values().next().value;
            shownToastsRef.current.delete(firstItem);
          }
          shownToastsRef.current.add(order.id);
          toast({
            title: "New Order Received",
            description: `Order #${order.job_number} submitted by ${order.client_name} via client portal.`,
            duration: Infinity, // Persistent - no auto-dismiss
            action: (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/jobs/${order.job_id}`)}
              >
                View
              </Button>
            ),
          });
        }
      });
    });

    // Listen to declined job share notifications
    const declinedShareQuery = query(
      collection(db, 'notifications'),
      where('company_id', '==', companyId),
      where('type', '==', 'job_share_declined'),
      where('read', '==', false)
    );

    const unsubDeclinedShares = onSnapshot(declinedShareQuery, (snapshot) => {
      const declined = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'declined_share',
        ...doc.data()
      }));
      setDeclinedShares(declined);
      setLoading(false);
    });

    // Listen to job note notifications
    const jobNoteQuery = query(
      collection(db, 'notifications'),
      where('company_id', '==', companyId),
      where('type', '==', 'new_job_note'),
      where('read', '==', false)
    );

    const unsubJobNotes = onSnapshot(jobNoteQuery, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'job_note',
        ...doc.data()
      }));
      setJobNotes(notes);
      setLoading(false);

      // Show toast for new job notes
      notes.forEach(note => {
        if (!shownToastsRef.current.has(note.id)) {
          if (shownToastsRef.current.size > 100) {
            const firstItem = shownToastsRef.current.values().next().value;
            shownToastsRef.current.delete(firstItem);
          }
          shownToastsRef.current.add(note.id);
          toast({
            title: "New Message",
            description: `${note.note_author} sent a message on Job #${note.job_number}`,
            action: (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/jobs/${note.job_id}`)}
              >
                View
              </Button>
            ),
          });
        }
      });
    });

    return () => {
      unsubPartnership();
      unsubJobShare();
      unsubClientReg();
      unsubPortalOrders();
      unsubDeclinedShares();
      unsubJobNotes();
      // PERFORMANCE: Clear toast tracking to prevent memory leak
      shownToastsRef.current.clear();
    };
  }, [companyId, toast, navigate]);

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

      if (accept) {
        await refreshData();
      }

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

  const handleAcknowledgeRegistration = async (notificationId) => {
    setResponding(notificationId);
    try {
      const acknowledge = httpsCallable(functions, 'acknowledgeClientRegistration');
      await acknowledge({ notificationId });

      toast({
        title: "Notification Acknowledged",
        description: "New client registration has been acknowledged.",
        variant: "success",
      });
    } catch (error) {
      console.error('Error acknowledging registration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to acknowledge: ${error.message}`,
      });
    } finally {
      setResponding(null);
    }
  };

  const handleDismissPortalOrder = async (notificationId) => {
    setResponding(notificationId);
    try {
      // Mark notification as read
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      // Remove from shown toasts ref so it doesn't show again
      shownToastsRef.current.delete(notificationId);
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to dismiss: ${error.message}`,
      });
    } finally {
      setResponding(null);
    }
  };

  const handleDismissDeclinedShare = async (notificationId) => {
    setResponding(notificationId);
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to dismiss: ${error.message}`,
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
    <div className="bg-white border border-emerald-200 rounded-xl shadow-sm overflow-hidden">
      {/* Slim Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-emerald-50/50 transition-colors border-b border-emerald-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Notifications</span>
            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {totalNotifications}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Notifications List */}
      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {/* Partnership Requests */}
          {partnershipRequests.map((request) => (
            <div key={request.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-violet-600 uppercase tracking-wide">Partnership</span>
                  </div>
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">{request.requesting_company_name}</span>
                    <span className="text-slate-500"> wants to partner</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePartnershipResponse(request.id, true); }}
                    disabled={responding === request.id}
                    className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {responding === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePartnershipResponse(request.id, false); }}
                    disabled={responding === request.id}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Job Share Requests - Slim Modern Design */}
          {jobShareRequests.map((request) => {
            const preview = request.job_preview || {};
            const formatDue = (d) => { try { return d ? format(new Date(d), 'MMM d') : null; } catch { return d; } };
            const dueFormatted = formatDue(preview.due_date);
            const fullAddress = [preview.service_address, preview.city, preview.state].filter(Boolean).join(', ');

            return (
              <div key={request.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Type + Job Number */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Job Share</span>
                      {request.shared_job_number && (
                        <span className="text-xs text-slate-400 font-mono">#{request.shared_job_number}</span>
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
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        from <span className="font-medium text-slate-700">{request.requesting_company_name}</span>
                      </span>
                      <span className="text-emerald-600 font-semibold">${Number(request.proposed_fee || 0).toFixed(0)}</span>
                      {dueFormatted && (
                        <span className="text-slate-400">Due {dueFormatted}</span>
                      )}
                    </div>
                  </div>

                  {/* Accept / Deny */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJobShareResponse(request.id, true); }}
                      disabled={responding === request.id}
                      className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {responding === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJobShareResponse(request.id, false); }}
                      disabled={responding === request.id}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Client Registration Notifications */}
          {clientRegistrations.map((registration) => (
            <div key={registration.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">New Client</span>
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold text-slate-900">{registration.company_name}</span>
                  </p>
                  <p className="text-xs text-slate-500">{registration.contact_name} • {registration.contact_email}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/clients/${registration.client_company_id}`; }}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAcknowledgeRegistration(registration.id); }}
                    disabled={responding === registration.id}
                    className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {responding === registration.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Portal Order Notifications */}
          {portalOrders.map((order) => {
            const priorityConfig = {
              same_day: { label: 'Same Day', className: 'bg-red-100 text-red-700' },
              rush: { label: 'Rush', className: 'bg-orange-100 text-orange-700' },
              standard: { label: 'Standard', className: 'bg-slate-100 text-slate-600' }
            };
            const priority = priorityConfig[order.priority] || priorityConfig.standard;

            return (
              <div key={order.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-sky-600 uppercase tracking-wide">Portal Order</span>
                      <span className="text-xs text-slate-400 font-mono">#{order.job_number}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priority.className}`}>
                        {priority.label}
                      </span>
                    </div>

                    {/* Recipient Name - BOLD */}
                    {order.recipient_name && (
                      <p className="font-bold text-slate-900 text-sm mb-1">{order.recipient_name}</p>
                    )}

                    {/* Address */}
                    {order.address && (
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600 leading-tight line-clamp-1">{order.address}</span>
                      </div>
                    )}

                    {/* Client */}
                    <p className="text-xs text-slate-500">
                      from <span className="font-medium text-slate-700">{order.client_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${order.job_id}`); }}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismissPortalOrder(order.id); }}
                      disabled={responding === order.id}
                      className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {responding === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Declined Job Share Notifications */}
          {declinedShares.map((notification) => (
            <div key={notification.id} className="px-4 py-3 hover:bg-red-50/50 transition-colors bg-red-50/30">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Job Declined</span>
                    {notification.job_number && (
                      <span className="text-xs text-slate-400 font-mono">#{notification.job_number}</span>
                    )}
                  </div>

                  {/* Recipient Name - BOLD */}
                  <p className="font-bold text-slate-900 text-sm mb-1">
                    {notification.recipient_name || 'Unknown Recipient'}
                  </p>

                  {/* Declining Company */}
                  <p className="text-xs text-slate-500 mb-1">
                    <span className="font-medium text-red-600">{notification.declining_company_name}</span> declined this job
                  </p>

                  {/* Decline Reason */}
                  {notification.decline_reason && (
                    <div className="mt-1.5 text-xs text-red-700 bg-red-100 rounded px-2 py-1.5 border border-red-200">
                      <span className="font-medium">Reason:</span> {notification.decline_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${notification.job_id}`); }}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDismissDeclinedShare(notification.id); }}
                    disabled={responding === notification.id}
                    className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {responding === notification.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
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
