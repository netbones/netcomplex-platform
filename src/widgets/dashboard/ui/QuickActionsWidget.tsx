import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';

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
        <i className="fas fa-wrench text-gray-400 group-hover:text-indigo-600 w-5"></i>
        <span>{tx('submitRequest', 'Submit Request')}</span>
        <i className="fas fa-chevron-right ml-auto text-gray-300 group-hover:text-indigo-400 text-sm"></i>
      </Link>
      <Link
        href="/bookings"
        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition group"
      >
        <i className="fas fa-calendar-plus text-gray-400 group-hover:text-indigo-600 w-5"></i>
        <span>{tx('bookFacility', 'Book Facility')}</span>
        <i className="fas fa-chevron-right ml-auto text-gray-300 group-hover:text-indigo-400 text-sm"></i>
      </Link>
      <Link
        href="/admin/content/new"
        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition group"
      >
        <i className="fas fa-plus-circle text-gray-400 group-hover:text-indigo-600 w-5"></i>
        <span>{tx('createContent', 'Create Content')}</span>
        <i className="fas fa-chevron-right ml-auto text-gray-300 group-hover:text-indigo-400 text-sm"></i>
      </Link>
      {userId && (
        <Link
          href={`/resident/${userId}`}
          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition group"
        >
          <i className="fas fa-user text-gray-400 group-hover:text-indigo-600 w-5"></i>
          <span>{tx('viewProfile', 'View My Profile')}</span>
          <i className="fas fa-chevron-right ml-auto text-gray-300 group-hover:text-indigo-400 text-sm"></i>
        </Link>
      )}
    </div>
  );
}
