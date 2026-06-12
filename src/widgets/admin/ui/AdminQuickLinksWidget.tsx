'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ADMIN_ITEMS } from '@entities/tenant';
import { ErrorBoundary } from '@shared/ui';

export function AdminQuickLinksWidget() {
  const { t } = useTranslation('admin');

  return (
    <ErrorBoundary>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        {ADMIN_ITEMS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-gray-100 transition-all hover:translate-x-1"
          >
            <span className="font-medium text-gray-700">
              {link.adminLabelKey ? t(link.adminLabelKey) : t(link.labelKey)}
            </span>
            <i className="fas fa-arrow-right text-indigo-500"></i>
          </Link>
        ))}

        {/* Additional admin actions */}
        <div className="border-t pt-3 mt-4">
          <h4 className="text-sm font-medium text-gray-600 mb-3">System Management</h4>
          <div className="space-y-2">
            <Link
              href="/admin/content/new"
              className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-all hover:translate-x-1 text-green-700"
            >
              <span className="font-medium">Create Content</span>
              <i className="fas fa-plus text-green-600"></i>
            </Link>
            <Link
              href="/admin/groups/new"
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all hover:translate-x-1 text-blue-700"
            >
              <span className="font-medium">Create Group</span>
              <i className="fas fa-users text-blue-600"></i>
            </Link>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
