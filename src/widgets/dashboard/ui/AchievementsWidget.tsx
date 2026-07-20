'use client';

import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { trpc } from '@api/client';
import { AchievementBadgeGrid } from '@entities/directory';

export function AchievementsWidget() {
  const {
    data: allDefs,
    isLoading: defsLoading,
    error: defsError,
  } = trpc.achievements.listAchievements.useQuery(undefined, {
    retry: false,
  });
  const {
    data: unlockedData,
    isLoading: unlockedLoading,
    error: unlockedError,
  } = trpc.achievements.getUnlocked.useQuery(undefined, {
    retry: false,
  });

  const isLoading = defsLoading || unlockedLoading;
  const hasError = defsError || unlockedError;

  const achievements = useMemo(() => {
    const defs = allDefs?.data ?? [];
    const unlocked = unlockedData?.data ?? [];
    const unlockedDefIds = new Set(unlocked.map((u: { definitionId: string }) => u.definitionId));
    return defs.map(
      (d: { id: string; key: string; label: string; icon?: string | null; category: string }) => ({
        key: d.key,
        label: d.label,
        icon: d.icon,
        category: d.category,
        unlocked: unlockedDefIds.has(d.id),
        unlockedAt: null,
      })
    );
  }, [allDefs, unlockedData]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">Could not load achievements</div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <Trophy className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Achievements</h2>
        <span className="text-sm text-gray-400 ml-auto tabular-nums">
          {unlockedCount}/{achievements.length}
        </span>
      </div>
      <AchievementBadgeGrid achievements={achievements} />
    </div>
  );
}
