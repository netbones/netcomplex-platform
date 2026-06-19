import { useSafeTranslation } from '@shared/lib';

interface RecentActivityWidgetProps {
  emptyMessage?: string;
}

export function RecentActivityWidget({ emptyMessage }: RecentActivityWidgetProps) {
  const { tx } = useSafeTranslation('dashboard');

  return (
    <div className="text-center py-8 text-gray-500">
      <p>{emptyMessage || tx('noActivity', 'No recent activity')}</p>
      <p className="text-sm">{tx('activityWillAppear', 'Activity will appear here')}</p>
    </div>
  );
}
