/**
 * Resident-facing events summary widget — use in resident dashboard.
 * Displays a lightweight summary of upcoming events for residents.
 */
'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface EventsWidgetProps {
  emptyMessage?: string;
}

export function EventsWidget({ emptyMessage }: EventsWidgetProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="text-center py-8 text-gray-500">
      <p>{emptyMessage || t('noEvents')}</p>
      <Link href="/resources" className="text-indigo-600 hover:underline">
        {t('viewAllEvents')}
      </Link>
    </div>
  );
}
