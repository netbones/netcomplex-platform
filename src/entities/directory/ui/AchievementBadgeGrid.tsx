'use client';

import { Trophy, Lock } from 'lucide-react';

interface Achievement {
  key: string;
  label: string;
  icon?: string | null;
  category: string;
  unlocked: boolean;
  unlockedAt?: Date | null;
}

interface AchievementBadgeGridProps {
  achievements: Achievement[];
}

export function AchievementBadgeGrid({ achievements }: AchievementBadgeGridProps) {
  if (achievements.length === 0) return null;

  const grouped = {
    ENGAGEMENT: achievements.filter(a => a.category === 'ENGAGEMENT'),
    CONTRIBUTION: achievements.filter(a => a.category === 'CONTRIBUTION'),
    MILESTONE: achievements.filter(a => a.category === 'MILESTONE'),
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={category}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {category}
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map(achievement => (
                <div
                  key={achievement.key}
                  title={
                    achievement.unlocked && achievement.unlockedAt
                      ? `${achievement.label} — Unlocked ${new Date(achievement.unlockedAt).toLocaleDateString()}`
                      : achievement.label
                  }
                  className={`relative group flex flex-col items-center p-2 rounded-lg text-center transition-colors ${
                    achievement.unlocked
                      ? 'bg-indigo-50 dark:bg-indigo-900/20'
                      : 'bg-gray-50 dark:bg-gray-800/50 opacity-60'
                  }`}
                >
                  <div className={`text-2xl mb-1 ${achievement.unlocked ? '' : 'grayscale'}`}>
                    {achievement.icon ||
                      (achievement.unlocked ? (
                        <Trophy className="w-6 h-6 text-indigo-500" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      ))}
                  </div>
                  <span className="text-[10px] leading-tight text-gray-700 dark:text-gray-300 line-clamp-2">
                    {achievement.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
