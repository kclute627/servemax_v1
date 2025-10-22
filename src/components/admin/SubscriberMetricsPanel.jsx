import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CreditCard,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function SubscriberMetricsPanel() {
  const [subscribers, setSubscribers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      setIsLoading(true);
      const subscriberDetails = await AdminStatsManager.getSubscriberDetails();
      setSubscribers(subscriberDetails);
    } catch (err) {
      console.error('Error loading subscribers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'past_due':
        return 'bg-orange-100 text-orange-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
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

  const displayedSubscribers = showAll ? subscribers : subscribers.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Paying Subscribers</h2>
          <p className="text-slate-600">Active subscriptions and details</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-500" />
          <span className="text-lg font-semibold text-slate-900">
            {subscribers.length} total
          </span>
        </div>
      </div>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Active Subscribers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No active subscribers yet</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {displayedSubscribers.map((subscriber, index) => (
                  <motion.div
                    key={subscriber.subscription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Subscriber Header */}
                    <div
                      className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() =>
                        setExpandedId(
                          expandedId === subscriber.subscription.id
                            ? null
                            : subscriber.subscription.id
                        )
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-white rounded-lg">
                            <CreditCard className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">
                              {subscriber.company?.name || 'Unknown Company'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={getStatusColor(subscriber.status)}
                              >
                                {subscriber.status}
                              </Badge>
                              <span className="text-sm text-slate-600">
                                {subscriber.plan}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-slate-900">
                              {formatCurrency(subscriber.mrr)}/mo
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatCurrency(subscriber.mrr * 12)}/yr
                            </div>
                          </div>
                          {expandedId === subscriber.subscription.id ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedId === subscriber.subscription.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-white border-t space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Company Email</p>
                                <p className="text-sm text-slate-900">
                                  {subscriber.company?.email || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Company Phone</p>
                                <p className="text-sm text-slate-900">
                                  {subscriber.company?.phone || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Start Date</p>
                                <p className="text-sm text-slate-900 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(subscriber.startDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Next Billing</p>
                                <p className="text-sm text-slate-900 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(subscriber.nextBillingDate)}
                                </p>
                              </div>
                            </div>
                            {subscriber.company?.address && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Address</p>
                                <p className="text-sm text-slate-900">
                                  {subscriber.company.address}
                                  {subscriber.company.city && `, ${subscriber.company.city}`}
                                  {subscriber.company.state && `, ${subscriber.company.state}`}
                                  {subscriber.company.zip && ` ${subscriber.company.zip}`}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {/* Show More Button */}
                {subscribers.length > 10 && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAll(!showAll)}
                      className="gap-2"
                    >
                      {showAll ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show All ({subscribers.length - 10} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
