import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  UserPlus,
  MoreVertical,
  Mail,
  Key,
  UserX,
  UserCheck,
  Trash2,
  RefreshCw,
  Shield,
  Edit,
  Eye,
  Clock,
  Loader2,
  Users,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { entities } from '@/firebase/database';
import { FirebaseFunctions } from '@/firebase/functions';
import { CLIENT_USER_ROLES } from '@/firebase/schemas';
import { useToast } from '@/components/ui/use-toast';
import InviteClientUserDialog from './InviteClientUserDialog';

const roleConfig = {
  [CLIENT_USER_ROLES.VIEWER]: {
    label: 'Viewer',
    color: 'bg-slate-100 text-slate-700',
    icon: Eye,
    description: 'View only'
  },
  [CLIENT_USER_ROLES.MANAGER]: {
    label: 'Manager',
    color: 'bg-blue-100 text-blue-700',
    icon: Edit,
    description: 'Can submit jobs'
  },
  [CLIENT_USER_ROLES.ADMIN]: {
    label: 'Admin',
    color: 'bg-purple-100 text-purple-700',
    icon: Shield,
    description: 'Full access'
  }
};

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactive', color: 'bg-slate-100 text-slate-500' }
};

export default function PortalAccessTab({
  clientId,
  parentCompanyId,
  primaryContact,
  portalSlug
}) {
  const { toast } = useToast();
  const [portalUsers, setPortalUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track which user action is loading
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, user: null });

  // Load portal users for this client
  const loadPortalUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const users = await entities.ClientUser.filter({ client_company_id: clientId });
      setPortalUsers(users || []);
    } catch (error) {
      console.error('Error loading portal users:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading portal users',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    if (clientId) {
      loadPortalUsers();
    }
  }, [clientId, loadPortalUsers]);

  // Get user status
  const getUserStatus = (user) => {
    if (!user.is_active) return 'inactive';
    if (user.invitation_status === 'pending') return 'pending';
    return 'active';
  };

  // Format last login date
  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    try {
      const date = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return 'Unknown';
    }
  };

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await entities.ClientUser.update(userId, { role: newRole });
      setPortalUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );
      toast({
        title: 'Role updated',
        description: 'User role has been changed successfully.'
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error updating role',
        description: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle send password reset
  const handleSendPasswordReset = async (user) => {
    setActionLoading(user.id);
    try {
      await FirebaseFunctions.sendClientPasswordReset({
        client_user_id: user.id,
        email: user.email
      });
      toast({
        title: 'Password reset sent',
        description: `Password reset email sent to ${user.email}`
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        variant: 'destructive',
        title: 'Error sending password reset',
        description: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (user) => {
    setActionLoading(user.id);
    try {
      const newStatus = !user.is_active;
      await entities.ClientUser.update(user.id, { is_active: newStatus });
      setPortalUsers(prev =>
        prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u)
      );
      toast({
        title: newStatus ? 'User activated' : 'User deactivated',
        description: newStatus
          ? `${user.email} can now access the portal.`
          : `${user.email} can no longer access the portal.`
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        variant: 'destructive',
        title: 'Error updating user',
        description: error.message
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: null, user: null });
    }
  };

  // Handle resend invitation
  const handleResendInvite = async (user) => {
    setActionLoading(user.id);
    try {
      await FirebaseFunctions.inviteClientUser({
        email: user.email,
        name: user.name,
        role: user.role,
        client_company_id: clientId,
        parent_company_id: parentCompanyId,
        resend: true
      });
      toast({
        title: 'Invitation resent',
        description: `A new invitation email has been sent to ${user.email}`
      });
    } catch (error) {
      console.error('Error resending invite:', error);
      toast({
        variant: 'destructive',
        title: 'Error resending invitation',
        description: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle remove user
  const handleRemoveUser = async (user) => {
    setActionLoading(user.id);
    try {
      await entities.ClientUser.delete(user.id);
      setPortalUsers(prev => prev.filter(u => u.id !== user.id));
      toast({
        title: 'User removed',
        description: `${user.email} has been removed from the portal.`
      });
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        variant: 'destructive',
        title: 'Error removing user',
        description: error.message
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: null, user: null });
    }
  };

  // Handle view as user (admin impersonation)
  const handleViewAsUser = async (user) => {
    setActionLoading(user.id);
    try {
      const result = await FirebaseFunctions.generateClientImpersonationToken({
        client_user_id: user.id
      });

      if (result.success) {
        // Open portal in new tab with impersonation token
        const impersonateUrl = `${result.portalUrl}?token=${encodeURIComponent(result.token)}&email=${encodeURIComponent(result.clientUserEmail)}`;
        window.open(impersonateUrl, '_blank');

        toast({
          title: 'Opening portal',
          description: `Viewing portal as ${user.email} in new tab`
        });
      }
    } catch (error) {
      console.error('Error generating impersonation token:', error);
      toast({
        variant: 'destructive',
        title: 'Error viewing as user',
        description: error.message || 'Failed to generate impersonation token'
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Get primary contact info for suggestion
  const getSuggestedContact = () => {
    if (!primaryContact) return { email: '', name: '' };
    return {
      email: primaryContact.email || '',
      name: `${primaryContact.first_name || ''} ${primaryContact.last_name || ''}`.trim()
    };
  };

  // Check if primary contact already has portal access
  const primaryContactHasAccess = primaryContact?.email &&
    portalUsers.some(u => u.email.toLowerCase() === primaryContact.email.toLowerCase());

  // Separate active users and pending invitations
  const activeUsers = portalUsers.filter(u => u.invitation_status !== 'pending');
  const pendingUsers = portalUsers.filter(u => u.invitation_status === 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Portal Users</h3>
          <p className="text-sm text-slate-500">
            Manage who can access the client portal
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Suggestion banner for primary contact */}
      {primaryContact?.email && !primaryContactHasAccess && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">
                  Invite primary contact?
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {primaryContact.email} doesn't have portal access yet.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowInviteDialog(true)}
              className="shrink-0"
            >
              Invite
            </Button>
          </div>
        </div>
      )}

      {/* Portal URL info */}
      {portalSlug && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            <span className="font-medium">Portal URL:</span>{' '}
            <code className="bg-slate-200 px-2 py-0.5 rounded text-sm">
              {window.location.origin}/portal/{portalSlug}/login
            </code>
          </p>
        </div>
      )}

      {/* Active Users */}
      {activeUsers.length > 0 ? (
        <div className="space-y-3">
          {activeUsers.map((user) => {
            const status = getUserStatus(user);
            const roleInfo = roleConfig[user.role] || roleConfig[CLIENT_USER_ROLES.VIEWER];
            const statusInfo = statusConfig[status];
            const isActionLoading = actionLoading === user.id;
            const RoleIcon = roleInfo.icon;

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium shrink-0">
                    {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>

                  {/* User Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">
                        {user.name || 'Unnamed User'}
                      </span>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last login: {formatLastLogin(user.last_login)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role & Actions */}
                <div className="flex items-center gap-3">
                  {/* Role Dropdown */}
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={isActionLoading}
                  >
                    <SelectTrigger className="w-[130px]">
                      <div className="flex items-center gap-2">
                        <RoleIcon className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleConfig).map(([value, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{config.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isActionLoading}>
                        {isActionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewAsUser(user)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View As User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSendPasswordReset(user)}>
                        <Key className="w-4 h-4 mr-2" />
                        Send Password Reset
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setConfirmDialog({
                          open: true,
                          type: user.is_active ? 'deactivate' : 'activate',
                          user
                        })}
                      >
                        {user.is_active ? (
                          <>
                            <UserX className="w-4 h-4 mr-2" />
                            Deactivate User
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Activate User
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setConfirmDialog({
                          open: true,
                          type: 'remove',
                          user
                        })}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No portal users yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Invite users to give them access to the client portal
          </p>
          <Button
            className="mt-4"
            onClick={() => setShowInviteDialog(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite First User
          </Button>
        </div>
      ) : null}

      {/* Pending Invitations */}
      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Invitations ({pendingUsers.length})
          </h4>
          {pendingUsers.map((user) => {
            const isActionLoading = actionLoading === user.id;
            const roleInfo = roleConfig[user.role] || roleConfig[CLIENT_USER_ROLES.VIEWER];

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-medium shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">
                        {user.name || user.email}
                      </span>
                      <Badge className={roleInfo.color}>
                        {roleInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Invitation sent - awaiting acceptance
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAsUser(user)}
                    disabled={isActionLoading}
                    title="View portal as this user"
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View As
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendInvite(user)}
                    disabled={isActionLoading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setConfirmDialog({
                      open: true,
                      type: 'remove',
                      user
                    })}
                    disabled={isActionLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Dialog */}
      <InviteClientUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        clientId={clientId}
        parentCompanyId={parentCompanyId}
        suggestedEmail={getSuggestedContact().email}
        suggestedName={getSuggestedContact().name}
        onInviteSent={() => {
          loadPortalUsers();
        }}
      />

      {/* Confirmation Dialogs */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: null, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'remove' && 'Remove User'}
              {confirmDialog.type === 'deactivate' && 'Deactivate User'}
              {confirmDialog.type === 'activate' && 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'remove' && (
                <>
                  Are you sure you want to remove <strong>{confirmDialog.user?.email}</strong> from the portal?
                  This action cannot be undone.
                </>
              )}
              {confirmDialog.type === 'deactivate' && (
                <>
                  Deactivating <strong>{confirmDialog.user?.email}</strong> will prevent them from accessing the portal.
                  You can reactivate them later.
                </>
              )}
              {confirmDialog.type === 'activate' && (
                <>
                  Activating <strong>{confirmDialog.user?.email}</strong> will allow them to access the portal again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.type === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => {
                if (confirmDialog.type === 'remove') {
                  handleRemoveUser(confirmDialog.user);
                } else {
                  handleToggleActive(confirmDialog.user);
                }
              }}
            >
              {confirmDialog.type === 'remove' && 'Remove'}
              {confirmDialog.type === 'deactivate' && 'Deactivate'}
              {confirmDialog.type === 'activate' && 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
