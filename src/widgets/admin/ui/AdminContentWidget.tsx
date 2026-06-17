'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@shared/ui';
import { logError } from '@shared/lib';

export interface ContentItem {
  id: string;
  title: string;
  published: boolean;
  [key: string]: unknown;
}

export function AdminContentWidget() {
  const { t } = useTranslation('admin');
  const [contentStats, setContentStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    recent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContentStats() {
      try {
        const response = await fetch('/api/content');
        if (response.ok) {
          const body = await response.json();
          const raw = body?.data;
          const content = Array.isArray(raw) ? raw : [];
          const total = content.length;
          const published = content.filter((c: ContentItem) => c.published).length;
          const draft = total - published;

          // Mock recent content (last 7 days)
          const recent = Math.floor(Math.random() * 3) + 1;

          setContentStats({ total, published, draft, recent });
        }
      } catch (error) {
        logError(
          { component: 'AdminContentWidget', operation: 'fetchContentStats' },
          'Failed to fetch content stats',
          error
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContentStats();
  }, []);

  if (loading) {
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
              <i className="fas fa-check-circle text-2xl text-green-600"></i>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Drafts</p>
                <p className="text-2xl font-bold text-gray-900">{contentStats.draft}</p>
              </div>
              <i className="fas fa-edit text-2xl text-gray-600"></i>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Content</p>
                <p className="text-2xl font-bold text-blue-900">{contentStats.total}</p>
              </div>
              <i className="fas fa-file-alt text-2xl text-blue-600"></i>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Recent Posts</p>
                <p className="text-2xl font-bold text-orange-900">{contentStats.recent}</p>
              </div>
              <i className="fas fa-clock text-2xl text-orange-600"></i>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href="/admin/content"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Manage Content →
          </a>
          <a
            href="/admin/content/new"
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Create New →
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
}
