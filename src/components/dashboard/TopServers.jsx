import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, Briefcase, Star, Calendar, Award } from "lucide-react";

export default function TopServers({ serversData, isLoading, period, onPeriodChange, timePeriods }) {
  const [viewMode, setViewMode] = useState('jobs'); // 'jobs' or 'rating'

  const sortedServers = useMemo(() => {
    if (!serversData) return [];
    
    return [...serversData]
      .filter(stat => stat.jobs > 0 || stat.rating > 0) // Filter out servers with no activity
      .sort((a, b) => {
        if (viewMode === 'jobs') {
          return b.jobs - a.jobs;
        } else {
          // Sort by rating first, then by jobs as tiebreaker
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.jobs - a.jobs;
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
          <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <Button
                variant={viewMode === 'jobs' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('jobs')}
                className={`gap-2 h-8 px-3 ${viewMode === 'jobs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                <Briefcase className="w-4 h-4" />
                Jobs
              </Button>
              <Button
                variant={viewMode === 'rating' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('rating')}
                className={`gap-2 h-8 px-3 ${viewMode === 'rating' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                <Star className="w-4 h-4" />
                Rating
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[60px] text-center font-semibold">Rank</TableHead>
                <TableHead className="font-semibold">Server</TableHead>
                <TableHead className="text-center font-semibold">Jobs</TableHead>
                <TableHead className="text-right font-semibold">
                  {viewMode === 'jobs' ? 'Total Jobs' : 'Rating'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedServers.length > 0 ? (
                sortedServers.map((item, index) => (
                  <TableRow key={item.server.id}>
                    <TableCell className="text-center">
                      <div className="w-6 h-6 bg-slate-100 text-slate-600 font-semibold text-xs rounded-full flex items-center justify-center mx-auto">
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {item.server.first_name} {item.server.last_name}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {item.jobs}
                    </TableCell>
                    <TableCell className="text-right">
                      {viewMode === 'jobs' ? (
                        <span className="font-bold text-slate-900">{item.jobs}</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-slate-900">{item.rating}</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <UserCheck className="mx-auto w-12 h-12 text-slate-300 mb-4" />
                    <p className="font-medium text-slate-600">No server data for this period.</p>
                    <p className="text-sm text-slate-500">Try selecting a different time frame.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}