
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
  Eye,
  Mail,
  Phone,
  Building2,
  MapPin,
  Handshake
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const clientTypeConfig = {
  law_firm: { color: "bg-blue-100 text-blue-700", label: "Law Firm" },
  insurance: { color: "bg-green-100 text-green-700", label: "Insurance" },
  corporate: { color: "bg-purple-100 text-purple-700", label: "Corporate" },
  government: { color: "bg-amber-100 text-amber-700", label: "Government" },
  individual: { color: "bg-slate-100 text-slate-700", label: "Individual" },
  process_serving: { color: "bg-orange-100 text-orange-700", label: "Process Serving Company" },
  independent_process_server: { color: "bg-indigo-100 text-indigo-700", label: "Independent Process Server" }
};

const statusConfig = {
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  inactive: { color: "bg-slate-100 text-slate-700", label: "Inactive" },
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending" }
};

// Helper function to safely convert Firestore timestamps to Date objects
const toDate = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
};

// Helper to safely format dates
const formatDate = (dateValue, formatString) => {
  const date = toDate(dateValue);
  if (!date) return 'N/A';
  try {
    return format(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

export default function ClientsTable({ clients, isLoading, onClientUpdate }) {
  const getPrimaryContact = (client) => {
    const primaryContact = client.contacts?.find(c => c.primary) || client.contacts?.[0];
    return primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : "No contact";
  };

  const getPrimaryEmail = (client) => {
    const primaryContact = client.contacts?.find(c => c.primary) || client.contacts?.[0];
    return primaryContact?.email || "No email";
  };

  const getPrimaryPhone = (client) => {
    const primaryPhone = client.phone_numbers?.find(p => p.primary) || client.phone_numbers?.[0];
    const contactPhone = client.contacts?.find(c => c.primary)?.phone || client.contacts?.[0]?.phone;
    return primaryPhone?.number || contactPhone || "No phone";
  };

  const getPrimaryAddress = (client) => {
    const primaryAddress = client.addresses?.find(a => a.primary) || client.addresses?.[0];
    if (!primaryAddress) return "No address";
    return `${primaryAddress.city}, ${primaryAddress.state}`;
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Company</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No clients found</h3>
          <p className="text-slate-500">Add your first client to get started</p>
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
                <TableHead className="font-semibold text-slate-700">Company</TableHead>
                <TableHead className="font-semibold text-slate-700">Primary Contact</TableHead>
                <TableHead className="font-semibold text-slate-700">Type</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`${createPageUrl("ClientDetails")}?id=${client.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                          >
                            {client.company_name}
                          </Link>
                          {client.is_job_share_partner && (
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 gap-1 text-xs">
                              <Handshake className="w-3 h-3" />
                              Partner
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-500">{getPrimaryAddress(client)}</span>
                        </div>
                        {client.collaborating && (
                          <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 text-xs">
                            Collaborating
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{getPrimaryContact(client)}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-600 truncate max-w-32">{getPrimaryEmail(client)}</span>
                        </div>
                        {getPrimaryPhone(client) !== "No phone" && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-600">{getPrimaryPhone(client)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={clientTypeConfig[client.company_type]?.color || "bg-slate-100 text-slate-700"}>
                      {clientTypeConfig[client.company_type]?.label || client.company_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[client.status]?.color || "bg-slate-100 text-slate-700"}>
                      {statusConfig[client.status]?.label || client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {formatDate(client.created_at, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`${createPageUrl("ClientDetails")}?id=${client.id}`} className="gap-2 flex items-center">
                            <Eye className="w-4 h-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {/* The "Edit Client" menu item has been removed as per consolidation. 
                            Editing functionality is now expected to be available within the ClientDetails page. */}
                        <DropdownMenuItem className="gap-2">
                          <Mail className="w-4 h-4" />
                          Send Email
                        </DropdownMenuItem>
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
