'use client';

import { useTranslation } from 'react-i18next';

/*
 * QUICK STATS WIDGET
 * ----------------
 * Used by: SidebarWidgetBox (type: 'quick-stats')
 *
 * Displays quick stats (posts, events, connections).
 * Accepts optional custom stats array.
 * ----------------
 */

interface QuickStat {
  label: string;
  value: string;
  icon: string;
}

interface QuickStatsWidgetProps {
  stats?: QuickStat[];
}

const DEFAULT_STATS: QuickStat[] = [
  { label: 'Posts', value: '24', icon: 'fas fa-file-alt' },
  { label: 'Events', value: '8', icon: 'fas fa-calendar' },
  { label: 'Connections', value: '156', icon: 'fas fa-users' },
];

export function QuickStatsWidget({ stats = DEFAULT_STATS }: QuickStatsWidgetProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">{t('quickStats', 'Quick Stats')}</h4>
      <div className="space-y-2">
        {stats.map(stat => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className={`${stat.icon} text-indigo-600 text-xs`}></i>
              <span className="text-xs text-gray-600">{stat.label}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
