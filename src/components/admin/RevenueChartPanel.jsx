import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function RevenueChartPanel() {
  const [revenueData, setRevenueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      setIsLoading(true);
      const monthlyRevenue = await AdminStatsManager.getRevenueGrowth();
      setRevenueData(monthlyRevenue);
    } catch (err) {
      console.error('Error loading revenue data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount}`;
  };

  const formatCurrencyFull = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getMaxMrr = () => {
    if (revenueData.length === 0) return 0;
    return Math.max(...revenueData.map(d => d.mrr));
  };

  const getBarHeight = (mrr) => {
    const maxMrr = getMaxMrr();
    if (maxMrr === 0) return 0;
    return (mrr / maxMrr) * 100;
  };

  const getGrowthPercentage = () => {
    if (revenueData.length < 2) return 0;
    const latest = revenueData[revenueData.length - 1].mrr;
    const previous = revenueData[revenueData.length - 2].mrr;
    if (previous === 0) return 0;
    return ((latest - previous) / previous * 100).toFixed(1);
  };

  const LoadingSpinner = () => (
    <motion.div
      className="flex items-center gap-2 text-slate-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading chart...</span>
    </motion.div>
  );

  const growthPercentage = getGrowthPercentage();
  const isPositiveGrowth = growthPercentage >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Revenue Growth</h2>
          <p className="text-slate-600">Monthly recurring revenue over the last 12 months</p>
        </div>
        {!isLoading && revenueData.length >= 2 && (
          <div className="text-right">
            <div className={`flex items-center gap-1 ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-5 h-5 ${!isPositiveGrowth ? 'rotate-180' : ''}`} />
              <span className="text-2xl font-bold">{Math.abs(growthPercentage)}%</span>
            </div>
            <p className="text-xs text-slate-500">MRR growth vs last month</p>
          </div>
        )}
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            MRR Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : revenueData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No revenue data available</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Bar Chart */}
                <div className="relative h-64">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-slate-500">
                    <span>{formatCurrency(getMaxMrr())}</span>
                    <span>{formatCurrency(getMaxMrr() * 0.75)}</span>
                    <span>{formatCurrency(getMaxMrr() * 0.5)}</span>
                    <span>{formatCurrency(getMaxMrr() * 0.25)}</span>
                    <span>$0</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-16 h-full flex items-end justify-between gap-1 border-l border-b border-slate-200 pl-4 pb-8">
                    {revenueData.map((data, index) => (
                      <motion.div
                        key={data.month}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: `${getBarHeight(data.mrr)}%`, opacity: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.5 }}
                        className="relative flex-1 group"
                      >
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t hover:from-green-600 hover:to-emerald-500 transition-all cursor-pointer"
                          style={{ height: '100%', minHeight: data.mrr > 0 ? '4px' : '0' }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              <div className="font-semibold">{formatCurrencyFull(data.mrr)}/mo</div>
                              <div className="text-slate-300">{data.subscribers} subscribers</div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* X-axis labels */}
                  <div className="ml-16 mt-2 flex justify-between pl-4">
                    {revenueData.map((data, index) => (
                      <div
                        key={data.month}
                        className="flex-1 text-center text-xs text-slate-500"
                        style={{
                          visibility: index % 2 === 0 ? 'visible' : 'hidden'
                        }}
                      >
                        {data.month}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Stats */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">
                      {revenueData.length > 0 ? formatCurrencyFull(revenueData[0].mrr) : '$0'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">12 months ago</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">
                      {revenueData.length > 0 ? formatCurrencyFull(revenueData[revenueData.length - 1].mrr) : '$0'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Current MRR</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                      {revenueData.length > 0
                        ? formatCurrencyFull(revenueData[revenueData.length - 1].mrr - revenueData[0].mrr)
                        : '$0'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Net growth</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {revenueData.length > 0 ? formatCurrencyFull(revenueData[revenueData.length - 1].arr) : '$0'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Current ARR</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700">
                <strong>Revenue Tracking:</strong> MRR (Monthly Recurring Revenue) represents the total monthly
                subscription revenue from all active paying subscribers at the end of each month.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
