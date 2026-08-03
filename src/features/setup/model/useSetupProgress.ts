'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/shared/api/http-client';

interface SetupData {
  id: string;
  tenantId: string;
  completionPercent: number;
  completedSections: string[];
  launchedAt: string | null;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  missions: Record<
    string,
    {
      id: string;
      missionKey: string;
      title: string;
      description: string | null;
      isRequired: boolean;
      isCompleted: boolean;
      completedAt: string | null;
      sortOrder: number;
    }[]
  >;
}

interface SetupResponse {
  success?: boolean;
  data?: { setup: SetupData };
  setup?: SetupData;
}

/**
 * TanStack Query hook for the Setup Center.
 *
 * Provides server-state for the full setup progress view plus mutations
 * to toggle mission completion and update settings.
 */
export function useSetupProgress(tenantId: string, _initial?: SetupData | null) {
  const queryClient = useQueryClient();

  const {
    data: setup,
    isLoading,
    error,
    refetch: refreshProgress,
  } = useQuery<SetupData | null>({
    queryKey: ['setup', tenantId],
    queryFn: async () => {
      const { data } = await apiGet<SetupResponse>(
        `/api/platform/setup?tenantId=${encodeURIComponent(tenantId)}`
      );
      // Support both `{ data: { setup } }` and direct `{ setup }` shapes
      return data?.setup ?? null;
    },
    staleTime: 30 * 1000, // 30s stale — mission toggles invalidate instantly
  });

  /**
   * Toggle a mission's completion status.
   */
  const missionMutation = useMutation({
    mutationFn: async ({
      missionKey,
      isCompleted,
    }: {
      missionKey: string;
      isCompleted: boolean;
    }) => {
      return apiPatch(`/api/platform/setup/missions`, {
        tenantId,
        missionKey,
        isCompleted,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', tenantId] });
    },
  });

  /**
   * Update a single setup setting.
   */
  const settingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      return apiPatch(`/api/platform/setup/settings`, { tenantId, key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', tenantId] });
    },
  });

  const updateMission = (missionKey: string, isCompleted: boolean) =>
    missionMutation.mutate({ missionKey, isCompleted });

  const updateSetting = (key: string, value: unknown) => settingMutation.mutate({ key, value });

  return {
    setup,
    isLoading,
    error: error as Error | null,
    refreshProgress,
    updateMission,
    updateSetting,
    isUpdating: missionMutation.isPending || settingMutation.isPending,
  };
}
