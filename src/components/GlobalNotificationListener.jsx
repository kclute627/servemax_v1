import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from './ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Briefcase, MapPin, User, Zap, Clock, AlertTriangle } from 'lucide-react';

/**
 * GlobalNotificationListener - Runs in Layout to show toast notifications on any page
 * This component has no visible UI - it only listens for notifications and shows toasts
 */
const GlobalNotificationListener = ({ companyId }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const shownToastsRef = useRef(new Set());

  useEffect(() => {
    if (!companyId) return;

    console.log('[GlobalNotificationListener] Starting listeners for company:', companyId);

    // Listen to all notifications for this company (simpler query to avoid index requirements)
    // We filter by type and read status in JavaScript
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('company_id', '==', companyId)
    );

    const unsubNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        console.log('[GlobalNotificationListener] Got notifications:', snapshot.docs.length);

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const notification = { id: doc.id, ...data };

          // Skip if already read or already shown
          if (data.read || shownToastsRef.current.has(doc.id)) {
            return;
          }

          // Handle portal orders
          if (data.type === 'new_portal_order') {
            shownToastsRef.current.add(doc.id);
            console.log('[GlobalNotificationListener] Showing toast for portal order:', notification.job_number);

            // Priority badge styling
            const priorityConfig = {
              same_day: { label: 'Same Day', icon: AlertTriangle, className: 'bg-red-100 text-red-700 border-red-200' },
              rush: { label: 'Rush', icon: Zap, className: 'bg-orange-100 text-orange-700 border-orange-200' },
              standard: { label: 'Standard', icon: Clock, className: 'bg-slate-100 text-slate-600 border-slate-200' }
            };
            const priority = priorityConfig[notification.priority] || priorityConfig.standard;
            const PriorityIcon = priority.icon;

            toast({
              title: (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold text-slate-900">New Portal Order</span>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    #{notification.job_number}
                  </span>
                </div>
              ),
              description: (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">{notification.recipient_name || 'Unknown Recipient'}</span>
                  </div>
                  {notification.address && (
                    <div className="flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{notification.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${priority.className}`}>
                      <PriorityIcon className="w-3 h-3" />
                      {priority.label}
                    </span>
                    <span className="text-xs text-slate-400">from {notification.client_name}</span>
                  </div>
                </div>
              ),
              duration: Infinity,
              action: (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  onClick={() => navigate(`/jobs/${notification.job_id}`)}
                >
                  View Job
                </Button>
              ),
            });
          }

          // Handle client registrations
          if (data.type === 'client_registration') {
            shownToastsRef.current.add(doc.id);
            toast({
              title: "New Client Registration",
              description: `${notification.company_name || 'A new client'} registered via portal.`,
              duration: Infinity,
              action: (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/clients/${notification.client_id}`)}
                >
                  View
                </Button>
              ),
            });
          }
        });
      },
      (error) => {
        console.error('[GlobalNotificationListener] Query error:', error);
      }
    );

    return () => {
      unsubNotifications();
    };
  }, [companyId, toast, navigate]);

  // No visible UI - just runs the listeners
  return null;
};

export default GlobalNotificationListener;
