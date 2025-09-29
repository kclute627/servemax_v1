import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Briefcase, User, Clock } from 'lucide-react';

const statusColumnsConfig = [
  { status: 'pending', title: 'Pending' },
  { status: 'assigned', title: 'Assigned' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'served', title: 'Served' },
  { status: 'needs_affidavit', title: 'Needs Affidavit' },
  { status: 'unable_to_serve', title: 'Unable to Serve' },
];

const priorityConfig = {
  standard: { color: "border-transparent" },
  rush: { color: "border-orange-400" },
  emergency: { color: "border-red-500" }
};

const JobCard = ({ job, client, server }) => (
  <Draggable draggableId={job.id} index={job.id}>
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className="mb-3"
      >
        <Card className={`hover:bg-slate-50 transition-all border-l-4 ${priorityConfig[job.priority]?.color || 'border-transparent'}`}>
          <CardContent className="p-4 space-y-2">
            <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`} className="font-semibold text-slate-800 hover:text-blue-600 block">
              {job.recipient?.name || 'Unknown Recipient'}
            </Link>
            <div className="text-sm text-slate-500">
              <p className="font-medium text-slate-600">{client?.company_name || 'Unknown Client'}</p>
              <p>Job #: {job.job_number}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
                <div className="flex items-center gap-1">
                    <User className="w-3 h-3"/>
                    <span>{server}</span>
                </div>
                {job.due_date && 
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        <span>{new Date(job.due_date).toLocaleDateString()}</span>
                    </div>
                }
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </Draggable>
);

export default function KanbanView({ jobs, clients, employees, onJobStatusChange, isLoading }) {
  const [columns, setColumns] = useState({});

  useEffect(() => {
    const groupedJobs = statusColumnsConfig.reduce((acc, col) => {
      acc[col.status] = [];
      return acc;
    }, {});
    
    jobs.forEach(job => {
      if (groupedJobs[job.status]) {
        groupedJobs[job.status].push(job);
      }
    });

    setColumns(groupedJobs);
  }, [jobs]);

  const getClientName = (clientId) => clients.find(c => c.id === clientId);
  const getServerName = (serverId) => {
    if (!serverId) return 'Unassigned';
    const server = employees.find(e => e.id === serverId);
    return server ? `${server.first_name} ${server.last_name}` : 'Unknown';
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    onJobStatusChange(draggableId, destination.droppableId);
    
    // Optimistic UI Update
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceItems = [...sourceColumn];
    const destItems = [...destColumn];
    const [removed] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, removed);

    setColumns({
      ...columns,
      [source.droppableId]: sourceItems,
      [destination.droppableId]: destItems
    });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-80 flex-shrink-0 bg-slate-100 rounded-xl p-3">
            <Skeleton className="h-6 w-1/2 mb-4" />
            <Skeleton className="h-24 w-full mb-3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-2">
        {statusColumnsConfig.map(column => (
          <div key={column.status} className="w-80 flex-shrink-0 bg-slate-100 rounded-xl">
            <Droppable droppableId={column.status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-3 min-h-[500px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-slate-200' : ''}`}
                >
                  <div className="flex items-center justify-between px-2 pb-3 mb-3 border-b">
                    <h3 className="font-semibold text-slate-800">{column.title}</h3>
                    <span className="text-sm font-medium bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
                      {columns[column.status]?.length || 0}
                    </span>
                  </div>
                  {columns[column.status]?.map(job => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      client={getClientName(job.client_id)} 
                      server={getServerName(job.assigned_server_id)} 
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}