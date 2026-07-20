'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient, trpc } from '@api/client';
import { sanitizeHtml } from '@/shared/lib/sanitize';
import { ErrorBoundary, TagCloud } from '@shared/ui';

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
  const { t, i18n } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const { data, isLoading } = trpc.content.listContent.useQuery(
    { authorId: session?.user?.id, locale: i18n.language },
    { staleTime: 60_000, enabled: !!session?.user?.id }
  );
  const content = (data?.data ?? []) as unknown as ContentItem[];

  if (isLoading) {
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
      <div
        className="space-y-4 max-h-96 overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#6366f1 #f3f4f6',
        }}
      >
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
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2">
                      <TagCloud tags={item.tags} maxDisplay={3} size="small" />
                    </div>
                  )}
                </div>
                <Link
                  href={`/admin/content/${item.id}`}
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
