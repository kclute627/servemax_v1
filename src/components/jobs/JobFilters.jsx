import React from 'react';
import { Select, SelectItem } from "@/components/ui/select";

export default function JobFilters({ filters, onFilterChange, employees }) {
  const handleFilter = (name, value) => {
    onFilterChange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
        <Select value={filters.status} onChange={(e) => handleFilter('status', e.target.value)}>
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
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Priority</label>
        <Select value={filters.priority} onChange={(e) => handleFilter('priority', e.target.value)}>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="rush">Rush</SelectItem>
          <SelectItem value="emergency">Emergency</SelectItem>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Assigned To</label>
        <Select value={filters.assignedServer} onChange={(e) => handleFilter('assignedServer', e.target.value)}>
          <SelectItem value="all">All Servers</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {employees.map(employee => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name || `${employee.first_name} ${employee.last_name}`}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}