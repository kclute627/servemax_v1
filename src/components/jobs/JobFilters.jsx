import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function JobFilters({ filters, onFilterChange, clients, employees }) {
  const handleFilterChange = (key, value) => {
    onFilterChange(prev => ({
      ...prev,
      [key]: value === 'all' ? 'all' : value // Ensure 'all' is handled correctly
    }));
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">All Open Jobs</SelectItem>
            <SelectItem value="closed">All Closed Jobs</SelectItem>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectSeparator />
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="served">Served</SelectItem>
            <SelectItem value="unable_to_serve">Unable to Serve</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Select
        value={filters.priority}
        onValueChange={(value) => handleFilterChange('priority', value)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Filter by priority..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="rush">Rush</SelectItem>
          <SelectItem value="emergency">Emergency</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.client}
        onValueChange={(value) => handleFilterChange('client', value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by client..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {clients.map(client => (
            <SelectItem key={client.id} value={client.id}>
              {client.company_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assignedServer}
        onValueChange={(value) => handleFilterChange('assignedServer', value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by server..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Servers</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {employees.map(employee => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}