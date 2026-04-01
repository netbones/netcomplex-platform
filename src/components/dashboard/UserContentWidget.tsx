'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { sanitizeHtml } from '@/lib/utils';
import { Bookshelf } from '@/components/ui/Bookshelf';
import { MediaLibrary } from '@/components/ui/MediaLibrary';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  published: boolean;
  publishedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

export function UserContentWidget() {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserContent() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/content?authorId=${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setContent(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch user content:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserContent();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4">
          <div className="animate-pulse">Loading content...</div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {content.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>{t('noContent', 'No content yet')}</p>
            <Link href="/admin/content/new" className="text-indigo-600 hover:underline">
              {t('createFirst', 'Create your first content')}
            </Link>
          </div>
        ) : (
          content.slice(0, 5).map(item => (
            <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  {item.excerpt && (
                    <p className="text-sm text-gray-600 mt-1">{sanitizeHtml(item.excerpt)}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.category}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/admin/content/${item.id}/edit`}
                  className="text-indigo-600 hover:underline text-sm"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </ErrorBoundary>
  );
}

export function BookshelfWidget() {
  const { data: session } = authClient.useSession();

  if (!session?.user?.id) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4 text-gray-500">
          <p>Please log in to view your bookshelf</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Bookshelf userId={session.user.id} editable={true} />
    </ErrorBoundary>
  );
}

export function MediaWidget() {
  return (
    <ErrorBoundary>
      <MediaLibrary />
    </ErrorBoundary>
  );
}
