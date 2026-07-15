import { useSafeTranslation } from '@shared/lib';
import { Calendar, FileText, Users } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  'fa-file-alt': <FileText className="text-indigo-600 text-xs" />,
  'fa-calendar': <Calendar className="text-indigo-600 text-xs" />,
  'fa-users': <Users className="text-indigo-600 text-xs" />,
};

interface QuickStat {
  label: string;
  value: string;
  icon: string;
}

interface QuickStatsWidgetProps {
  stats?: QuickStat[];
}

const DEFAULT_STATS: QuickStat[] = [
  { label: 'Posts', value: '24', icon: 'fa-file-alt' },
  { label: 'Events', value: '8', icon: 'fa-calendar' },
  { label: 'Connections', value: '156', icon: 'fa-users' },
];

export function QuickStatsWidget({ stats = DEFAULT_STATS }: QuickStatsWidgetProps) {
  const { tx } = useSafeTranslation('dashboard');

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">{tx('quickStats', 'Quick Stats')}</h4>
      <div className="space-y-2">
        {stats.map(stat => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ICON_MAP[stat.icon]}
              <span className="text-xs text-gray-600">{stat.label}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
