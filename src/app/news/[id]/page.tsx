'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Breadcrumbs, ErrorBoundary, TagCloud } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { sanitizeHtml } from '@shared/lib/sanitize';
import { usePageLoading } from '@shared/ui';

const log = createComponentLogger('news-post-page');

interface ContentItem {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags: string[];
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
}

export default function NewsPostPage() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id;
  const { t } = useTranslation(['common', 'news']);
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'News & Updates', href: '/news' },
      { label: 'Post', href: id ? `/news/${id}` : '/news' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    if (!id) return;

    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/content/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.published) {
            setContent(data);
          }
        }
      } catch (error) {
        log.error({}, 'Failed to fetch content', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'NEWS':
        return 'bg-blue-100 text-blue-800';
      case 'ANNOUNCEMENT':
        return 'bg-green-100 text-green-800';
      case 'EVENT':
        return 'bg-purple-100 text-purple-800';
      case 'BLOG':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isReady) {
    return LoadingComponent;
  }

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!content) {
    return (
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: t('nav.home'), href: '/' },
              { label: 'News & Updates', href: '/news' },
            ]}
          />
          <div className="text-center py-12">
            <i className="fas fa-exclamation-triangle text-4xl text-gray-400 mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
            <p className="text-gray-600 mb-6">
              The post you're looking for doesn't exist or is not published.
            </p>
            <Link
              href="/news"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to News
            </Link>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: 'News & Updates', href: '/news' },
            { label: content.title, href: `/news/${content.id}` },
          ]}
        />

        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${getCategoryColor(content.category)}`}
              >
                {content.category}
              </span>
              <span className="text-sm text-gray-500">
                {content.publishedAt
                  ? new Date(content.publishedAt).toLocaleDateString()
                  : new Date(content.createdAt).toLocaleDateString()}
              </span>
              {content.author?.name && (
                <span className="text-sm text-gray-500">By {content.author.name}</span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-6">{content.title}</h1>

            {content.excerpt && (
              <p className="text-xl text-gray-600 mb-6 italic">{content.excerpt}</p>
            )}

            <div
              className="prose prose-lg max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.content) }}
            />

            {content.tags && content.tags.length > 0 && (
              <div className="border-t pt-6">
                <TagCloud tags={content.tags} maxDisplay={10} size="medium" />
              </div>
            )}
          </div>
        </article>

        <div className="mt-8 text-center">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
            Back to News & Updates
          </Link>
        </div>
      </div>
    </ErrorBoundary>
  );
}
