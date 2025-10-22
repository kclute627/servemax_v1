import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, AlertCircle, UserCheck, Copy, Check, HandHeart } from 'lucide-react';
import { User } from '@/api/entities';
import { USER_TYPES } from '@/firebase/schemas';

export default function InviteContractorDialog({ open, onOpenChange, onInviteSent }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleClose = () => {
    setEmail('');
    setError('');
    setInvitation(null);
    setInviteLink('');
    setLinkCopied(false);
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

    setIsLoading(true);
    setError('');

    try {
      const newInvitation = await User.sendInvitation(email, USER_TYPES.INDEPENDENT_CONTRACTOR);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            {invitation ? 'Contractor Invitation Sent!' : 'Invite Independent Contractor'}
          </DialogTitle>
          <DialogDescription>
            {invitation
              ? 'Share the invitation link below with the contractor'
              : 'Invite an independent contractor to work with your company'
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
              <Label htmlFor="email">Contractor Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contractor@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HandHeart className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Independent Contractor Benefits</span>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Free account - no subscription required</li>
                <li>• Can work with multiple companies</li>
                <li>• Access to assigned jobs and case information</li>
                <li>• Professional affidavit generation</li>
                <li>• Streamlined job completion workflow</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Contractor creates a free account using the invite link</li>
                <li>• They'll be connected to your company</li>
                <li>• You can assign jobs to them from your job board</li>
                <li>• They can accept/decline and complete jobs</li>
                <li>• Limited access - no client info or invoicing data</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Contractor Invitation Created</span>
              </div>
              <p className="text-sm text-green-800">
                Invitation sent to <strong>{invitation.email}</strong> as <strong>Independent Contractor</strong>
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
                This link expires in 7 days. Share it directly with the contractor.
              </p>
            </div>

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Steps:</strong> Share this invitation link with the contractor.
                Once they create their account, you'll be able to assign jobs to them from your job board.
                The contractor will have limited access and won't see sensitive company or client information.
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