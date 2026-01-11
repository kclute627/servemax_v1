
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
import { Users, DollarSign, Briefcase, Calendar, TrendingUp, Building2 } from "lucide-react";

export default function TopClients({ clientsData, isLoading, period, onPeriodChange, timePeriods }) {
  const [viewMode, setViewMode] = useState('revenue'); // 'revenue' or 'jobs'

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

  const sortedClients = useMemo(() => {
    if (!clientsData) return [];
    
    return [...clientsData]
      .filter(stat => stat[viewMode] > 0) // Filter out clients with 0 for the current metric
      .sort((a, b) => b[viewMode] - a[viewMode])
      .slice(0, 10); // Show top 10
  }, [clientsData, viewMode]);

  return (
    <Card className="border-0 bg-[#F0F0F0] overflow-hidden">
      <CardHeader className="bg-[#F0F0F0] text-black p-2 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FDFDFD] rounded-lg p-2 border border-gray-200">
            <div className="flex items-center gap-4">
              {/* <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div> */}
              <div>
                <CardTitle className="text-[15px] font-[500] text[#1F1F21] py-6">Top Clients</CardTitle>
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
                  x: viewMode === 'revenue' ? 0 : '100%'
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
                className="absolute inset-y-1 left-1 bg-white rounded-lg"
                style={{ width: 'calc(50% - 4px)' }}
              />
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
                onClick={() => setViewMode('jobs')}
                className={`flex-1 h-6 flex items-center justify-center leading-none
    relative z-10 transition-colors hover:bg-transparent
    ${viewMode === 'jobs'
                    ? 'text-dark'
                    : 'text-[#1F1F21] hover:text-[#12872F]'}`}
              >
                Jobs
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[330px] overflow-x-auto overflow-y-auto px-1">
          <div className="w-[98%] mx-auto bg-[#FDFDFD] rounded-lg border-b border-gray-200 overflow-hidden ">
            <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-[#F7F7F7] rounded-md">
                <TableHead className="w-[70px] text-center text-[15px] font-[500] text-[#1F1F21]">Rank</TableHead>
                <TableHead className=" text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap">Client</TableHead>
                <TableHead className="text-right  text-[15px] font-[500] text-[#1F1F21] whitespace-nowrap">
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
                    <motion.tr
                      key={`${item.client.id}-${viewMode}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <TableCell className="py-3 text-center">
                        <span className="text-[#1F1F21] font-medium">
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[#1F1F21] font-medium ">
                          {item.client.company_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3 pr-10">
                        <span className="text-[#1F1F21] font-medium">
                          <AnimatedNumber
                            value={viewMode === 'revenue' ? item.revenue : item.jobs}
                            format={viewMode === 'revenue' ? 'currency' : 'number'}
                            decimals={viewMode === 'revenue' ? 0 : 0}
                            delay={index * 20 + 60}
                            className="inline-block"
                          />
                        </span>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow key="no-data">
                    <TableCell colSpan={3} className="h-64 text-center">
                      <div className="py-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Building2 className="w-10 h-10 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-slate-700 text-lg mb-2">No Client Data Yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                          Create jobs for your clients and they'll appear here based on their revenue and activity.
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
