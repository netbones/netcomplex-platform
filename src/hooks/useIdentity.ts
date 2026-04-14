'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';

export interface IdentityState {
  isAgent: boolean;
  isPropertyOwner: boolean;
  isSoloSeatHolder: boolean;
  effectiveRole: 'AGENT' | 'OWNER' | 'SOLO' | 'RESIDENT';
  households: ReturnType<typeof trpc.identity.getMyHouseholds.useQuery>['data'];
  agentAccesses: ReturnType<typeof trpc.identity.getAgentAccesses.useQuery>['data'];
  SoloSeat: ReturnType<typeof trpc.identity.getMySoloSeat.useQuery>['data'];
  isLoading: boolean;
}

export function useIdentityState(): IdentityState {
  const { data: session } = authClient.useSession();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
    }
  }, [session?.user?.id]);

  const { data: householdsData, isLoading: loadingHouseholds } =
    trpc.identity.getMyHouseholds.useQuery(undefined, { enabled: !!userId });

  const { data: agentAccessesData, isLoading: loadingManaged } =
    trpc.identity.getAgentAccesses.useQuery(undefined, { enabled: !!userId });

  const { data: SoloSeatData, isLoading: loadingSolo } = trpc.identity.getMySoloSeat.useQuery(
    undefined,
    { enabled: !!userId }
  );

  const households = householdsData || [];
  const agentAccesses = agentAccessesData || [];
  const SoloSeat = SoloSeatData || null;

  const isLoading = loadingHouseholds || loadingManaged || loadingSolo;
  const isAgent = !loadingManaged && agentAccesses.length > 0;
  const isPropertyOwner = !loadingHouseholds && households.length > 0;
  const isSoloSeatHolder = !loadingSolo && !!SoloSeat;

  let effectiveRole: 'AGENT' | 'OWNER' | 'SOLO' | 'RESIDENT' = 'RESIDENT';
  if (isAgent) effectiveRole = 'AGENT';
  else if (isPropertyOwner) effectiveRole = 'OWNER';
  else if (isSoloSeatHolder) effectiveRole = 'SOLO';

  return {
    isAgent,
    isPropertyOwner,
    isSoloSeatHolder,
    effectiveRole,
    households,
    agentAccesses,
    SoloSeat,
    isLoading,
  };
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  icon: string;
}

export interface WidgetPermission {
  roles?: string[];
  requiresHousehold?: boolean;
  requiresSolo?: boolean;
  requiresAgent?: boolean;
}

export const WIDGET_PERMISSIONS: Record<string, WidgetPermission> = {
  households: { requiresHousehold: true },
  'agent-dashboard': { requiresAgent: true },
  'solo-seat': {},
};

export function getVisibleWidgets(
  widgets: WidgetConfig[],
  identity: IdentityState
): WidgetConfig[] {
  const { effectiveRole, isPropertyOwner, isSoloSeatHolder, isAgent } = identity;

  return widgets.filter(widget => {
    const perms = WIDGET_PERMISSIONS[widget.id];
    if (!perms) return true;

    if (perms.roles && !perms.roles.includes(effectiveRole)) {
      return false;
    }

    if (perms.requiresHousehold && !isPropertyOwner) {
      return false;
    }

    if (perms.requiresSolo && !isSoloSeatHolder) {
      return false;
    }

    if (perms.requiresAgent && !isAgent) {
      return false;
    }

    return true;
  });
}
