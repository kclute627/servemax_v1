import { useState } from 'react';
import { Eye, EyeOff, Users, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FirebaseFunctions } from '@/firebase/functions';
import { VISIBILITY_TARGETS } from '@/firebase/schemas';

/**
 * VisibilityToggle - Allows job owners to control who can see specific items
 * (attempts or documents) in a shared job chain.
 *
 * @param {Object} props
 * @param {string} props.jobId - The job ID
 * @param {string} props.itemId - The attempt or document ID
 * @param {string} props.collectionType - "attempts" or "documents"
 * @param {string[]} props.visibility - Current visibility array ["client", "server"]
 * @param {boolean} props.isJobOwner - Whether the current user is the job owner
 * @param {boolean} props.hasShareChain - Whether this job is part of a share chain
 * @param {Function} props.onVisibilityChange - Callback when visibility changes
 * @param {string} props.size - "sm" | "md" - Size of the toggle buttons
 */
export default function VisibilityToggle({
  jobId,
  itemId,
  collectionType,
  visibility = [VISIBILITY_TARGETS.CLIENT, VISIBILITY_TARGETS.SERVER],
  isJobOwner = false,
  hasShareChain = false,
  onVisibilityChange,
  size = 'sm'
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localVisibility, setLocalVisibility] = useState(visibility || []);

  // Don't render if not in a share chain or not the owner
  if (!hasShareChain || !isJobOwner) {
    return null;
  }

  const isVisibleToClient = localVisibility.includes(VISIBILITY_TARGETS.CLIENT);
  const isVisibleToServer = localVisibility.includes(VISIBILITY_TARGETS.SERVER);

  const handleToggle = async (target) => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      let newVisibility;
      if (localVisibility.includes(target)) {
        // Remove target
        newVisibility = localVisibility.filter(t => t !== target);
      } else {
        // Add target
        newVisibility = [...localVisibility, target];
      }

      // Optimistic update
      setLocalVisibility(newVisibility);

      // Call the Cloud Function
      const result = await FirebaseFunctions.toggleVisibility(
        jobId,
        collectionType,
        itemId,
        newVisibility
      );

      if (result.success) {
        // Notify parent of the change
        if (onVisibilityChange) {
          onVisibilityChange(itemId, newVisibility);
        }
      } else {
        // Revert on failure
        setLocalVisibility(localVisibility);
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      // Revert on error
      setLocalVisibility(localVisibility);
    } finally {
      setIsUpdating(false);
    }
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <div className="flex items-center gap-0.5">
      {isUpdating && (
        <Loader2 className={`${iconSize} animate-spin text-slate-400 mr-1`} />
      )}

      {/* Client visibility toggle (upstream company) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`${buttonSize} ${isVisibleToClient
              ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
              : 'text-slate-300 hover:text-slate-400'
            }`}
            onClick={() => handleToggle(VISIBILITY_TARGETS.CLIENT)}
            disabled={isUpdating}
          >
            {isVisibleToClient ? (
              <Users className={iconSize} />
            ) : (
              <EyeOff className={iconSize} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {isVisibleToClient ? 'Visible to client (click to hide)' : 'Hidden from client (click to show)'}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Server visibility toggle (downstream company) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`${buttonSize} ${isVisibleToServer
              ? 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100'
              : 'text-slate-300 hover:text-slate-400'
            }`}
            onClick={() => handleToggle(VISIBILITY_TARGETS.SERVER)}
            disabled={isUpdating}
          >
            {isVisibleToServer ? (
              <Briefcase className={iconSize} />
            ) : (
              <EyeOff className={iconSize} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {isVisibleToServer ? 'Visible to server (click to hide)' : 'Hidden from server (click to show)'}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * VisibilityBadge - Shows the current visibility status as a small badge
 * Used for non-owners to see what's been shared with them
 */
export function VisibilityBadge({ visibility, viewerRole }) {
  if (!viewerRole || viewerRole === 'owner') return null;

  const isVisible = Array.isArray(visibility)
    ? visibility.includes(viewerRole)
    : true; // Default to visible if no visibility array

  if (!isVisible) return null; // Item shouldn't be visible anyway

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
      <Eye className="w-2.5 h-2.5" />
      Shared
    </span>
  );
}

/**
 * Helper function to filter items based on visibility and viewer role
 * Use this to filter attempts/documents before displaying them
 *
 * @param {Object[]} items - Array of attempts or documents
 * @param {string} viewerRole - 'owner' | 'client' | 'server' | null
 * @returns {Object[]} - Filtered items visible to the viewer
 */
export function filterByVisibility(items, viewerRole) {
  if (!Array.isArray(items)) return [];

  // Owners see everything
  if (viewerRole === 'owner' || !viewerRole) {
    return items;
  }

  return items.filter(item => {
    // If no visibility array, default to visible (backwards compatibility)
    if (!item.visibility || !Array.isArray(item.visibility)) {
      return true;
    }

    // Check if viewer's role is in the visibility array
    return item.visibility.includes(viewerRole);
  });
}
