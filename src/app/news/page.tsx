'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Breadcrumbs, ErrorBoundary, TagCloud } from '@shared/ui';
import { createComponentLogger, sanitizeHtml } from '@shared/lib';
import { usePageLoading } from '@shared/ui';

const log = createComponentLogger('news-page');

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

export default function NewsPage() {
  const { t } = useTranslation(['common', 'news']);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'News & Updates', href: '/news' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    fetchContent();
  }, [selectedCategory]);

  const fetchContent = async () => {
    try {
      const categoryParam = selectedCategory !== 'ALL' ? `&category=${selectedCategory}` : '';
      const res = await fetch(`/api/content?published=true${categoryParam}`);
      if (res.ok) {
        const data = await res.json();
        setContent(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      log.error({}, 'Failed to fetch content', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'ALL', label: 'All Posts' },
    { value: 'NEWS', label: 'News' },
    { value: 'ANNOUNCEMENT', label: 'Announcements' },
    { value: 'EVENT', label: 'Events' },
    { value: 'BLOG', label: 'Blog Posts' },
  ];

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

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: t('nav.home'), href: '/' }, { label: 'News & Updates' }]} />

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">News & Updates</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay informed with the latest news, announcements, and updates from our community.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-16 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-newspaper text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-600">
              {selectedCategory === 'ALL'
                ? 'There are no published posts yet.'
                : `There are no published ${selectedCategory.toLowerCase()} posts yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.map(item => (
              <article
                key={item.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(item.category)}`}
                    >
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString()
                        : new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    {item.title}
                  </h2>

                  {item.excerpt && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{item.excerpt}</p>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="mb-4">
                      <TagCloud tags={item.tags} maxDisplay={3} size="small" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {item.author?.name && <span>By {item.author.name}</span>}
                    </div>
                    <Link
                      href={`/news/${item.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Read more →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
