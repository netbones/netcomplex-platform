'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Breadcrumbs, ErrorBoundary, RichTextRenderer } from '@shared/ui';
import { ContentEngagementBar } from '@features/content';
import { createComponentLogger } from '@shared/lib';
import Image from 'next/image';
import { usePageLoading } from '@shared/ui';

import { AlertCircle, ArrowLeft, User } from 'lucide-react';
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
  const { t, i18n } = useTranslation(['common', 'news']);
  const params = useParams();
  const id = params?.id as string;

  const [post, setPost] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

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
        const [postRes, likeRes] = await Promise.all([
          fetch(`/api/content/${id}?published=true&locale=${i18n.language}`),
          fetch(`/api/content/${id}/like`),
        ]);

        if (postRes.ok) {
          const body = await postRes.json();
          const data = body?.data ?? body;
          setPost(data);
        } else {
          setError('Post not found');
        }

        if (likeRes.ok) {
          const body = await likeRes.json();
          const data = body?.data ?? body;
          setLiked(data.liked);
          setLikeCount(data.likes);
        }
      } catch (err) {
        log.error({}, 'Failed to fetch post', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, i18n.language]);

  if (!isReady) {
    return LoadingComponent;
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <AlertCircle className="text-5xl text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <ArrowLeft />
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
                <User />
                <span>By {post.author.name}</span>
              </div>
            )}
          </div>

          {/* Featured  */}
          {post.image && (
            <div className="mb-8 rounded-xl overflow-hidden relative">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="w-full h-64 sm:h-80 object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-8 rounded-r-lg">
              <p className="text-indigo-800 font-medium italic">{post.excerpt}</p>
            </div>
          )}

          {/* Content */}
          <RichTextRenderer content={post.content} className="mb-8" />

          <ContentEngagementBar
            contentId={post.id}
            initialLiked={liked}
            likeCount={likeCount}
            className="mb-6"
          />

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
              <ArrowLeft />
              Back to News & Updates
            </Link>
          </div>
        </article>
      </div>
    </ErrorBoundary>
  );
}
