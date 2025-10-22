
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from '@/components/ui/animated-number';
import { motion, AnimatePresence, stagger } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, DollarSign, Briefcase, Calendar, TrendingUp } from "lucide-react";

export default function TopClients({ clientsData, isLoading, period, onPeriodChange, timePeriods }) {
  const [viewMode, setViewMode] = useState('revenue'); // 'revenue' or 'jobs'

  const sortedClients = useMemo(() => {
    if (!clientsData) return [];
    
    return [...clientsData]
      .filter(stat => stat[viewMode] > 0) // Filter out clients with 0 for the current metric
      .sort((a, b) => b[viewMode] - a[viewMode])
      .slice(0, 10); // Show top 10
  }, [clientsData, viewMode]);

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Top Clients</CardTitle>
                <p className="text-slate-600">Your most valuable clients by revenue and job volume.</p>
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
                  x: viewMode === 'revenue' ? 0 : '100%'
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
                className="absolute inset-y-1 left-1 bg-white rounded-md shadow-sm"
                style={{ width: 'calc(50% - 4px)' }}
              />
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
                onClick={() => setViewMode('jobs')}
                className={`gap-2 h-8 px-3 relative z-10 transition-colors duration-200 ${
                  viewMode === 'jobs' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Jobs
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
                <TableHead className="font-semibold whitespace-nowrap">Client</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">
                  {viewMode === 'revenue' ? 'Total Revenue' : 'Total Jobs'}
                </TableHead>
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
                      <TableCell className="text-right"><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedClients.length > 0 ? (
                  sortedClients.map((item, index) => (
                    <TableRow
                      key={`${item.client.id}-${viewMode}`}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                    >
                      <TableCell className="text-center">
                        <div className="w-6 h-6 bg-slate-100 text-slate-600 font-semibold text-xs rounded-full flex items-center justify-center mx-auto">
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {item.client.company_name}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        <AnimatedNumber
                          value={viewMode === 'revenue' ? item.revenue : item.jobs}
                          format={viewMode === 'revenue' ? 'currency' : 'number'}
                          decimals={viewMode === 'revenue' ? 0 : 0}
                          delay={index * 20 + 60}
                          className="inline-block"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow key="no-data">
                    <TableCell colSpan={3} className="h-48 text-center">
                      <div>
                        <Users className="mx-auto w-12 h-12 text-slate-300 mb-4" />
                        <p className="font-medium text-slate-600">No client data for this period.</p>
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
