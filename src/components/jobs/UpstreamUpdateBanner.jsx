import { useState } from 'react';
import { AlertCircle, X, RefreshCw, ArrowDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

/**
 * UpstreamUpdateBanner - Shows a notification when a job was recently synced from upstream.
 * Displays what fields were updated and when.
 *
 * @param {Object} props
 * @param {Object} props.job - The job object
 * @param {Function} props.onDismiss - Callback when banner is dismissed
 */
export default function UpstreamUpdateBanner({ job, onDismiss }) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if job has upstream sync info
  const lastUpstreamSync = job?.last_upstream_sync;
  const syncFields = job?.upstream_sync_fields;
  const cancelledByUpstream = job?.cancelled_by_upstream;

  // Don't show if no sync info or already dismissed
  if (isDismissed || (!lastUpstreamSync && !cancelledByUpstream)) {
    return null;
  }

  // Convert Firestore timestamp if needed
  const syncDate = lastUpstreamSync?.toDate?.() ||
    (lastUpstreamSync ? new Date(lastUpstreamSync) : null);

  // Only show banner if sync was within the last 24 hours
  if (syncDate) {
    const hoursSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSync > 24) {
      return null;
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Format the fields that were updated
  const formatFieldName = (field) => {
    const fieldLabels = {
      recipient: 'Recipient Info',
      addresses: 'Service Addresses',
      due_date: 'Due Date',
      first_attempt_due_date: 'First Attempt Due Date',
      priority: 'Priority',
      service_instructions: 'Service Instructions',
    };
    return fieldLabels[field] || field;
  };

  // Show cancellation alert (more prominent)
  if (cancelledByUpstream) {
    return (
      <Alert className="mb-4 border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-red-800">
            <ArrowDown className="w-4 h-4" />
            <span className="font-medium">
              This job was cancelled by your upstream client.
            </span>
            {job.cancellation_reason && (
              <span className="text-red-600">
                Reason: {job.cancellation_reason}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show update alert
  return (
    <Alert className="mb-4 border-blue-300 bg-blue-50">
      <RefreshCw className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-blue-800">
          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4" />
            <span className="font-medium">Updated by upstream client</span>
          </div>
          {syncDate && (
            <span className="text-blue-600 text-sm">
              {formatDistanceToNow(syncDate, { addSuffix: true })}
            </span>
          )}
          {syncFields && syncFields.length > 0 && (
            <span className="text-blue-600 text-sm">
              ({syncFields.map(formatFieldName).join(', ')})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * SyncStatusIndicator - Small indicator showing sync status in job header/card
 *
 * @param {Object} props
 * @param {Object} props.job - The job object
 */
export function SyncStatusIndicator({ job }) {
  const hasUpstreamParent = Boolean(job?.share_chain?.parent_job_id);
  const hasDownstreamChild = Boolean(job?.share_chain?.child_job_id);
  const lastUpstreamSync = job?.last_upstream_sync;

  if (!hasUpstreamParent && !hasDownstreamChild) {
    return null;
  }

  // Convert Firestore timestamp if needed
  const syncDate = lastUpstreamSync?.toDate?.() ||
    (lastUpstreamSync ? new Date(lastUpstreamSync) : null);

  // Check if recently synced (within last hour)
  const recentlyUpdated = syncDate &&
    (Date.now() - syncDate.getTime()) < (60 * 60 * 1000);

  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      {hasUpstreamParent && (
        <span className="flex items-center gap-1">
          <ArrowDown className="w-3 h-3" />
          {recentlyUpdated && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </span>
      )}
    </div>
  );
}
