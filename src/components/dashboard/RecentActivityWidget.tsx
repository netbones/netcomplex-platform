'use client';

import { useTranslation } from 'react-i18next';

interface RecentActivityWidgetProps {
  emptyMessage?: string;
}

export function RecentActivityWidget({ emptyMessage }: RecentActivityWidgetProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="text-center py-8 text-gray-500">
      <p>{emptyMessage || t('noActivity')}</p>
      <p className="text-sm">{t('activityWillAppear')}</p>
    </div>
  );
}
