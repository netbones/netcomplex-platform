import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';

import { CalendarPlus, ChevronRight, Plus, User, Wrench } from 'lucide-react';
interface QuickActionsWidgetProps {
  userId?: string;
}

export function QuickActionsWidget({ userId }: QuickActionsWidgetProps) {
  const { tx } = useSafeTranslation('dashboard');

  return (
    <div className="space-y-3">
      <Link
        href="/maintenance"
        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition group"
      >
        <Wrench className="text-gray-400 group-hover:text-indigo-600 w-5" />
        <span>{tx('submitRequest', 'Submit Request')}</span>
        <ChevronRight className="ml-auto text-gray-300 group-hover:text-indigo-400 text-sm" />
      </Link>
      <Link
        href="/amenities"
        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition group"
      >
        <CalendarPlus className="text-gray-400 group-hover:text-indigo-600 w-5" />
        <span>{tx('bookFacility', 'Book Facility')}</span>
        <ChevronRight className="ml-auto text-gray-300 group-hover:text-indigo-400 text-sm" />
      </Link>
      <Link
        href="/admin/content/new"
        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition group"
      >
        <Plus className="text-gray-400 group-hover:text-indigo-600 w-5" />
        <span>{tx('createContent', 'Create Content')}</span>
        <ChevronRight className="ml-auto text-gray-300 group-hover:text-indigo-400 text-sm" />
      </Link>
      {userId && (
        <Link
          href={`/resident/${userId}`}
          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition group"
        >
          <User className="text-gray-400 group-hover:text-indigo-600 w-5" />
          <span>{tx('viewProfile', 'View My Profile')}</span>
          <ChevronRight className="ml-auto text-gray-300 group-hover:text-indigo-400 text-sm" />
        </Link>
      )}
    </div>
  );
}
