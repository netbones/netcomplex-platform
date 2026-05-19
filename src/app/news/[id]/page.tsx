'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { usePageLoading } from '@shared/ui';

const log = createComponentLogger('news-post-page');

interface ContentItem {
  id: string;
  title: string;
  content: string | Record<string, unknown>;
  excerpt?: string;
  image?: string;
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

interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{ type: string }>;
}

function renderText(node: TipTapNode): React.ReactNode {
  let result: React.ReactNode = node.text || '';
  if (node.marks) {
    for (const mark of node.marks) {
      if (mark.type === 'bold') {
        result = <strong>{result}</strong>;
      }
    }
  }
  return result;
}

function renderNode(node: TipTapNode, key: number): React.ReactNode {
  const { type, content, attrs } = node;

  if (!type) return null;

  switch (type) {
    case 'heading': {
      const level = (attrs?.level as number) || 2;
      const headingStyles: Record<number, string> = {
        1: 'text-3xl font-bold text-gray-900 mt-8 mb-4',
        2: 'text-2xl font-bold text-gray-900 mt-6 mb-3',
        3: 'text-xl font-semibold text-gray-900 mt-4 mb-2',
      };
      const HeadingElement = level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2';
      return (
        <HeadingElement key={key} className={headingStyles[level] || headingStyles[2]}>
          {content?.map((child, i) => renderText(child))}
        </HeadingElement>
      );
    }
    case 'paragraph':
      return (
        <p key={key} className="text-gray-700 leading-relaxed mb-4">
          {content?.map((child, i) => renderText(child))}
        </p>
      );
    case 'bulletList':
      return (
        <ul key={key} className="list-disc list-inside space-y-2 mb-4 text-gray-700">
          {content?.map((item, i) => (
            <li key={i}>{item.content?.map((child, j) => renderNode(child, j))}</li>
          ))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} className="list-decimal list-inside space-y-2 mb-4 text-gray-700">
          {content?.map((item, i) => (
            <li key={i}>{item.content?.map((child, j) => renderNode(child, j))}</li>
          ))}
        </ol>
      );
    case 'text':
      return <span key={key}>{renderText(node)}</span>;
    default:
      return null;
  }
}

function renderContent(content: string | Record<string, unknown>): React.ReactNode {
  if (typeof content === 'string') {
    return <p className="text-gray-700 leading-relaxed">{content}</p>;
  }

  if (content && typeof content === 'object' && 'type' in content) {
    const doc = content as unknown as TipTapNode;

    if (doc.type === 'doc' && doc.content) {
      return doc.content.map((node, idx) => renderNode(node, idx));
    }

    return renderNode(doc, 0);
  }

  return <p className="text-gray-700">{String(content)}</p>;
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'NEWS':
      return 'bg-blue-100 text-blue-800';
    case 'ANNOUNCEMENT':
      return 'bg-green-100 text-green-800';
    case 'EVENT':
      return 'bg-purple-100 text-purple-800';
    case 'BLOG':
      return 'bg-indigo-100 text-indigo-800';
    case 'CONSERVATION':
      return 'bg-emerald-100 text-emerald-800';
    case 'CAMPAIGN':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    NEWS: 'News',
    ANNOUNCEMENT: 'Announcement',
    EVENT: 'Event',
    BLOG: 'Blog Post',
    CONSERVATION: 'Conservation',
    CAMPAIGN: 'Campaign',
  };
  return labels[category] || category;
}

export default function NewsPostPage() {
  const { t } = useTranslation(['common', 'news']);
  const params = useParams();
  const id = params?.id as string;

  const [post, setPost] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: t('nav.home'), href: '/' },
      { label: 'News & Updates', href: '/news' },
      { label: 'Post', href: `/news/${id}` },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/content/${id}?published=true`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
        } else {
          setError('Post not found');
        }
      } catch (err) {
        log.error({}, 'Failed to fetch post', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (!isReady) {
    return LoadingComponent;
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <i className="fas fa-exclamation-circle text-5xl text-gray-300 mb-4"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <i className="fas fa-arrow-left"></i>
            Back to News
          </Link>
        </div>
      </ErrorBoundary>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: 'News & Updates', href: '/news' },
            { label: post.title },
          ]}
        />

        <article className="mt-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${getCategoryColor(post.category)}`}
              >
                {getCategoryLabel(post.category)}
              </span>
              {post.publishedAt && (
                <span className="text-sm text-gray-500">
                  {new Date(post.publishedAt).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>

            {post.author?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <i className="fas fa-user"></i>
                <span>By {post.author.name}</span>
              </div>
            )}
          </div>

          {/* Featured Image */}
          {post.image && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img src={post.image} alt={post.title} className="w-full h-64 sm:h-80 object-cover" />
            </div>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-8 rounded-r-lg">
              <p className="text-indigo-800 font-medium italic">{post.excerpt}</p>
            </div>
          )}

          {/* Content */}
          <div className="mb-8">{renderContent(post.content)}</div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-200">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Back to news */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <i className="fas fa-arrow-left"></i>
              Back to News & Updates
            </Link>
          </div>
        </article>
      </div>
    </ErrorBoundary>
  );
}
