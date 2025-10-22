import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  UserPlus,
  CreditCard,
  XCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Building2
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function ActivityFeedPanel() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const recentActivity = await AdminStatsManager.getRecentActivity(15);
      setActivities(recentActivity);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadActivities(true);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'signup':
        return <UserPlus className="w-4 h-4 text-green-600" />;
      case 'subscription_change':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'cancellation':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'upgrade':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'signup':
        return 'bg-green-50 border-green-200';
      case 'subscription_change':
        return 'bg-blue-50 border-blue-200';
      case 'cancellation':
        return 'bg-red-50 border-red-200';
      case 'upgrade':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const LoadingSpinner = () => (
    <motion.div
      className="flex items-center gap-2 text-slate-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading activity...</span>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
          <p className="text-slate-600">Real-time platform events and changes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {activities.map((activity, index) => (
                  <motion.div
                    key={`${activity.type}-${activity.company_id}-${activity.timestamp}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${getActivityColor(activity.type)} hover:shadow-sm transition-all`}
                  >
                    {/* Icon */}
                    <div className="p-2 bg-white rounded-lg flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 font-medium">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {activity.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {getTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Company indicator */}
                    {activity.company_name && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                        <Building2 className="w-3 h-3" />
                        <span className="max-w-[120px] truncate">
                          {activity.company_name}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Activity feed updates automatically every minute
              </p>
              <p className="text-xs text-slate-600">
                Showing the 15 most recent platform events
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
