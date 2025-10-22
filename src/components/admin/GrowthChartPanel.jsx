import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Loader2 } from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function GrowthChartPanel() {
  const [growthData, setGrowthData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGrowthData();
  }, []);

  const loadGrowthData = async () => {
    try {
      setIsLoading(true);
      const monthlyGrowth = await AdminStatsManager.getUserGrowth();
      setGrowthData(monthlyGrowth);
    } catch (err) {
      console.error('Error loading growth data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxCount = () => {
    if (growthData.length === 0) return 0;
    return Math.max(...growthData.map(d => d.count));
  };

  const getBarHeight = (count) => {
    const maxCount = getMaxCount();
    if (maxCount === 0) return 0;
    return (count / maxCount) * 100;
  };

  const getGrowthPercentage = () => {
    if (growthData.length < 2) return 0;
    const latest = growthData[growthData.length - 1].count;
    const previous = growthData[growthData.length - 2].count;
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
          <h2 className="text-2xl font-bold text-slate-900">User Growth</h2>
          <p className="text-slate-600">Total companies over the last 12 months</p>
        </div>
        {!isLoading && growthData.length >= 2 && (
          <div className="text-right">
            <div className={`flex items-center gap-1 ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-5 h-5 ${!isPositiveGrowth ? 'rotate-180' : ''}`} />
              <span className="text-2xl font-bold">{Math.abs(growthPercentage)}%</span>
            </div>
            <p className="text-xs text-slate-500">vs last month</p>
          </div>
        )}
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Monthly Growth Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : growthData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No growth data available</p>
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
                  <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-slate-500">
                    <span>{getMaxCount()}</span>
                    <span>{Math.round(getMaxCount() * 0.75)}</span>
                    <span>{Math.round(getMaxCount() * 0.5)}</span>
                    <span>{Math.round(getMaxCount() * 0.25)}</span>
                    <span>0</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-12 h-full flex items-end justify-between gap-1 border-l border-b border-slate-200 pl-4 pb-8">
                    {growthData.map((data, index) => (
                      <motion.div
                        key={data.month}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: `${getBarHeight(data.count)}%`, opacity: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.5 }}
                        className="relative flex-1 group"
                      >
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer"
                          style={{ height: '100%', minHeight: data.count > 0 ? '4px' : '0' }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              {data.count} companies
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* X-axis labels */}
                  <div className="ml-12 mt-2 flex justify-between pl-4">
                    {growthData.map((data, index) => (
                      <div
                        key={data.month}
                        className="flex-1 text-center text-xs text-slate-500"
                        style={{
                          visibility: index % 2 === 0 ? 'visible' : 'hidden' // Show every other label to prevent crowding
                        }}
                      >
                        {data.month}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {growthData.length > 0 ? growthData[0].count : 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">12 months ago</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {growthData.length > 0 ? growthData[growthData.length - 1].count : 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Current</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                      {growthData.length > 0
                        ? growthData[growthData.length - 1].count - growthData[0].count
                        : 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Net growth</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700">
                <strong>Growth Tracking:</strong> This chart shows cumulative company signups over time.
                Each bar represents the total number of companies that existed at the end of that month.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
