/**
 * Delegation Domain — API Hooks
 *
 * TanStack Query hooks for the delegation lifecycle.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@api/client';
import type {
  DelegationListItem,
  DelegationBlockPayload,
  DelegationAuditEntry,
  DelegationListParams,
} from './types';

const DELEGATIONS_KEY = ['delegations'] as const;

/**
 * Fetch delegations list.
 * Owners see their granted delegations; providers see delegations assigned to them; admins see all.
 */
export function useDelegations(params?: DelegationListParams) {
  const { data: sessionData } = useSession();

  return useQuery<DelegationListItem[]>({
    queryKey: [...DELEGATIONS_KEY, params],
    queryFn: async () => {
      const url = new URL('/api/delegations', window.location.origin);
      if (params?.propertyId) url.searchParams.set('propertyId', params.propertyId);
      if (params?.status) url.searchParams.set('status', params.status);
      if (params?.agentId) url.searchParams.set('agentId', params.agentId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Failed to fetch delegations: ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!sessionData?.user?.id,
  });
}

/**
 * Block/unblock an agent's communication:contact_occupant scope.
 *
 * When a resident blocks an agent, the agent's effective scope is narrowed:
 * communication:contact_occupant is removed from their permissions. This is enforced
 * server-side via the Phase 110 access pipeline.
 */
export function useBlockDelegation() {
  const queryClient = useQueryClient();

  return useMutation<
    DelegationListItem,
    Error,
    DelegationBlockPayload,
    { previous?: DelegationListItem[] } | undefined
  >({
    mutationFn: async ({ delegationId, blocked }) => {
      const res = await fetch(`/api/delegations/${delegationId}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      });
      if (!res.ok) throw new Error(`Failed to update block: ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    onMutate: async ({ delegationId, blocked }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: DELEGATIONS_KEY });
      const previous = queryClient.getQueryData<DelegationListItem[]>(DELEGATIONS_KEY);
      queryClient.setQueryData<DelegationListItem[]>(DELEGATIONS_KEY, old =>
        (old ?? []).map(d => (d.id === delegationId ? { ...d, blocked } : d))
      );
      return { previous };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: any, _vars: any, context: any) => {
      queryClient.setQueryData(
        DELEGATIONS_KEY,
        (context as { previous?: DelegationListItem[] })?.previous
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DELEGATIONS_KEY });
    },
  });
}

/**
 * Fetch the audit log for a specific delegation.
 */
export function useDelegationAudit(delegationId: string) {
  return useQuery<DelegationAuditEntry[]>({
    queryKey: ['delegation-audit', delegationId],
    queryFn: async () => {
      const res = await fetch(`/api/delegations/${delegationId}/audit`);
      if (!res.ok) throw new Error(`Failed to fetch audit: ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!delegationId,
  });
}
