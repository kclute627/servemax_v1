
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { CompanySettings, Job } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Calendar, 
  User, 
  Building, 
  Loader2, 
  AlertTriangle, 
  Settings,
  Clock,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const priorityColors = {
  standard: "bg-slate-100 text-slate-700",
  rush: "bg-amber-100 text-amber-800", 
  emergency: "bg-red-100 text-red-800"
};

const statusColors = {
  pending: "bg-slate-100 text-slate-600",
  assigned: "bg-blue-100 text-blue-600",
  in_progress: "bg-amber-100 text-amber-600",
  served: "bg-green-100 text-green-600",
  unable_to_serve: "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-gray-600"
};

export default function KanbanView({ jobs, clients, employees, onJobUpdate, isLoading }) {
  const [kanbanColumns, setKanbanColumns] = useState([]);
  const [isKanbanLoading, setIsKanbanLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localJobs, setLocalJobs] = useState([]); // Local state for optimistic updates

  useEffect(() => {
    loadKanbanSettings();
  }, []);

  // Update local jobs when props change
  useEffect(() => {
    setLocalJobs(jobs);
  }, [jobs]);

  const loadKanbanSettings = async () => {
    setIsKanbanLoading(true);
    try {
      const kanbanSettings = await CompanySettings.filter({ setting_key: "kanban_settings" });
      if (kanbanSettings.length > 0 && kanbanSettings[0].setting_value.columns) {
        const columns = kanbanSettings[0].setting_value.columns.sort((a, b) => a.order - b.order);
        setKanbanColumns(columns);
      } else {
        // Default columns if none configured
        setKanbanColumns([
          { id: "backlog", title: "Backlog", associated_statuses: ["pending"], order: 1 },
          { id: "assigned", title: "Assigned", associated_statuses: ["assigned"], order: 2 },
          { id: "in_progress", title: "In Progress", associated_statuses: ["in_progress"], order: 3 },
          { id: "completed", title: "Completed", associated_statuses: ["served"], order: 4 },
          { id: "unable", title: "Unable to Serve", associated_statuses: ["unable_to_serve", "cancelled"], order: 5 }
        ]);
      }
    } catch (error) {
      console.error("Error loading Kanban settings:", error);
    }
    setIsKanbanLoading(false);
  };

  const getJobsForColumn = (column) => {
    return localJobs.filter(job => column.associated_statuses.includes(job.status));
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Unknown Client';
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceColumnId = result.source.droppableId;
    const destColumnId = result.destination.droppableId;
    
    if (sourceColumnId === destColumnId) return; // No column change

    const destColumn = kanbanColumns.find(col => col.id === destColumnId);
    if (!destColumn || destColumn.associated_statuses.length === 0) return;

    const jobId = result.draggableId;
    const newStatus = destColumn.associated_statuses[0]; // Use first status of destination column

    // Find the job being moved
    const jobToUpdate = localJobs.find(job => job.id === jobId);
    if (!jobToUpdate) return;

    const originalStatus = jobToUpdate.status;

    // Optimistic update: immediately update the local state
    setLocalJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId 
          ? { ...job, status: newStatus }
          : job
      )
    );

    // Show updating indicator
    setIsUpdating(true);

    try {
      // Update in the background
      await Job.update(jobId, { status: newStatus });
      
      // Success - the optimistic update was correct, no need to do anything
      // The onJobUpdate() prop is typically used for a full refresh from the parent,
      // which we are now avoiding due to optimistic updates. If the parent
      // component needs to react to the job status change (e.g., re-fetch jobs
      // if it's subscribed to the job list), it should still be able to.
      // However, for the display on the kanban board, local state is sufficient.
      // If the parent `jobs` prop is derived from a subscription that updates
      // after the backend call, then `onJobUpdate` might become redundant for display,
      // but could still be useful for other side effects in the parent.
      // For now, we remove it as the local state handles the display.
      // If parent needs explicit notification, consider leaving a simplified onJobUpdate call or a dedicated callback.
    } catch (error) {
      console.error("Error updating job status:", error);
      
      // Revert the optimistic update on error
      setLocalJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId 
            ? { ...job, status: originalStatus }
            : job
        )
      );
      
      alert("Failed to update job status. The change has been reverted.");
    }
    
    setIsUpdating(false);
  };

  if (isLoading || isKanbanLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex gap-6 h-[600px]">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex-1 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kanbanColumns.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Kanban Configuration Found</h3>
        <p className="text-slate-500 mb-4">Configure your Kanban board columns in the Settings page to get started.</p>
        <Link to={createPageUrl("Settings")}>
          <Button className="gap-2">
            <Settings className="w-4 h-4" />
            Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {isUpdating && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2">
          <div className="flex items-center gap-2 text-blue-800">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Saving changes...</span>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 overflow-x-auto min-h-[600px]">
            {kanbanColumns.map(column => {
              const columnJobs = getJobsForColumn(column);
              
              return (
                <div key={column.id} className="flex-shrink-0 w-80">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">{column.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {columnJobs.length}
                      </Badge>
                    </div>
                    
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-[500px] rounded-lg p-2 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
                          }`}
                        >
                          {columnJobs.map((job, index) => (
                            <Draggable key={job.id} draggableId={job.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`cursor-move transition-all ${
                                    snapshot.isDragging ? 'shadow-lg rotate-1' : 'hover:shadow-md'
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <p className="font-semibold text-sm text-slate-900">
                                            #{job.job_number}
                                          </p>
                                          <p className="text-sm text-slate-600 font-medium">
                                            {job.recipient?.name}
                                          </p>
                                        </div>
                                        <Badge className={priorityColors[job.priority] || priorityColors.standard}>
                                          {job.priority}
                                        </Badge>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Building className="w-3 h-3" />
                                        <span>{getClientName(job.client_id)}</span>
                                      </div>
                                      
                                      {job.due_date && (
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                          <Clock className="w-3 h-3" />
                                          <span>Due {formatDistanceToNow(new Date(job.due_date), { addSuffix: true })}</span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center justify-between pt-2">
                                        <Badge className={statusColors[job.status] || statusColors.pending}>
                                          {job.status.replace('_', ' ')}
                                        </Badge>
                                        <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
                                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                            View <ArrowRight className="w-3 h-3 ml-1" />
                                          </Button>
                                        </Link>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          
                          {columnJobs.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-6 h-6 text-slate-400" />
                              </div>
                              <p className="text-sm">No jobs in this column</p>
                            </div>
                          )}
                          
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
