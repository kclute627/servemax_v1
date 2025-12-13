import React, { useState, useEffect } from 'react';
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
import { Mail, AlertCircle, UserPlus, Copy, Check, Eye, Edit, Shield, Loader2 } from 'lucide-react';
import { FirebaseFunctions } from '@/firebase/functions';
import { CLIENT_USER_ROLES } from '@/firebase/schemas';

export default function InviteClientUserDialog({
  open,
  onOpenChange,
  clientId,
  parentCompanyId,
  suggestedEmail = '',
  suggestedName = '',
  onInviteSent
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(CLIENT_USER_ROLES.MANAGER);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Pre-fill with suggested values when dialog opens
  useEffect(() => {
    if (open) {
      setEmail(suggestedEmail || '');
      setName(suggestedName || '');
      setRole(CLIENT_USER_ROLES.MANAGER);
      setError('');
      setSuccess(false);
      setInviteUrl('');
      setLinkCopied(false);
    }
  }, [open, suggestedEmail, suggestedName]);

  const handleClose = () => {
    setEmail('');
    setName('');
    setRole(CLIENT_USER_ROLES.MANAGER);
    setError('');
    setSuccess(false);
    setInviteUrl('');
    setLinkCopied(false);
    onOpenChange(false);
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
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await FirebaseFunctions.inviteClientUser({
        email: email.trim(),
        name: name.trim(),
        role,
        client_company_id: clientId,
        parent_company_id: parentCompanyId
      });

      if (result.success) {
        setSuccess(true);
        setInviteUrl(result.invite_url || '');

        if (onInviteSent) {
          onInviteSent(result);
        }
      } else {
        throw new Error(result.error || 'Failed to send invitation');
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
      await navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const roleOptions = [
    {
      value: CLIENT_USER_ROLES.VIEWER,
      label: 'Viewer',
      description: 'Can only view jobs and invoices',
      icon: Eye
    },
    {
      value: CLIENT_USER_ROLES.MANAGER,
      label: 'Manager',
      description: 'Can submit jobs and view everything',
      icon: Edit
    },
    {
      value: CLIENT_USER_ROLES.ADMIN,
      label: 'Admin',
      description: 'Full control including managing other portal users',
      icon: Shield
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {success ? 'Invitation Sent!' : 'Invite Portal User'}
          </DialogTitle>
          <DialogDescription>
            {success
              ? 'The invitation email has been sent. Share the link below if needed.'
              : 'Give your client access to view jobs and invoices through the portal.'
            }
          </DialogDescription>
        </DialogHeader>

        {!success ? (
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
                  placeholder="client@company.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500">This will be their login username</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Portal Access Level</Label>
              <div className="space-y-2">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      disabled={isLoading}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{option.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                        <p className="text-sm text-slate-500">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSendInvitation} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">Invitation sent to {email}</p>
                  <p className="text-sm text-green-700 mt-1">
                    They will receive an email with instructions to set up their account.
                  </p>
                </div>
              </div>
            </div>

            {inviteUrl && (
              <div className="space-y-2">
                <Label>Invitation Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-sm bg-slate-50"
                  />
                  <Button
                    variant="outline"
                    onClick={copyInviteLink}
                    className="shrink-0"
                  >
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  This link expires in 7 days
                </p>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
