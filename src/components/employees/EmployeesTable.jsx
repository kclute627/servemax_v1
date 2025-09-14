
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal,
  Edit,
  Mail,
  UserCheck,
  Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const roleConfig = {
  admin: { color: "bg-purple-100 text-purple-700", label: "Admin" },
  process_server: { color: "bg-blue-100 text-blue-700", label: "Process Server" },
  office_staff: { color: "bg-slate-100 text-slate-700", label: "Office Staff" }
};

const statusConfig = {
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending" },
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  inactive: { color: "bg-slate-100 text-slate-700", label: "Inactive" },
  on_leave: { color: "bg-indigo-100 text-indigo-700", label: "On Leave" }
};

export default function EmployeesTable({ employees, isLoading, onEdit, onSetDefault }) {

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No employees found</h3>
          <p className="text-slate-500">Add your first employee to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Email</TableHead>
                <TableHead className="font-semibold text-slate-700">Role</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Hire Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                        {employee.is_default_server && <Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
                        <span>{employee.first_name} {employee.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{employee.email}</TableCell>
                  <TableCell>
                    <Badge className={roleConfig[employee.role]?.color || "bg-slate-100"}>
                      {roleConfig[employee.role]?.label || employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[employee.status]?.color || "bg-slate-100"}>
                      {statusConfig[employee.status]?.label || employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {employee.hire_date ? format(new Date(employee.hire_date), "MMM d, yyyy") : "N/A"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => onEdit(employee)}>
                          <Edit className="w-4 h-4" />
                          Edit Employee
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2"
                          onClick={() => onSetDefault(employee)}
                          disabled={employee.is_default_server}
                        >
                          <Star className="w-4 h-4" />
                          Set as Default Server
                        </DropdownMenuItem>
                        {employee.status === 'pending' && (
                          <DropdownMenuItem className="gap-2" onClick={() => alert("To invite this user, go to your app's main User Management dashboard.")}>
                            <Mail className="w-4 h-4" />
                            Send/Resend Invite
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
