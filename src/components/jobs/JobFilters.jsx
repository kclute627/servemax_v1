import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function JobFilters({ filters, onFilterChange, clients, employees }) {
  const handleFilter = (name, value) => {
    onFilterChange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
        <Select value={filters.status} onValueChange={(value) => handleFilter('status', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">All Open</SelectItem>
            <SelectItem value="closed">All Closed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="served">Served</SelectItem>
            <SelectItem value="needs_affidavit">Needs Affidavit</SelectItem>
            <SelectItem value="unable_to_serve">Unable to Serve</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Priority</label>
        <Select value={filters.priority} onValueChange={(value) => handleFilter('priority', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="rush">Rush</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Client</label>
        <Select value={filters.client} onValueChange={(value) => handleFilter('client', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by client" />
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
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Assigned To</label>
        <Select value={filters.assignedServer} onValueChange={(value) => handleFilter('assignedServer', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by server" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Servers</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {employees.map(employee => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name || `${employee.first_name} ${employee.last_name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}