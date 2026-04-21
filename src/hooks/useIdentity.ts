'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@api/auth-client';
import { trpc } from '@api/trpc/client';

export interface IdentityState {
  isAgent: boolean;
  isPropertyOwner: boolean;
  isSoloSeatHolder: boolean;
  effectiveRole: 'AGENT' | 'OWNER' | 'SOLO' | 'RESIDENT';
  ownedProperties: ReturnType<typeof trpc.identity.getMyProperties.useQuery>['data'];
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

  const { data: propertiesData, isLoading: loadingProperties } =
    trpc.identity.getMyProperties.useQuery(undefined, { enabled: !!userId });

  const { data: agentAccessesData, isLoading: loadingManaged } =
    trpc.identity.getAgentAccesses.useQuery(undefined, { enabled: !!userId });

  const { data: SoloSeatData, isLoading: loadingSolo } = trpc.identity.getMySoloSeat.useQuery(
    undefined,
    { enabled: !!userId }
  );

  const ownedProperties = propertiesData || [];
  const agentAccesses = agentAccessesData || [];
  const SoloSeat = SoloSeatData || null;

  const isLoading = loadingProperties || loadingManaged || loadingSolo;
  const isAgent = !loadingManaged && agentAccesses.length > 0;
  const isPropertyOwner = !loadingProperties && ownedProperties.length > 0;
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
    ownedProperties,
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
  requiresProperty?: boolean;
  requiresSolo?: boolean;
  requiresAgent?: boolean;
}

export const WIDGET_PERMISSIONS: Record<string, WidgetPermission> = {
  properties: { requiresProperty: true },
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

    if (perms.requiresProperty && !isPropertyOwner) {
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
