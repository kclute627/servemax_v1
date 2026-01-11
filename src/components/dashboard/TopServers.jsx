
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from '@/components/ui/animated-number';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, Briefcase, Star, Calendar, Award, DollarSign, Trophy, TrendingUp, TrendingDown } from "lucide-react";

export default function TopServers({ serversData, isLoading, period, onPeriodChange, timePeriods }) {
  const [viewMode, setViewMode] = useState('jobs'); // 'jobs', 'revenue', or 'rating'

  // Helper function for rank badge styling - using high contrast colors
  const getRankBadgeStyle = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-lg shadow-amber-300 font-bold';
      case 2:
        return 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-md shadow-slate-300 font-bold';
      case 3:
        return 'bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-md shadow-orange-300 font-bold';
      default:
        return 'bg-slate-200 text-slate-700 font-semibold';
    }
  };

  const sortedServers = useMemo(() => {
    if (!serversData) return [];

    return [...serversData]
      .filter(stat => stat.jobs > 0 || stat.completedJobs > 0 || stat.rating > 0 || (stat.profit !== undefined && stat.profit !== 0)) // Show servers with any assigned jobs
      .sort((a, b) => {
        if (viewMode === 'jobs') {
          return (b.jobs || 0) - (a.jobs || 0); // Sort by total assigned jobs
        } else if (viewMode === 'revenue') {
          // Sort by profit first, then by completedJobs as tiebreaker
          const profitA = a.profit || 0;
          const profitB = b.profit || 0;
          if (profitB !== profitA) {
            return profitB - profitA;
          }
          return b.completedJobs - a.completedJobs; // Use completedJobs for tiebreaker
        } else {
          // Sort by rating first, then by completedJobs as tiebreaker
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.completedJobs - a.completedJobs; // Use completedJobs for tiebreaker
        }
      })
      .slice(0, 10); // Show top 10
  }, [serversData, viewMode]);

  return (
    <Card className="border-0  bg-[#F0F0F0] overflow-hidden">
      <CardHeader className="bg-[#F0F0F0] text-black p-2 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FDFDFD] rounded-lg p-2 border border-gray-200">
          <div className="flex items-center gap-4">
            {/* <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div> */}
            <div>
              <CardTitle className="text-[15px] font-[500] text[#1F1F21] py-6">Top Servers</CardTitle>

            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Time Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1F1F21]" />
              <select
                value={period}
                onChange={(e) => onPeriodChange(e.target.value)}
                className="flex h-9 items-center justify-between rounded-lg border border-black/30 bg-white/10 backdrop-blur-sm px-3 py-2 text-sm text-[#1F1F21] shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {timePeriods.map(p => (
                  <option key={p.value} value={p.value} className="text-slate-800">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#FAFBFC] backdrop-blur-sm p-1 rounded-lg relative w-[200px] border border-[#EFEFEF]">
              <motion.div
                animate={{
                  x: viewMode === 'jobs' ? '0%' : viewMode === 'revenue' ? '100%' : '200%'
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
                className="absolute inset-y-1 left-1 bg-white rounded-lg"
                style={{ width: 'calc(33.333% - 4px)' }}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('jobs')}
                className={`flex-1 h-6 flex items-center justify-center leading-none
    relative z-10 transition-colors hover:bg-transparent
    ${viewMode === 'jobs'
                    ? 'text-dark'
                    : 'text-[#1F1F21] hover:text-[#12872F]'}`}
              >
                Jobs
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('revenue')}
                className={`flex-1 h-6 flex items-center justify-center leading-none
    relative z-10 transition-colors hover:bg-transparent
    ${viewMode === 'revenue'
                    ? 'text-dark'
                    : 'text-[#1F1F21] hover:text-[#12872F]'}`}
              >
                Revenue
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('rating')}
                className={`flex-1 h-6 flex items-center justify-center leading-none
    relative z-10 transition-colors hover:bg-transparent
    ${viewMode === 'rating'
                    ? 'text-dark'
                    : 'text-[#1F1F21] hover:text-[#12872F]'}`}
              >
                Rating
              </Button>
            </div>

          </div>
        </div>
        {/* <p className="text-[15px] font-[400] text-[#1F1F21]">Your highest performing process servers by activity and rating.</p> */}
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[330px] overflow-x-auto overflow-y-auto px-1">
          <div className="w-[98%] mx-auto bg-[#FDFDFD] rounded-lg border-b border-gray-200 overflow-hidden ">
            <Table className="w-full">
            <TableHeader className="bg-[#FDFDFD] rounded-lg h-[50px]">
              <TableRow className="bg-[#F7F7F7] rounded-md">
                <TableHead className="w-[70px] text-center  text-[15px] font-[500] text-[#1F1F21]">Rank</TableHead>
                <TableHead className=" text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap">Server</TableHead>
                {viewMode === 'revenue' ? (
                  <>
                    <TableHead className="text-right  text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap">Server Pay</TableHead>
                    <TableHead className="text-right  text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap">Client Billing</TableHead>
                    <TableHead className="text-right  text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap">Profit/Loss</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-center  text-[15px] font-[500] text-[#1F1F21]">Jobs</TableHead>
                    <TableHead className={`text-right text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap ${viewMode === 'rating' ? 'pr-10' : ''}`}>
                      {viewMode === 'jobs' ? 'Total Jobs' : 'Rating'}
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow
                      key={`loading-${i}`}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      {viewMode === 'revenue' ? (
                        <>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                ) : sortedServers.length > 0 ? (
                  sortedServers.map((item, index) => (
                    <motion.tr
                      key={`${item.server.id}-${viewMode}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <TableCell className="text-center py-3">
                        <span className="text-[#1F1F21] font-medium">
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[#1F1F21] font-medium">
                          {item.server.first_name} {item.server.last_name}
                        </span>
                      </TableCell>
                      {viewMode === 'revenue' ? (
                        <>
                          <TableCell className="text-right py-3 pr-10">
                            <span className="text-[#1F1F21] font-medium">
                              <AnimatedNumber
                                value={item.serverPay || 0}
                                format="currency"
                                decimals={0}
                                delay={index * 20 + 60}
                                className="inline-block"
                              />
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3 pr-10">
                            <span className="text-[#1F1F21] font-medium">
                              <AnimatedNumber
                                value={item.clientBilling || 0}
                                format="currency"
                                decimals={0}
                                delay={index * 20 + 80}
                                className="inline-block"
                              />
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3 pr-10">
                            <span className="text-[#1F1F21] font-medium">
                              <AnimatedNumber
                                value={item.profit || 0}
                                format="currency"
                                decimals={0}
                                delay={index * 20 + 100}
                                className="inline-block"
                              />
                            </span>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-center py-3">
                            <span className="text-[#1F1F21] font-medium">
                              <AnimatedNumber
                                value={item.jobs || 0}
                                delay={index * 20 + 60}
                                className="inline-block"
                              />
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3 pr-10">
                            {viewMode === 'jobs' ? (
                              <span className="text-[#1F1F21] font-medium">
                                <AnimatedNumber
                                  value={item.jobs || 0}
                                  delay={index * 20 + 80}
                                  className="inline-block"
                                />
                              </span>
                            ) : (
                              <span className="text-[#1F1F21] font-medium">
                                <Star className="w-4 h-4 text-amber-600 fill-amber-600 inline-block mr-1" />
                                <AnimatedNumber
                                  value={item.rating}
                                  decimals={1}
                                  className="inline-block"
                                  delay={index * 20 + 100}
                                />
                              </span>
                            )}
                          </TableCell>
                        </>
                      )}
                    </motion.tr>
                  ))
                                ) : (
                  <TableRow key="no-data">
                    <TableCell colSpan={viewMode === 'revenue' ? 5 : 4} className="h-64 text-center">
                      <div className="py-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Trophy className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="font-semibold text-slate-700 text-lg mb-2">No Server Data Yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                          Assign jobs to your process servers and they'll appear here once they complete their first job.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
