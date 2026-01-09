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
  CheckCircle,
  XCircle,
  Loader2,
  Building,
  MapPin,
  Clock,
  UserPlus,
  Eye,
  FileText,
  Zap,
  AlertTriangle,
  User
} from 'lucide-react';
import { format } from 'date-fns';

const NotificationCenter = ({ companyId }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [partnershipRequests, setPartnershipRequests] = useState([]);
  const [jobShareRequests, setJobShareRequests] = useState([]);
  const [clientRegistrations, setClientRegistrations] = useState([]);
  const [portalOrders, setPortalOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [responding, setResponding] = useState(null);

  // Track which notifications we've already shown toasts for
  const shownToastsRef = useRef(new Set());

  const totalNotifications = partnershipRequests.length + jobShareRequests.length + clientRegistrations.length + portalOrders.length;

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

    return () => {
      unsubPartnership();
      unsubJobShare();
      unsubClientReg();
      unsubPortalOrders();
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

          {/* Client Registration Notifications */}
          {clientRegistrations.map((registration) => (
            <div
              key={registration.id}
              className="bg-white rounded-lg border border-green-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        New Client Signup
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-1">
                      {registration.company_name}
                    </h4>
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-3 h-3" />
                        <span>{registration.contact_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-slate-500">{registration.contact_email}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {registration.created_at?.toDate &&
                        format(registration.created_at.toDate(), 'MMM d, yyyy h:mm a')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/clients/${registration.client_company_id}`}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAcknowledgeRegistration(registration.id)}
                    disabled={responding === registration.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {responding === registration.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Portal Order Notifications */}
          {portalOrders.map((order) => {
            // Priority configuration
            const priorityConfig = {
              same_day: { label: 'Same Day', icon: AlertTriangle, className: 'bg-red-100 text-red-700 border-red-200' },
              rush: { label: 'Rush', icon: Zap, className: 'bg-orange-100 text-orange-700 border-orange-200' },
              standard: { label: 'Standard', icon: Clock, className: 'bg-slate-100 text-slate-600 border-slate-200' }
            };
            const priority = priorityConfig[order.priority] || priorityConfig.standard;
            const PriorityIcon = priority.icon;

            return (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-green-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          New Portal Order
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">
                        Order #{order.job_number}
                      </h4>
                      <div className="space-y-1.5 mb-2">
                        {order.recipient_name && (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">{order.recipient_name}</span>
                          </div>
                        )}
                        {order.address && (
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{order.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${priority.className}`}>
                            <PriorityIcon className="w-3 h-3" />
                            {priority.label}
                          </span>
                          <span className="text-xs text-slate-500">from {order.client_name}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {order.created_at?.toDate &&
                          format(order.created_at.toDate(), 'MMM d, yyyy h:mm a')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/jobs/${order.job_id}`)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDismissPortalOrder(order.id)}
                      disabled={responding === order.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {responding === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
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

export default NotificationCenter;
