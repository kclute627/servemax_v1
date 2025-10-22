import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  Users,
  CreditCard,
  AlertCircle,
  Settings,
  Mail,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from '@/components/ui/use-toast';

export default function QuickActionsPanel() {
  const { toast } = useToast();

  const handleExportSubscribers = () => {
    toast({
      title: 'Coming Soon',
      description: 'Export subscribers to CSV functionality will be available soon',
    });
  };

  const handleExportRevenue = () => {
    toast({
      title: 'Coming Soon',
      description: 'Export revenue report functionality will be available soon',
    });
  };

  const handleSendAnnouncement = () => {
    toast({
      title: 'Coming Soon',
      description: 'Send platform announcement functionality will be available soon',
    });
  };

  const quickActions = [
    {
      title: 'View All Companies',
      description: 'Browse all platform users',
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      action: 'link',
      link: '/Companies'
    },
    {
      title: 'Subscriptions Overview',
      description: 'View billing and subscribers',
      icon: CreditCard,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      action: 'link',
      link: '/Subscriptions'
    },
    {
      title: 'System Health',
      description: 'Monitor uptime and performance',
      icon: TrendingUp,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      action: 'link',
      link: '/System'
    },
    {
      title: 'Export Subscribers',
      description: 'Download subscriber list as CSV',
      icon: Download,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      action: 'function',
      onClick: handleExportSubscribers
    },
    {
      title: 'Export Revenue Report',
      description: 'Download revenue analytics',
      icon: FileText,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      action: 'function',
      onClick: handleExportRevenue
    },
    {
      title: 'Send Announcement',
      description: 'Notify all platform users',
      icon: Mail,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
      action: 'function',
      onClick: handleSendAnnouncement
    },
    {
      title: 'View All Jobs',
      description: 'Browse all platform jobs',
      icon: AlertCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      action: 'link',
      link: '/Jobs'
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      action: 'link',
      link: '/Settings'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quick Actions</h2>
        <p className="text-slate-600">Common admin tasks and shortcuts</p>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const content = (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-purple-200">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={`p-4 ${action.iconBg} rounded-xl group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${action.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {action.title}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );

          if (action.action === 'link') {
            return (
              <Link key={action.title} to={createPageUrl(action.link.replace('/', ''))}>
                {content}
              </Link>
            );
          }

          return (
            <div key={action.title} onClick={action.onClick}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 mb-1">
                Quick Access Hub
              </p>
              <p className="text-xs text-slate-600">
                Use these shortcuts to quickly access common admin tasks. More actions and
                integrations will be added as the platform grows.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
