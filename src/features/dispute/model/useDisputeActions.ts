'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiPost, apiPatch, ApiClientError } from '@/shared/api/http-client';
import type { DisputeStatus } from '@entities/dispute';
import { isTerminalStatus } from '@entities/dispute';

// ── Types ──────────────────────────────────────────────────────

export interface DisputeAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'destructive';
  condition: boolean;
}

// ── Hook ───────────────────────────────────────────────────────

/**
 * Hook for dispatching actions from DisputeActionsBar or widget quick actions.
 * Determines available actions based on the dispute lifecycle stage and
 * dispatches them to the correct API endpoint.
 */
export function useDisputeActions(
  disputeId: string,
  disputeStatus: DisputeStatus,
  _userRole: string
) {
  const [isLoading, setIsLoading] = useState(false);

  // Determine available actions based on dispute lifecycle
  const availableActions: DisputeAction[] = [];

  // DRAFT: can submit or withdraw
  if (disputeStatus === 'DRAFT') {
    availableActions.push({
      id: 'submit',
      label: 'Submit for Review',
      variant: 'primary',
      condition: true,
    });
    availableActions.push({
      id: 'withdraw',
      label: 'Withdraw Dispute',
      variant: 'destructive',
      condition: true,
    });
  }

  // SUBMITTED / UNDER_REVIEW / MEDIATION_* / FORMAL_RULING / RESOLVED: can withdraw
  if (
    disputeStatus === 'SUBMITTED' ||
    disputeStatus === 'UNDER_REVIEW' ||
    disputeStatus === 'MEDIATION_OFFERED' ||
    disputeStatus === 'MEDIATION_ACTIVE' ||
    disputeStatus === 'MEDIATED_RESOLVED' ||
    disputeStatus === 'FORMAL_RULING' ||
    disputeStatus === 'RESOLVED'
  ) {
    availableActions.push({
      id: 'withdraw',
      label: 'Withdraw Dispute',
      variant: 'destructive',
      condition: true,
    });
  }

  // Terminal statuses: no actions available
  if (isTerminalStatus(disputeStatus)) {
    // intentionally empty — no actions for terminal states
  }

  const executeAction = useCallback(
    async (action: string) => {
      if (!disputeId) return;

      setIsLoading(true);
      try {
        if (action === 'submit') {
          try {
            await apiPost(`/api/disputes/${disputeId}/submit`);
            toast.success('Dispute submitted for review');
          } catch (e) {
            if (e instanceof ApiClientError) {
              toast.error(e.message || 'Failed to submit dispute');
            } else {
              throw e;
            }
          }
        } else if (action === 'withdraw') {
          try {
            await apiPatch(`/api/disputes/${disputeId}`, { status: 'WITHDRAWN' });
            toast.success('Dispute withdrawn');
          } catch (e) {
            if (e instanceof ApiClientError) {
              toast.error(e.message || 'Failed to withdraw dispute');
            } else {
              throw e;
            }
          }
        }
      } catch {
        toast.error('Network error — please try again');
      } finally {
        setIsLoading(false);
      }
    },
    [disputeId]
  );

  return { availableActions, executeAction, isLoading };
}
