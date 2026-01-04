
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div> */}
            <div>
              <CardTitle className="text-[24px] font-[500] text[#1F1F21]">Top Servers</CardTitle>

            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Time Period Selector */}
            {/* <div className="flex items-center gap-2">
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
            </div> */}
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm p-1 rounded-full relative w-[300px] border border-[#00000029]">
              <motion.div
                animate={{
                  x: viewMode === 'jobs' ? '0%' : viewMode === 'revenue' ? '100%' : '200%'
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
                className="absolute inset-y-1 left-1 bg-[#12872F] rounded-full shadow-lg"
                style={{ width: 'calc(33.333% - 4px)' }}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('jobs')}
                className={`flex-1 h-6 flex items-center justify-center leading-none
    relative z-10 transition-colors hover:bg-transparent
    ${viewMode === 'jobs'
                    ? 'text-white'
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
                    ? 'text-white'
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
                    ? 'text-white'
                    : 'text-[#1F1F21] hover:text-[#12872F]'}`}
              >
                Rating
              </Button>
            </div>

          </div>
        </div>
        <p className="text-[15px] font-[400] text-[#1F1F21]">Your highest performing process servers by activity and rating.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-96 overflow-x-auto overflow-y-auto">
          <Table className="w-[98%] mx-auto">
            <TableHeader>
              <TableRow className="bg-[#F7F7F7] border-b-2 border-slate-200 ">
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
                    <TableHead className="text-right  text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap">
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
                      className={`border-b transition-all duration-200 cursor-pointer ${index < 3
                        ? 'bg-gradient-to-r from-slate-50 to-slate-100 hover:from-teal-100 hover:to-emerald-100'
                        : 'hover:bg-slate-100'
                        }`}
                    >
                      <TableCell className="text-center py-4">
                        <div className={`w-8 h-8 font-bold text-sm rounded-full flex items-center justify-center mx-auto ${getRankBadgeStyle(index + 1)}`}>
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${index < 3 ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-700'
                            }`}>
                            {(item.server.first_name?.charAt(0) || '') + (item.server.last_name?.charAt(0) || '')}
                          </div>
                          <span className="font-semibold text-slate-900">
                            {item.server.first_name} {item.server.last_name}
                          </span>
                        </div>
                      </TableCell>
                      {viewMode === 'revenue' ? (
                        <>
                          <TableCell className="text-right py-4">
                            <span className="font-semibold text-orange-800 bg-orange-100 px-3 py-1.5 rounded-md">
                              <AnimatedNumber
                                value={item.serverPay || 0}
                                format="currency"
                                decimals={0}
                                delay={index * 20 + 60}
                                className="inline-block"
                              />
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <span className="font-semibold text-blue-800 bg-blue-100 px-3 py-1.5 rounded-md">
                              <AnimatedNumber
                                value={item.clientBilling || 0}
                                format="currency"
                                decimals={0}
                                delay={index * 20 + 80}
                                className="inline-block"
                              />
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <div className={`inline-flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg ${(item.profit || 0) >= 0
                              ? 'text-green-800 bg-green-200'
                              : 'text-red-800 bg-red-200'
                              }`}>
                              {(item.profit || 0) >= 0
                                ? <TrendingUp className="w-4 h-4" />
                                : <TrendingDown className="w-4 h-4" />
                              }
                              <AnimatedNumber
                                value={item.profit || 0}
                                format="currency"
                                decimals={0}
                                delay={index * 20 + 100}
                                className="inline-block"
                              />
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-center py-4">
                            <span className="text-slate-700 bg-slate-200 px-3 py-1.5 rounded-full font-semibold">
                              <AnimatedNumber
                                value={item.jobs || 0}
                                delay={index * 20 + 60}
                                className="inline-block"
                              />
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            {viewMode === 'jobs' ? (
                              <span className="font-bold text-teal-800 bg-teal-200 px-3 py-1.5 rounded-lg">
                                <AnimatedNumber
                                  value={item.jobs || 0}
                                  delay={index * 20 + 80}
                                  className="inline-block"
                                />
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 bg-amber-200 px-3 py-1.5 rounded-lg">
                                <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
                                <AnimatedNumber
                                  value={item.rating}
                                  decimals={1}
                                  className="font-bold text-amber-800 inline-block"
                                  delay={index * 20 + 100}
                                />
                              </div>
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
      </CardContent>
    </Card>
  );
}
