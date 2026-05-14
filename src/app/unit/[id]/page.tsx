'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@api/auth-client';
import { Breadcrumbs, ErrorBoundary, TagCloud } from '@shared/ui';
import { sanitizeHtml } from '@shared/lib/sanitize';
import { usePageLoading } from '@shared/ui';

interface HouseholdData {
  household: {
    id: string;
    street: string;
    unit: string;
    homeImage: string | null;
    platformAddress: string;
    status: string;
    createdAt: string;
  };
  occupants: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    isPublic: boolean;
    showEmail: boolean;
    showPhone: boolean;
    type: 'member' | 'occupant';
    isPrimaryOwner?: boolean;
    profileId?: string;
    platformAddress: string;
    occupantSince: string;
    occupantType?: string;
  }>;
  content: Array<{
    id: string;
    title: string;
    excerpt: string | null;
    content: string;
    category: string;
    tags: string[];
    publishedAt: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      type: 'member' | 'occupant';
      isPrimaryOwner?: boolean;
      profileId?: string;
    };
  }>;
  tags: Array<{
    name: string;
    count: number;
  }>;
  stats: {
    totalOccupants: number;
    totalContent: number;
    uniqueTags: number;
  };
}

function HouseholdContent() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id;
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const contentsPerPage = 5;

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Directory', href: '/directory' },
      {
        label: `${household?.household.street || 'Household'} ${household?.household.unit || ''}`,
        href: id ? `/unit/${id}` : '/directory',
      },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    if (!id) return;

    const fetchHousehold = async () => {
      try {
        const res = await fetch(`/api/households/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Household not found');
          }
          throw new Error('Failed to load household');
        }
        const data = await res.json();
        setHousehold(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load household');
      } finally {
        setLoading(false);
      }
    };

    fetchHousehold();
  }, [id]);

  if (!isReady) {
    return LoadingComponent;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !household) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: tCommon('nav.home'), href: '/' }, { label: 'Household' }]} />
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Household not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            The household you're looking for doesn't exist or is not available.
          </p>
          <Link href="/directory" className="text-soralia-primary hover:underline">
            Return to directory
          </Link>
        </div>
      </div>
    );
  }

  const primaryOwner = household.occupants.find(o => o.isPrimaryOwner);
  const otherOccupants = household.occupants.filter(o => !o.isPrimaryOwner);
  const paginatedContent = household.content.slice(
    (page - 1) * contentsPerPage,
    page * contentsPerPage
  );

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tCommon('nav.home'), href: '/' },
          { label: tCommon('nav.directory'), href: '/directory' },
          {
            label: `${household.household.street} ${household.household.unit}`,
            href: `/unit/${household.household.id}`,
          },
        ]}
      />

      {/* Household Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        {household.household.homeImage && (
          <div className="h-64 w-full">
            <img
              src={household.household.homeImage}
              alt={`${household.household.street} ${household.household.unit}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start gap-8 mb-6">
            {/* Primary Owner Avatar */}
            {primaryOwner && (
              <div className="flex-shrink-0">
                <img
                  src={
                    primaryOwner.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${primaryOwner.name}`
                  }
                  alt={primaryOwner.name}
                  className="w-20 h-20 rounded-full bg-gray-100"
                />
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {household.household.street} {household.household.unit}
              </h1>
              <p className="text-gray-600 mb-4">
                Household established {new Date(household.household.createdAt).getFullYear()}
              </p>

              {/* Household Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                <span>{household.stats.totalOccupants} occupants</span>
                <span>{household.stats.totalContent} posts</span>
                <span>{household.stats.uniqueTags} topics</span>
              </div>

              {/* Primary Contact Info */}
              {primaryOwner && primaryOwner.showEmail && (
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <a
                    href={`mailto:${primaryOwner.email}`}
                    className="flex items-center gap-2 text-soralia-primary hover:underline"
                  >
                    <i className="fas fa-envelope"></i>
                    <span>{primaryOwner.email}</span>
                  </a>
                  {primaryOwner.showPhone && primaryOwner.phone && (
                    <a
                      href={`tel:${primaryOwner.phone}`}
                      className="flex items-center gap-2 text-soralia-primary hover:underline"
                    >
                      <i className="fas fa-phone"></i>
                      <span>{primaryOwner.phone}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Occupants Grid */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Household Members</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {household.occupants.map(occupant => (
                <div
                  key={occupant.id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={
                        occupant.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${occupant.name}`
                      }
                      alt={occupant.name}
                      className="w-12 h-12 rounded-full bg-gray-200"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{occupant.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{occupant.type}</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Member since {new Date(occupant.occupantSince).getFullYear()}</p>
                    {occupant.isPrimaryOwner && (
                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        Primary Owner
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Content Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Household Content</h2>

              {paginatedContent.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-home text-4xl mb-4"></i>
                  <p>No published content yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {paginatedContent.map(content => (
                    <article
                      key={content.id}
                      className="border-b border-gray-200 pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={
                            household.occupants.find(o => o.id === content.author.id)?.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${content.author.name}`
                          }
                          alt={content.author.name}
                          className="w-8 h-8 rounded-full bg-gray-200"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{content.author.name}</span>
                            {content.author.isPrimaryOwner && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Owner
                              </span>
                            )}
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                                content.author.type === 'member'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {content.author.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{new Date(content.publishedAt).toLocaleDateString()}</span>
                            <span
                              className={`px-2 py-1 rounded ${getCategoryColor(content.category)}`}
                            >
                              {content.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.title}</h3>

                      {content.excerpt && (
                        <p className="text-gray-600 text-sm mb-3">{content.excerpt}</p>
                      )}

                      <div
                        className="prose prose-sm max-w-none mb-4"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            content.content.substring(0, 300) +
                              (content.content.length > 300 ? '...' : '')
                          ),
                        }}
                      />

                      {content.tags && content.tags.length > 0 && (
                        <div className="mb-3">
                          <TagCloud tags={content.tags} maxDisplay={3} size="small" />
                        </div>
                      )}

                      <Link
                        href={`/news/${content.id}`}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        Read full post →
                      </Link>
                    </article>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {Math.ceil(household.content.length / contentsPerPage) > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-center gap-2">
                    {Array.from(
                      { length: Math.ceil(household.content.length / contentsPerPage) },
                      (_, i) => (
                        <button
                          key={i}
                          onClick={() => setPage(i + 1)}
                          className={`px-3 py-1 rounded ${
                            page === i + 1
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {i + 1}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Household Topics</h3>
            {household.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {household.tags.slice(0, 20).map(tag => (
                  <span
                    key={tag.name}
                    className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-full"
                    title={`${tag.count} posts`}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No topics yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HouseholdProfilePage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-8 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        }
      >
        <HouseholdContent />
      </Suspense>
    </ErrorBoundary>
  );
}
