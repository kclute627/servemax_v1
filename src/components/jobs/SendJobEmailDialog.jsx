import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FirebaseFunctions } from "@/firebase/functions";
import {
  Loader2,
  Mail,
  FileText,
  ClipboardList,
  Receipt,
  FileCheck,
  User,
  Users,
  UserCog,
  Plus,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SendJobEmailDialog({
  open,
  onOpenChange,
  job,
  client,
  attempts = [],
  assignedServer,
  companyId,
  preSelectedContent = {} // { includeAttempts: true } for attempt-specific emails
}) {
  const { currentUser } = useAuth();

  // Content options
  const [contentOptions, setContentOptions] = useState({
    includeServiceInfo: true,
    includeAttempts: false,
    includeAffidavit: false,
    includeInvoice: false,
  });

  // Recipients
  const [recipients, setRecipients] = useState([]);
  const [customEmail, setCustomEmail] = useState('');
  const [customEmails, setCustomEmails] = useState([]);

  // Email content
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success: boolean, message: string }

  // Initialize recipients when dialog opens
  useEffect(() => {
    if (open && job && client) {
      const initialRecipients = [];

      // Job contact (pre-checked)
      if (job.contact_email) {
        initialRecipients.push({
          id: 'job_contact',
          email: job.contact_email,
          name: job.contact_name || 'Job Contact',
          type: 'job_contact',
          checked: true,
        });
      }

      // Other client contacts (unchecked)
      if (client.contacts && client.contacts.length > 0) {
        client.contacts.forEach(contact => {
          if (contact.email && contact.email !== job.contact_email) {
            initialRecipients.push({
              id: contact.id,
              email: contact.email,
              name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email,
              type: 'client_contact',
              checked: false,
            });
          }
        });
      }

      // Assigned server/employee (unchecked)
      if (assignedServer && assignedServer.email) {
        initialRecipients.push({
          id: 'server',
          email: assignedServer.email,
          name: assignedServer.full_name || assignedServer.name || 'Assigned Server',
          type: 'server',
          checked: false,
        });
      }

      setRecipients(initialRecipients);

      // Set default subject
      setSubject(`Job Update - ${job.case_caption || job.job_number || 'Service Job'}`);

      // Apply pre-selected content
      if (preSelectedContent) {
        setContentOptions(prev => ({
          ...prev,
          ...preSelectedContent,
        }));
      }

      // Reset state
      setCustomMessage('');
      setCustomEmails([]);
      setResult(null);
    }
  }, [open, job, client, assignedServer, preSelectedContent]);

  const handleRecipientToggle = (id) => {
    setRecipients(prev => prev.map(r =>
      r.id === id ? { ...r, checked: !r.checked } : r
    ));
  };

  const handleAddCustomEmail = () => {
    if (customEmail && customEmail.includes('@')) {
      setCustomEmails(prev => [...prev, {
        id: `custom_${Date.now()}`,
        email: customEmail.trim(),
        name: customEmail.split('@')[0],
        type: 'custom',
        checked: true,
      }]);
      setCustomEmail('');
    }
  };

  const handleRemoveCustomEmail = (id) => {
    setCustomEmails(prev => prev.filter(e => e.id !== id));
  };

  const getSelectedRecipients = () => {
    const selected = recipients.filter(r => r.checked);
    const customSelected = customEmails.filter(e => e.checked);
    return [...selected, ...customSelected];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) {
      setResult({ success: false, message: 'Please select at least one recipient.' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await FirebaseFunctions.sendJobEmail({
        jobId: job.id,
        companyId: companyId,
        recipients: selectedRecipients.map(r => ({
          email: r.email,
          name: r.name,
          type: r.type,
        })),
        contentOptions: contentOptions,
        customMessage: customMessage || null,
        subject: subject,
        userId: currentUser?.uid,
        userName: currentUser?.display_name || currentUser?.email,
      });

      setResult({
        success: true,
        message: response.message || `Email sent to ${selectedRecipients.length} recipient(s)`,
      });

      // Close dialog after short delay on success
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error('Error sending job email:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to send email. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = getSelectedRecipients().length;
  const hasContent = Object.values(contentOptions).some(v => v) || customMessage.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Job Email
          </DialogTitle>
          <DialogDescription>
            Select what to include and who to send to. Email will only be sent when you click "Send Email".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Subject Line */}
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
            />
          </div>

          {/* Content Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Include in Email</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors">
                <Checkbox
                  checked={contentOptions.includeServiceInfo}
                  onCheckedChange={(checked) => setContentOptions(prev => ({ ...prev, includeServiceInfo: checked }))}
                />
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Service Information</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors">
                <Checkbox
                  checked={contentOptions.includeAttempts}
                  onCheckedChange={(checked) => setContentOptions(prev => ({ ...prev, includeAttempts: checked }))}
                />
                <ClipboardList className="w-4 h-4 text-green-600" />
                <span className="text-sm">Job Attempts ({attempts.length})</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors">
                <Checkbox
                  checked={contentOptions.includeAffidavit}
                  onCheckedChange={(checked) => setContentOptions(prev => ({ ...prev, includeAffidavit: checked }))}
                />
                <FileCheck className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Affidavit</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors">
                <Checkbox
                  checked={contentOptions.includeInvoice}
                  onCheckedChange={(checked) => setContentOptions(prev => ({ ...prev, includeInvoice: checked }))}
                />
                <Receipt className="w-4 h-4 text-amber-600" />
                <span className="text-sm">Invoice</span>
              </label>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to include at the top of the email..."
              rows={3}
            />
          </div>

          {/* Recipients */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Recipients</Label>

            {/* Standard recipients */}
            <div className="space-y-2">
              {recipients.map(recipient => (
                <label
                  key={recipient.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Checkbox
                    checked={recipient.checked}
                    onCheckedChange={() => handleRecipientToggle(recipient.id)}
                  />
                  {recipient.type === 'job_contact' && <User className="w-4 h-4 text-blue-600" />}
                  {recipient.type === 'client_contact' && <Users className="w-4 h-4 text-slate-600" />}
                  {recipient.type === 'server' && <UserCog className="w-4 h-4 text-green-600" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{recipient.name}</div>
                    <div className="text-xs text-slate-500 truncate">{recipient.email}</div>
                  </div>
                  {recipient.type === 'job_contact' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Job Contact</span>
                  )}
                </label>
              ))}

              {/* Custom emails */}
              {customEmails.map(email => (
                <div
                  key={email.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50"
                >
                  <Checkbox
                    checked={email.checked}
                    onCheckedChange={() => {
                      setCustomEmails(prev => prev.map(e =>
                        e.id === email.id ? { ...e, checked: !e.checked } : e
                      ));
                    }}
                  />
                  <Mail className="w-4 h-4 text-slate-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{email.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomEmail(email.id)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add custom email */}
            <div className="flex gap-2">
              <Input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="Add custom email address..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomEmail();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomEmail}
                disabled={!customEmail || !customEmail.includes('@')}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Result message */}
          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              result.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="text-sm text-slate-500">
              {selectedCount} recipient{selectedCount !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedCount === 0 || !hasContent}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
