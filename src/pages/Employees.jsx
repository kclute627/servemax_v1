
import React, { useState, useEffect, useCallback } from "react";
import { Employee } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Plus, 
  Search,
  Info
} from "lucide-react";

import EmployeesTable from "../components/employees/EmployeesTable";
import NewEmployeeDialog from "../components/employees/NewEmployeeDialog";
import EditEmployeeDialog from "../components/employees/EditEmployeeDialog"; // New import

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // New state for editing
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await Employee.list("-created_date");
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
    setIsLoading(false);
  };

  const filterEmployees = useCallback(() => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(employee => 
        `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEmployees(filtered);
  }, [employees, searchTerm]);

  useEffect(() => {
    filterEmployees();
  }, [filterEmployees]);

  const handleEmployeeCreated = () => {
    loadEmployees();
    setShowNewEmployeeDialog(false);
  };

  const handleEmployeeUpdated = () => {
    loadEmployees();
    setEditingEmployee(null); // Close the dialog
  };

  const handleSetDefault = async (employeeToSetAsDefault) => {
    // Find the current default employee
    const currentDefault = employees.find(e => e.is_default_server);

    try {
        const updatePromises = [];

        // If there's a current default and it's not the one we're setting, unset it
        if (currentDefault && currentDefault.id !== employeeToSetAsDefault.id) {
            updatePromises.push(Employee.update(currentDefault.id, { is_default_server: false }));
        }

        // Set the new employee as the default
        updatePromises.push(Employee.update(employeeToSetAsDefault.id, { is_default_server: true }));

        await Promise.all(updatePromises);

        // Refresh the local data to reflect the change in the UI
        loadEmployees();

    } catch (error) {
        console.error("Failed to set default employee:", error);
        alert("There was an error setting the default server. Please try again.");
    }
  };


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Employees</h1>
              <p className="text-slate-600">Manage your staff and process servers</p>
            </div>
            <Button 
              onClick={() => setShowNewEmployeeDialog(true)}
              className="bg-slate-900 hover:bg-slate-800 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>

          {/* Invitation Info Alert */}
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-700" />
            <AlertTitle className="text-blue-900">How to Invite a New Employee</AlertTitle>
            <AlertDescription className="text-blue-800">
              Adding an employee here creates their profile. To grant them access, you must also invite them as a user from your app's main User Management dashboard, which will send them a sign-up link.
            </AlertDescription>
          </Alert>
          
          {/* Search */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <EmployeesTable 
            employees={filteredEmployees}
            isLoading={isLoading}
            onEdit={(employee) => setEditingEmployee(employee)} // Pass edit handler
            onSetDefault={handleSetDefault}
          />

          {/* New Employee Dialog */}
          <NewEmployeeDialog
            open={showNewEmployeeDialog}
            onOpenChange={setShowNewEmployeeDialog}
            onEmployeeCreated={handleEmployeeCreated}
          />

          {/* Edit Employee Dialog */}
          {editingEmployee && (
            <EditEmployeeDialog
              key={editingEmployee.id} // Ensures dialog re-renders with new data
              open={!!editingEmployee}
              onOpenChange={() => setEditingEmployee(null)}
              employee={editingEmployee}
              onEmployeeUpdated={handleEmployeeUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
}
