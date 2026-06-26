'use client';

import { useState, useEffect } from 'react';

/**
 * Lightweight hook that wraps entity-layer MediationThread with page-level
 * access-control gating. Verifies the dispute exists and the current user
 * has permission to view it before rendering the MediationThread entity
 * component (which handles its own Supabase Realtime subscription).
 *
 * Used by the dispute detail page (Plan 04), not by widgets.
 */
export function useDisputeThread(disputeId: string) {
  const [threadState, setThreadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      setThreadState('loading');
      setError(null);

      try {
        const res = await fetch(`/api/disputes/${disputeId}`);

        if (!cancelled) {
          if (!res.ok) {
            if (res.status === 404) {
              setError('Dispute not found');
            } else if (res.status === 403) {
              setError("You don't have permission to view this dispute");
            } else {
              setError('Unable to load dispute');
            }
            setThreadState('error');
          } else {
            setThreadState('ready');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Network error — please check your connection');
          setThreadState('error');
        }
      }
    }

    if (disputeId) {
      verifyAccess();
    }

    return () => {
      cancelled = true;
    };
  }, [disputeId]);

  return { threadState, error };
}
