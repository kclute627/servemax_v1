import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  Clock,
  MoreHorizontal,
  Copy,
  Trash2,
  RefreshCw,
  Users,
  UserCheck
} from 'lucide-react';
import { User, Invitation } from '@/api/entities';
import { format } from 'date-fns';

export default function PendingInvitations({ refreshTrigger, onRefresh }) {
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvitations();
  }, [refreshTrigger]);

  const loadInvitations = async () => {
    setIsLoading(true);
    setError('');

    try {
      const pendingInvitations = await User.getPendingInvitations();
      setInvitations(pendingInvitations);
    } catch (err) {
      console.error('Error loading invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteLink = (token) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/InviteSignUp?token=${token}`;
  };

  const copyInviteLink = async (token) => {
    try {
      const link = generateInviteLink(token);
      await navigator.clipboard.writeText(link);
      // You could show a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const deleteInvitation = async (invitationId) => {
    try {
      await Invitation.delete(invitationId);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error deleting invitation:', err);
    }
  };

  const getUserTypeDisplay = (userType, employeeRole) => {
    if (userType === 'employee') {
      const roleNames = {
        admin: 'Administrator',
        manager: 'Manager',
        process_server: 'Process Server'
      };
      return {
        label: roleNames[employeeRole] || 'Employee',
        color: 'bg-blue-100 text-blue-700',
        icon: Users
      };
    } else if (userType === 'independent_contractor') {
      return {
        label: 'Contractor',
        color: 'bg-green-100 text-green-700',
        icon: UserCheck
      };
    }
    return { label: 'Unknown', color: 'bg-slate-100 text-slate-700', icon: Users };
  };

  const isExpired = (expiresAt) => {
    return new Date() > new Date(expiresAt);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations waiting to be accepted
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadInvitations}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No pending invitations</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const userType = getUserTypeDisplay(invitation.user_type, invitation.employee_role);
                const expired = isExpired(invitation.expires_at);

                return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <userType.icon className="w-4 h-4 text-slate-400" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={userType.color}>
                        {userType.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {expired && <Clock className="w-4 h-4 text-red-500" />}
                        <span className={expired ? 'text-red-600' : ''}>
                          {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={expired ? 'destructive' : 'secondary'}>
                        {expired ? 'Expired' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyInviteLink(invitation.invitation_token)}
                            disabled={expired}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteInvitation(invitation.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}