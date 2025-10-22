import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Zap,
  Loader2
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function SystemHealthPanel() {
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSystemHealth();
    // Refresh every 30 seconds
    const interval = setInterval(loadSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      setIsLoading(true);
      const healthData = await AdminStatsManager.getSystemHealth();
      setHealth(healthData);
    } catch (err) {
      console.error('Error loading system health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'healthy') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Healthy
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <AlertCircle className="w-3 h-3 mr-1" />
        Issues Detected
      </Badge>
    );
  };

  const getUptimeColor = (uptime) => {
    if (uptime >= 99.9) return 'text-green-600';
    if (uptime >= 99.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const LoadingSpinner = () => (
    <motion.div
      className="flex items-center gap-2 text-slate-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading...</span>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Health</h2>
          <p className="text-slate-600">Platform performance and uptime monitoring</p>
        </div>
        {health && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Last Updated</p>
            <p className="text-sm text-slate-900">
              {new Date(health.last_updated).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Database Status */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <Database className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Database</p>
                      <p className="font-semibold text-slate-900">Firestore</p>
                    </div>
                  </div>
                  {getStatusBadge(health?.databaseStatus)}
                </div>

                {/* API Status */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <Zap className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">API Services</p>
                      <p className="font-semibold text-slate-900">Cloud Functions</p>
                    </div>
                  </div>
                  {getStatusBadge(health?.apiStatus)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Uptime */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">System Uptime</p>
                <div className="h-16 flex items-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <AnimatedNumber
                          value={health?.uptime || 0}
                          suffix="%"
                          className={`text-3xl font-bold ${getUptimeColor(health?.uptime || 0)}`}
                          delay={100}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Avg Response Time</p>
                <div className="h-16 flex items-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-baseline gap-1"
                      >
                        <AnimatedNumber
                          value={health?.avgResponseTime || 0}
                          className="text-3xl font-bold text-slate-900"
                          delay={200}
                        />
                        <span className="text-sm text-slate-500">ms</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Error Rate</p>
                <div className="h-16 flex items-center">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <AnimatedNumber
                          value={health?.errorRate || 0}
                          suffix="%"
                          className="text-3xl font-bold text-slate-900"
                          delay={300}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Status Details */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-slate-900">
                      Firebase Authentication
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Operational
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-slate-900">
                      Cloud Firestore
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Operational
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-slate-900">
                      Cloud Functions
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Operational
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-slate-900">
                      Cloud Storage
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Operational
                  </Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Last Incident */}
      {health?.last_incident && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Recent Incident</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-900 mb-1">
                  {health.last_incident.title}
                </p>
                <p className="text-sm text-slate-600 mb-2">
                  {health.last_incident.description}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(health.last_incident.occurred_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700">
                <strong>Note:</strong> System health metrics are updated in real-time. For detailed
                monitoring and alerts, integrate with services like Datadog, New Relic, or Google
                Cloud Monitoring.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
