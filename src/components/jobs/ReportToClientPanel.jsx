import { useState } from 'react';
import { Send, Loader2, CheckCircle, ArrowUp, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FirebaseFunctions } from '@/firebase/functions';

/**
 * ReportToClientPanel - Allows job owners to send status updates to their upstream client
 * Only shown on jobs that were shared TO this company (have a parent_job_id)
 *
 * @param {Object} props
 * @param {Object} props.job - The job object
 * @param {boolean} props.isOwner - Whether the current user is the job owner
 * @param {Function} props.onSuccess - Callback after successful report
 */
export default function ReportToClientPanel({ job, isOwner = true, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Options state
  const [includeAttempts, setIncludeAttempts] = useState(true);
  const [includeAffidavit, setIncludeAffidavit] = useState(true);
  const [includeInvoice, setIncludeInvoice] = useState(false);
  const [syncToParent, setSyncToParent] = useState(true);
  const [customMessage, setCustomMessage] = useState('');

  // Don't render if not owner or no upstream parent
  if (!isOwner || !job?.share_chain?.parent_job_id) {
    return null;
  }

  const hasAffidavit = !!job.affidavit_url;
  const hasInvoice = !!job.invoice_id;

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseFunctions.reportStatusToUpstream(job.id, {
        includeAttempts,
        includeAffidavit: includeAffidavit && hasAffidavit,
        includeInvoice: includeInvoice && hasInvoice,
        syncToParent,
        customMessage,
      });

      setSuccess(true);

      // Reset after short delay
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setCustomMessage('');
        if (onSuccess) {
          onSuccess(result);
        }
      }, 2000);
    } catch (err) {
      console.error('Error reporting to client:', err);
      setError(err.message || 'Failed to send report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!isLoading) {
      setIsOpen(open);
      if (!open) {
        // Reset state when closing
        setError(null);
        setSuccess(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
        >
          <ArrowUp className="w-4 h-4" />
          Report to Client
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Report Status to Client
          </DialogTitle>
          <DialogDescription>
            Send a status update email to your upstream client who assigned this job.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-700">Report Sent Successfully!</p>
            <p className="text-sm text-slate-500 mt-1">
              Your client has been notified of the job status.
            </p>
          </div>
        ) : (
          <>
            <div className="py-4 space-y-4">
              {/* Current Status Summary */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Job Status:</span>{' '}
                  <span className="capitalize">{job.status?.replace(/_/g, ' ') || 'Unknown'}</span>
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium">Job #:</span>{' '}
                  {job.job_number || job.share_chain?.shared_job_number}
                </p>
              </div>

              {/* Include Options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Include in Report:</Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAttempts"
                    checked={includeAttempts}
                    onCheckedChange={setIncludeAttempts}
                  />
                  <Label htmlFor="includeAttempts" className="text-sm font-normal cursor-pointer">
                    Service Attempts
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAffidavit"
                    checked={includeAffidavit}
                    onCheckedChange={setIncludeAffidavit}
                    disabled={!hasAffidavit}
                  />
                  <Label
                    htmlFor="includeAffidavit"
                    className={`text-sm font-normal cursor-pointer ${!hasAffidavit ? 'text-slate-400' : ''}`}
                  >
                    Affidavit {!hasAffidavit && '(not available)'}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeInvoice"
                    checked={includeInvoice}
                    onCheckedChange={setIncludeInvoice}
                    disabled={!hasInvoice}
                  />
                  <Label
                    htmlFor="includeInvoice"
                    className={`text-sm font-normal cursor-pointer ${!hasInvoice ? 'text-slate-400' : ''}`}
                  >
                    Invoice Details {!hasInvoice && '(not available)'}
                  </Label>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Checkbox
                    id="syncToParent"
                    checked={syncToParent}
                    onCheckedChange={setSyncToParent}
                  />
                  <Label htmlFor="syncToParent" className="text-sm font-normal cursor-pointer">
                    Update their job record with current status
                  </Label>
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="customMessage" className="text-sm font-medium">
                  Message (optional)
                </Label>
                <Textarea
                  id="customMessage"
                  placeholder="Add a personal note to your client..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact version for use in toolbars or action menus
 */
export function ReportToClientButton({ job, isOwner = true, onSuccess }) {
  // Don't render if not owner or no upstream parent
  if (!isOwner || !job?.share_chain?.parent_job_id) {
    return null;
  }

  return (
    <ReportToClientPanel job={job} isOwner={isOwner} onSuccess={onSuccess} />
  );
}
