import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowDown, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Job } from '@/api/entities';

/**
 * CancelJobModal - Warns users about downstream cancellation when cancelling a shared job.
 * Shows affected downstream jobs and requires confirmation.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onOpenChange - Callback when modal open state changes
 * @param {Object} props.job - The job to cancel
 * @param {Function} props.onConfirm - Callback when cancellation is confirmed
 */
export default function CancelJobModal({ open, onOpenChange, job, onConfirm }) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downstreamJobs, setDownstreamJobs] = useState([]);
  const [isLoadingDownstream, setIsLoadingDownstream] = useState(false);

  // Check if job has downstream jobs
  const hasDownstreamJobs = Boolean(job?.share_chain?.child_job_id);

  // Fetch downstream job info when modal opens
  useEffect(() => {
    const fetchDownstreamJobs = async () => {
      if (!open || !hasDownstreamJobs) return;

      setIsLoadingDownstream(true);
      const jobs = [];

      try {
        // Walk the chain to find all downstream jobs
        let currentJobId = job.share_chain?.child_job_id;
        let depth = 0;
        const maxDepth = 10; // Prevent infinite loops

        while (currentJobId && depth < maxDepth) {
          const childJob = await Job.findById(currentJobId);
          if (childJob) {
            jobs.push({
              id: childJob.id,
              job_number: childJob.job_number,
              company_name: childJob.company_name || 'Partner Company',
              status: childJob.status,
              recipient_name: childJob.recipient?.name,
            });

            // Move to next child in chain
            currentJobId = childJob.share_chain?.child_job_id;
            depth++;
          } else {
            break;
          }
        }
      } catch (error) {
        console.error('Error fetching downstream jobs:', error);
      }

      setDownstreamJobs(jobs);
      setIsLoadingDownstream(false);
    };

    fetchDownstreamJobs();
  }, [open, job?.share_chain?.child_job_id, hasDownstreamJobs]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(cancellationReason);
      onOpenChange(false);
      setCancellationReason('');
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    setCancellationReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cancel Job {job?.job_number}
          </DialogTitle>
          <DialogDescription>
            {hasDownstreamJobs
              ? 'This job has been shared with other companies. Cancelling will cascade to all downstream jobs.'
              : 'Are you sure you want to cancel this job?'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Downstream jobs warning */}
          {hasDownstreamJobs && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="text-amber-800">
                  <p className="font-medium mb-2">
                    The following jobs will also be cancelled:
                  </p>

                  {isLoadingDownstream ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading downstream jobs...
                    </div>
                  ) : downstreamJobs.length > 0 ? (
                    <ul className="space-y-2">
                      {downstreamJobs.map((downstreamJob) => (
                        <li
                          key={downstreamJob.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <ArrowDown className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                          <div>
                            <span className="font-medium">
                              {downstreamJob.job_number}
                            </span>
                            {downstreamJob.recipient_name && (
                              <span className="text-amber-700">
                                {' - '}{downstreamJob.recipient_name}
                              </span>
                            )}
                            <span className="text-amber-600 text-xs ml-2">
                              ({downstreamJob.status})
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-amber-600">
                      1 downstream job will be cancelled
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Cancellation Reason
              {hasDownstreamJobs && (
                <span className="text-slate-500 font-normal ml-1">
                  (will be shared with downstream jobs)
                </span>
              )}
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter a reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Keep Job
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : hasDownstreamJobs ? (
              `Cancel ${downstreamJobs.length + 1} Job${downstreamJobs.length > 0 ? 's' : ''}`
            ) : (
              'Cancel Job'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper hook to use cancellation with downstream warning
 *
 * @param {Object} job - The job object
 * @returns {Object} - { showCancelModal, setShowCancelModal, handleCancelWithWarning }
 */
export function useCancelJobWithWarning(job) {
  const [showCancelModal, setShowCancelModal] = useState(false);

  const hasDownstreamJobs = Boolean(job?.share_chain?.child_job_id);

  const handleCancelWithWarning = () => {
    if (hasDownstreamJobs) {
      // Show modal with warning
      setShowCancelModal(true);
    } else {
      // No downstream jobs, can proceed without modal
      return true; // Signal that direct cancellation is OK
    }
    return false; // Signal that modal is shown
  };

  return {
    showCancelModal,
    setShowCancelModal,
    handleCancelWithWarning,
    hasDownstreamJobs,
  };
}
