
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  MapPin,
  ArrowRight,
  Briefcase
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  pending: { color: "bg-slate-100 text-slate-700", icon: Clock },
  assigned: { color: "bg-blue-100 text-blue-700", icon: User },
  in_progress: { color: "bg-amber-100 text-amber-700", icon: Clock },
  served: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  unable_to_serve: { color: "bg-red-100 text-red-700", icon: AlertTriangle },
  cancelled: { color: "bg-slate-100 text-slate-500", icon: AlertTriangle }
};

const priorityConfig = {
  standard: { color: "bg-slate-100 text-slate-700" },
  rush: { color: "bg-orange-100 text-orange-700" },
  emergency: { color: "bg-red-100 text-red-700" }
};

export default function RecentJobs({ jobs, isLoading }) {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900">Recent Jobs</CardTitle>
          <Link to={createPageUrl("Jobs")}>
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No jobs yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first job to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => {
              const StatusIcon = statusConfig[job.status]?.icon || Clock;
              const isOverdue = job.due_date && new Date(job.due_date) < new Date() && job.status !== 'served';
              
              return (
                <div key={job.id} className="p-6 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`p-2 rounded-lg ${statusConfig[job.status]?.color.includes('bg-') ? statusConfig[job.status]?.color.split(' ')[0] : 'bg-slate-100'}`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig[job.status]?.color.includes('text-') ? statusConfig[job.status]?.color.split(' ')[1] : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900 mb-1">
                              {job.case_name}
                            </p>
                            <p className="text-sm text-slate-600 mb-2">
                              Job #{job.job_number}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={statusConfig[job.status]?.color}>
                              {job.status.replace(/_/g, ' ')}
                            </Badge>
                            {job.priority !== 'standard' && (
                              <Badge variant="outline" className={priorityConfig[job.priority]?.color}>
                                {job.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User className="w-4 h-4" />
                            <span>{job.defendant_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{job.defendant_address}</span>
                          </div>
                          {job.due_date && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4" />
                              <span className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}>
                                Due: {format(new Date(job.due_date), "MMM d, yyyy")}
                                {isOverdue && " (Overdue)"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
