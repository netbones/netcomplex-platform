/**
 * Delegation Domain — API Hooks
 *
 * TanStack Query hooks backed by tRPC delegations router.
 */

import { useQueryClient } from '@tanstack/react-query';
import { trpc, useSession } from '@api/client';
import type { DelegationListItem, DelegationListParams } from './types';

export function useDelegations(params?: DelegationListParams) {
  const { data: sessionData } = useSession();

  return trpc.delegations.listDelegations.useQuery(
    {
      propertyId: params?.propertyId,
      status: params?.status,
      agentId: params?.agentId,
    },
    {
      enabled: !!sessionData?.user?.id,
    }
  );
}

export function useBlockDelegation() {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  return trpc.delegations.blockDelegation.useMutation({
    onMutate: async ({ id: delegationId, blocked }) => {
      await queryClient.cancelQueries({ queryKey: ['delegations'] });
      const previous = queryClient.getQueryData<DelegationListItem[]>(['delegations']);
      queryClient.setQueryData<DelegationListItem[]>(['delegations'], old =>
        (old ?? []).map(d => (d.id === delegationId ? { ...d, blocked } : d))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['delegations'], context.previous);
      }
    },
    onSettled: () => {
      utils.delegations.listDelegations.invalidate();
    },
  });
}

export function useDelegationAudit(delegationId: string) {
  return trpc.delegations.getDelegationAudit.useQuery(
    { id: delegationId },
    { enabled: !!delegationId }
  );
}
