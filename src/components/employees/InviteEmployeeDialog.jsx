import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mail, AlertCircle, UserPlus, Copy, Check, ChevronDown, Shield } from 'lucide-react';
import { User } from '@/api/entities';
import { USER_TYPES, EMPLOYEE_ROLES } from '@/firebase/schemas';
import { getBaseRolePermissions, PERMISSION_CATEGORIES } from '@/utils/permissions';

export default function InviteEmployeeDialog({ open, onOpenChange, onInviteSent }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  // Calculate permissions for the selected role
  const rolePermissions = useMemo(() => {
    if (!role) return [];
    const mockUser = {
      user_type: USER_TYPES.EMPLOYEE,
      employee_role: role
    };
    return getBaseRolePermissions(mockUser);
  }, [role]);

  const handleClose = () => {
    setEmail('');
    setRole('');
    setError('');
    setInvitation(null);
    setInviteLink('');
    setLinkCopied(false);
    setShowPermissions(false);
    onOpenChange(false);
  };

  const generateInviteLink = (token) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/InviteSignUp?token=${token}`;
  };

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!role) {
      setError('Please select a role');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const newInvitation = await User.sendInvitation(email, USER_TYPES.EMPLOYEE, role);
      setInvitation(newInvitation);

      const link = generateInviteLink(newInvitation.invitation_token);
      setInviteLink(link);

      if (onInviteSent) {
        onInviteSent(newInvitation);
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err.message || 'Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const roleOptions = [
    { value: EMPLOYEE_ROLES.ADMIN, label: 'Administrator', description: 'Full access to all features' },
    { value: EMPLOYEE_ROLES.MANAGER, label: 'Manager', description: 'Can create and manage jobs' },
    { value: EMPLOYEE_ROLES.PROCESS_SERVER, label: 'Process Server', description: 'Can view and complete assigned jobs' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {invitation ? 'Invitation Sent!' : 'Invite Employee'}
          </DialogTitle>
          <DialogDescription>
            {invitation
              ? 'Share the invitation link below with your new employee'
              : 'Send an invitation to add a new employee to your company'
            }
          </DialogDescription>
        </DialogHeader>

        {!invitation ? (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@company.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(val) => { setRole(val); setShowPermissions(false); }} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-slate-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Permissions Preview */}
            {role && (
              <Collapsible open={showPermissions} onOpenChange={setShowPermissions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3 bg-slate-50 hover:bg-slate-100">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium">
                        {roleOptions.find(r => r.value === role)?.label} Permissions
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {rolePermissions.length} active
                      </Badge>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showPermissions ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="border rounded-lg p-3 bg-white space-y-3 max-h-48 overflow-y-auto">
                    {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                      const categoryPermissions = category.permissions.filter(p =>
                        rolePermissions.includes(p.key)
                      );
                      if (categoryPermissions.length === 0) return null;

                      return (
                        <div key={categoryKey}>
                          <p className="text-xs font-medium text-slate-500 mb-1">{category.label}</p>
                          <div className="flex flex-wrap gap-1">
                            {categoryPermissions.map(p => (
                              <Badge key={p.key} variant="secondary" className="text-xs font-normal">
                                {p.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Permissions can be customized after the employee joins.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• An invitation link will be generated</li>
                <li>• Share the link with your employee</li>
                <li>• They'll create their account and join your company</li>
                <li>• Access will be granted based on their role</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Invitation Created Successfully</span>
              </div>
              <p className="text-sm text-green-800">
                Invitation sent to <strong>{invitation.email}</strong> as <strong>{roleOptions.find(r => r.value === invitation.employee_role)?.label}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteLink}
                  className={linkCopied ? 'bg-green-50 border-green-200' : ''}
                >
                  {linkCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                This link expires in 7 days. Share it directly with your employee.
              </p>
            </div>

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Steps:</strong> Share this invitation link with your employee via email,
                text message, or any secure communication method. They'll use it to create their account
                and join your company.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {!invitation ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSendInvitation} disabled={isLoading}>
                {isLoading ? 'Creating Invitation...' : 'Send Invitation'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}