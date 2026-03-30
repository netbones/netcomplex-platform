'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';

export interface IdentityState {
  isAgent: boolean;
  isPropertyOwner: boolean;
  isPremiumSeatHolder: boolean;
  effectiveRole: 'AGENT' | 'OWNER' | 'PREMIUM' | 'RESIDENT';
  households: any[];
  managedHouseholds: any[];
  premiumSeat: any | null;
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

  const { data: managedHouseholdsData, isLoading: loadingManaged } =
    trpc.identity.getMyManagedHouseholds.useQuery(undefined, { enabled: !!userId });

  const { data: premiumSeatData, isLoading: loadingPremium } =
    trpc.identity.getMyPremiumSeat.useQuery(undefined, { enabled: !!userId });

  const households = (householdsData || []) as any[];
  const managedHouseholds = (managedHouseholdsData || []) as any[];
  const premiumSeat = premiumSeatData as any;

  const isLoading = loadingHouseholds || loadingManaged || loadingPremium;
  const isAgent = !loadingManaged && managedHouseholds.length > 0;
  const isPropertyOwner = !loadingHouseholds && households.length > 0;
  const isPremiumSeatHolder = !loadingPremium && !!premiumSeat;

  let effectiveRole: 'AGENT' | 'OWNER' | 'PREMIUM' | 'RESIDENT' = 'RESIDENT';
  if (isAgent) effectiveRole = 'AGENT';
  else if (isPropertyOwner) effectiveRole = 'OWNER';
  else if (isPremiumSeatHolder) effectiveRole = 'PREMIUM';

  return {
    isAgent,
    isPropertyOwner,
    isPremiumSeatHolder,
    effectiveRole,
    households,
    managedHouseholds,
    premiumSeat,
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
  requiresPremium?: boolean;
  requiresAgent?: boolean;
}

export const WIDGET_PERMISSIONS: Record<string, WidgetPermission> = {
  households: { requiresHousehold: true },
  'agent-dashboard': { requiresAgent: true },
  'premium-seat': {},
};

export function getVisibleWidgets(
  widgets: WidgetConfig[],
  identity: IdentityState
): WidgetConfig[] {
  const { effectiveRole, isPropertyOwner, isPremiumSeatHolder, isAgent } = identity;

  return widgets.filter(widget => {
    const perms = WIDGET_PERMISSIONS[widget.id];
    if (!perms) return true;

    if (perms.roles && !perms.roles.includes(effectiveRole)) {
      return false;
    }

    if (perms.requiresHousehold && !isPropertyOwner) {
      return false;
    }

    if (perms.requiresPremium && !isPremiumSeatHolder) {
      return false;
    }

    if (perms.requiresAgent && !isAgent) {
      return false;
    }

    return true;
  });
}
