'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { AchievementBadgeGrid } from '@entities/directory';

interface Achievement {
  key: string;
  label: string;
  icon?: string | null;
  category: string;
  unlocked: boolean;
  unlockedAt?: Date | null;
}

export function AchievementsWidget() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/achievements', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(body => setAchievements(body?.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
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
