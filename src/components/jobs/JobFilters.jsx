import React from 'react';
import {
  Select,
  SelectItem,
  SelectSeparator,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function JobFilters({ filters, onFilterChange, clients, employees }) {
  const handleFilterChange = (key, value) => {
    onFilterChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select
          className="w-40"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
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
        </Select>
      </div>

      <Select
        className="w-32"
        value={filters.priority}
        onChange={(e) => handleFilterChange('priority', e.target.value)}
      >
        <SelectItem value="all">All Priority</SelectItem>
        <SelectItem value="standard">Standard</SelectItem>
        <SelectItem value="rush">Rush</SelectItem>
        <SelectItem value="emergency">Emergency</SelectItem>
      </Select>

      <Select
        className="w-36"
        value={filters.client}
        onChange={(e) => handleFilterChange('client', e.target.value)}
      >
        <SelectItem value="all">All Clients</SelectItem>
        {clients.map(client => (
          <SelectItem key={client.id} value={client.id}>
            {client.company_name}
          </SelectItem>
        ))}
      </Select>

      <Select
        className="w-36"
        value={filters.assignedServer}
        onChange={(e) => handleFilterChange('assignedServer', e.target.value)}
      >
        <SelectItem value="all">All Servers</SelectItem>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {employees.map(employee => (
          <SelectItem key={employee.id} value={employee.id}>
            {employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}