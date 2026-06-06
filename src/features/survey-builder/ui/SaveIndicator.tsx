'use client';

import { Check, AlertCircle, Loader2 } from 'lucide-react';
import type { SaveState } from '../lib/useSaveStatus';

interface SaveIndicatorProps {
  state: SaveState;
  dirty: boolean;
  errorMessage: string | null;
  onRetry?: () => void;
}

/**
 * Status pill shown in the survey editor header.
 *
 * - "Unsaved changes" + spinner-style "Saving..." when changes are pending
 * - "Saved" with a check for 2s after the last successful save
 * - "Failed to save" with retry button on error
 * - Hidden entirely when idle and not dirty
 */
export function SaveIndicator({ state, dirty, errorMessage, onRetry }: SaveIndicatorProps) {
  if (state === 'idle' && !dirty) return null;

  if (state === 'saving') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-full"
        data-testid="save-indicator"
        role="status"
        aria-live="polite"
      >
        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }

  if (state === 'saved') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-green-700 bg-green-50 rounded-full"
        data-testid="save-indicator"
        role="status"
        aria-live="polite"
      >
        <Check size={12} aria-hidden="true" />
        Saved
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-red-700 bg-red-50 rounded-full"
        data-testid="save-indicator"
        role="status"
        aria-live="assertive"
      >
        <AlertCircle size={12} aria-hidden="true" />
        <span>{errorMessage ?? 'Failed to save'}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 underline hover:no-underline"
            aria-label="Retry save"
          >
            Retry
          </button>
        )}
      </span>
    );
  }

  if (dirty) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-700 bg-amber-50 rounded-full"
        data-testid="save-indicator"
        role="status"
        aria-live="polite"
      >
        Unsaved changes
      </span>
    );
  }

  return null;
}
