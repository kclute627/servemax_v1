
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
import { UserCheck, Briefcase, Star, Calendar, Award, DollarSign } from "lucide-react";

export default function TopServers({ serversData, isLoading, period, onPeriodChange, timePeriods }) {
  const [viewMode, setViewMode] = useState('jobs'); // 'jobs', 'revenue', or 'rating'

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
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Top Servers</CardTitle>
                <p className="text-slate-600">Your highest performing process servers by activity and rating.</p>
              </div>
            </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Time Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={period}
                onChange={(e) => onPeriodChange(e.target.value)}
                className="flex h-9 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                {timePeriods.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg relative">
              <motion.div
                animate={{
                  x: viewMode === 'jobs' ? 0 : viewMode === 'revenue' ? '100%' : '200%'
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
                className="absolute inset-y-1 left-1 bg-white rounded-md shadow-sm"
                style={{ width: 'calc(33.333% - 2px)' }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('jobs')}
                className={`gap-2 h-8 px-3 relative z-10 transition-colors duration-200 ${
                  viewMode === 'jobs' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Jobs
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('revenue')}
                className={`gap-2 h-8 px-3 relative z-10 transition-colors duration-200 ${
                  viewMode === 'revenue' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Revenue
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('rating')}
                className={`gap-2 h-8 px-3 relative z-10 transition-colors duration-200 ${
                  viewMode === 'rating' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Star className="w-4 h-4" />
                Rating
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 overflow-x-auto overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[60px] text-center font-semibold">Rank</TableHead>
                <TableHead className="font-semibold whitespace-nowrap">Server</TableHead>
                {viewMode === 'revenue' ? (
                  <>
                    <TableHead className="text-right font-semibold whitespace-nowrap">Server Pay</TableHead>
                    <TableHead className="text-right font-semibold whitespace-nowrap">Client Billing</TableHead>
                    <TableHead className="text-right font-semibold whitespace-nowrap">Profit/Loss</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-center font-semibold">Jobs</TableHead>
                    <TableHead className="text-right font-semibold whitespace-nowrap">
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
                    <TableRow
                      key={`${item.server.id}-${viewMode}`}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                    >
                      <TableCell className="text-center">
                        <div className="w-6 h-6 bg-slate-100 text-slate-600 font-semibold text-xs rounded-full flex items-center justify-center mx-auto">
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {item.server.first_name} {item.server.last_name}
                      </TableCell>
                      {viewMode === 'revenue' ? (
                        <>
                          <TableCell className="text-right font-medium text-slate-700">
                            <AnimatedNumber
                              value={item.serverPay || 0}
                              format="currency"
                              decimals={0}
                              delay={index * 20 + 60}
                              className="inline-block"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-700">
                            <AnimatedNumber
                              value={item.clientBilling || 0}
                              format="currency"
                              decimals={0}
                              delay={index * 20 + 80}
                              className="inline-block"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold inline-block ${(item.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                          <TableCell className="text-center text-slate-600">
                            <AnimatedNumber
                              value={item.jobs || 0}
                              delay={index * 20 + 60}
                              className="inline-block"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {viewMode === 'jobs' ? (
                              <AnimatedNumber
                                value={item.jobs || 0}
                                className="font-bold text-slate-900 inline-block"
                                delay={index * 20 + 80}
                              />
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <AnimatedNumber
                                  value={item.rating}
                                  decimals={1}
                                  className="font-bold text-slate-900 inline-block"
                                  delay={index * 20 + 100}
                                />
                              </div>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow key="no-data">
                    <TableCell colSpan={viewMode === 'revenue' ? 5 : 4} className="h-48 text-center">
                      <div>
                        <UserCheck className="mx-auto w-12 h-12 text-slate-300 mb-4" />
                        <p className="font-medium text-slate-600">No server data for this period.</p>
                        <p className="text-sm text-slate-500">Try selecting a different time frame.</p>
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
