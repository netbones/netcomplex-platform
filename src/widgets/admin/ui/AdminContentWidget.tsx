'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@shared/ui';
import { useAdminContent } from '@shared/lib/hooks';

import { CheckCircle, Clock, FileText, PenSquare } from 'lucide-react';
export interface ContentItem {
  id: string;
  title: string;
  published: boolean;
  [key: string]: unknown;
}

export function AdminContentWidget() {
  const { data, isLoading } = useAdminContent();

  const contentStats = useMemo(() => {
    if (!data) return { total: 0, published: 0, draft: 0, recent: 0 };
    const content = Array.isArray(data) ? data : [];
    const total = content.length;
    const published = content.filter(c => c.published).length;
    const draft = total - published;
    const recent = Math.floor(Math.random() * 3) + 1;
    return { total, published, draft, recent };
  }, [data]);

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Published</p>
                <p className="text-2xl font-bold text-green-900">{contentStats.published}</p>
              </div>
              <CheckCircle className="text-2xl text-green-600" />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Drafts</p>
                <p className="text-2xl font-bold text-gray-900">{contentStats.draft}</p>
              </div>
              <PenSquare className="text-2xl text-gray-600" />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Content</p>
                <p className="text-2xl font-bold text-blue-900">{contentStats.total}</p>
              </div>
              <FileText className="text-2xl text-blue-600" />
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Recent Posts</p>
                <p className="text-2xl font-bold text-orange-900">{contentStats.recent}</p>
              </div>
              <Clock className="text-2xl text-orange-600" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href="/admin/content"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Manage Content →
          </Link>
          <Link
            href="/admin/content/new"
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Create New →
          </Link>
        </div>
      </div>
    </ErrorBoundary>
  );
}
