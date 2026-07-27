'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useSafeTranslation } from '@shared/lib';
import Link from 'next/link';
import { authClient } from '@api/client';
import { Breadcrumbs, ErrorBoundary, RichTextRenderer } from '@shared/ui';
import { ContentEngagementBar } from '@features/content';
import { CommentThread } from '@features/comments';
import { createComponentLogger } from '@shared/lib';
import { DirectoryChatModal } from '@/features/directory/ui/DirectoryChatModal';
import Image from 'next/image';
import { StandingBadge } from '@widgets/merit';

import { Mail, MessageSquare, Phone } from 'lucide-react';
const log = createComponentLogger('resident-profile');

interface SidebarWidget {
  id: string;
  type: string;
  title: string;
  isPublic: boolean;
}

// Public sidebar widgets component for resident profiles
function PublicSidebarWidgets({ userId, locale }: { userId: string; locale: string }) {
  const [widgets, setWidgets] = useState<SidebarWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, fetch user's public sidebar widgets
    // For now, show default public widgets
    const defaultPublicWidgets = [
      { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', isPublic: true },
    ];
    setWidgets(defaultPublicWidgets);
    setLoading(false);
  }, [userId]);

  if (loading || widgets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {widgets.map(widget => {
        if (widget.type === 'tag-cloud' && widget.isPublic) {
          return (
            <div key={widget.id} className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Content Tags</h3>
              <TagCloudWidgetForUser userId={userId} locale={locale} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// Tag cloud widget that shows tags from a specific user's content
function TagCloudWidgetForUser({ userId, locale }: { userId: string; locale: string }) {
  const [tags, setTags] = useState<{ name: string; size: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTags = async () => {
      try {
        // Fetch user's published content and extract tags
        const response = await fetch(
          `/api/content?authorId=${userId}&published=true&locale=${locale}`
        );
        if (response.ok) {
          const body = await response.json();
          const content = body?.data ?? body;
          interface ContentItem {
            tags?: string[];
          }
          const tagCounts: { [key: string]: number } = {};

          // Count tag occurrences across all user content
          (content as ContentItem[]).forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
              item.tags.forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              });
            }
          });

          // Convert to tag objects with size classes based on frequency
          const tagArray = Object.entries(tagCounts)
            .map(([name, count]) => ({
              name,
              count,
              size: getTagSize(count),
            }))
            .sort((a, b) => b.count - a.count) // Sort by frequency
            .slice(0, 15); // Show more tags on profile

          setTags(tagArray);
        }
      } catch (error) {
        log.error({}, 'Failed to fetch user tags', error);
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTags();
  }, [userId, locale]);

  const getTagSize = (count: number): string => {
    if (count >= 5) return 'text-lg';
    if (count >= 3) return 'text-base';
    if (count >= 2) return 'text-sm';
    return 'text-xs';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-16"></div>
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return <p className="text-sm text-gray-500 italic">No tags yet</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <span
          key={tag.name}
          className={`${tag.size} text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-full`}
          title={`${tag.count} posts`}
        >
          #{tag.name}
        </span>
      ))}
    </div>
  );
}

interface ResidentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  books: unknown;
  dashboardLayout: unknown;
  isPublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  role: string;
  createdAt: string;
  standing?: number | null;
  standardSeats?: Array<{
    household: {
      id: string;
      street: string;
      unit: string;
      homeImage: string | null;
    };
    isPrimaryOwner: boolean;
  }>;
  soloSeats?: Array<{
    seatType: string;
    household?: {
      id: string;
      street: string;
      unit: string;
      homeImage: string | null;
    };
  }>;
  household?: {
    id: string;
    name: string;
    property?: {
      id: string;
      address: string;
      unitNumber: string;
    };
    members?: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>;
  };
  contents: Array<{
    id: string;
    title: string;
    excerpt: string | null;
    content: string;
    category: string;
    tags: string[];
    publishedAt: string | null;
    commentsEnabled?: boolean;
    commentCount?: number;
    authorId?: string;
  }>;
}

function ProfileContent() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { tx: txCommon, language } = useSafeTranslation('common');
  const { data: session } = authClient.useSession();
  const [user, setUser] = useState<ResidentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const contentsPerPage = 3;

  const isOwnProfile = session?.user?.id === id;

  useEffect(() => {
    if (!id) {
      setError('No user ID provided');
      setLoading(false);
      return;
    }

    // First try the legacy API - it always works
    fetch(`/api/users/${id}`)
      .then(async res => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to load user');
        }
        return res.json();
      })
      .then(body => {
        const data = body?.data ?? body;
        if (!data.isPublic) {
          throw new Error('This profile is not public');
        }
        setUser(data);
      })
      .catch(err => {
        setError(err.message || 'Failed to load user');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ label: txCommon('nav.home', 'Home'), href: '/' }, { label: 'Profile' }]}
        />
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || 'User not found'}</h1>
          <p className="text-gray-600 mb-6">
            {error === 'This profile is not public'
              ? 'This resident has chosen not to make their profile public.'
              : 'The profile you are looking for does not exist or is not available.'}
          </p>
          <Link href="/directory" className="text-soralia-primary hover:underline">
            Return to directory
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl =
    user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name.replace(' ', '')}`;
  const interestList = Array.isArray(user.interests) ? user.interests : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: txCommon('nav.home', 'Home'), href: '/' },
          { label: txCommon('nav.directory', 'Directory'), href: '/directory' },
          { label: user.name },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Main content column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {(user.standardSeats?.[0]?.household?.homeImage ||
              user.soloSeats?.[0]?.household?.homeImage) && (
              <div className="relative h-48 w-full">
                <Image
                  src={
                    user.standardSeats?.[0]?.household?.homeImage ||
                    user.soloSeats?.[0]?.household?.homeImage ||
                    ''
                  }
                  alt={`${user.name}'s home`}
                  fill
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start gap-6">
                <Image
                  src={avatarUrl}
                  alt={user.name}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full bg-gray-100"
                  unoptimized
                />
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                  <StandingBadge points={user.standing} context="public" size="md" />
                  {user.role === 'AGENT' ? (
                    <p className="text-soralia-primary font-medium mt-1">
                      Trusted Service Provider
                    </p>
                  ) : (
                    <p className="text-gray-600 mt-1">
                      {user.standardSeats?.[0]?.household?.street ||
                        user.soloSeats?.[0]?.household?.street ||
                        user.household?.property?.address ||
                        'Address not available'}
                      {(user.standardSeats?.[0]?.household?.unit ||
                        user.soloSeats?.[0]?.household?.unit ||
                        user.household?.property?.unitNumber) &&
                        `, ${user.standardSeats?.[0]?.household?.unit || user.soloSeats?.[0]?.household?.unit || user.household?.property?.unitNumber}`}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {user.role === 'AGENT'
                      ? `Service provider since ${new Date(user.createdAt).getFullYear()}`
                      : `Resident since ${new Date(user.createdAt).getFullYear()}`}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:gap-4 mt-3">
                    {user.showEmail && (
                      <a
                        href={`mailto:${user.email}`}
                        className="flex items-center gap-2 text-soralia-primary hover:underline"
                      >
                        <Mail />
                        <span>{user.email}</span>
                      </a>
                    )}
                    {user.showPhone && user.phone && (
                      <a
                        href={`tel:${user.phone}`}
                        className="flex items-center gap-2 text-soralia-primary hover:underline"
                      >
                        <Phone />
                        <span>{user.phone}</span>
                      </a>
                    )}
                    {!isOwnProfile && session && (
                      <button
                        onClick={() => setChatRecipientId(id ?? null)}
                        className="flex items-center gap-2 text-soralia-primary hover:underline"
                      >
                        <MessageSquare />
                        <span>Message</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {interestList.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Interests</h2>
                  <div className="flex flex-wrap gap-2">
                    {interestList.map((interest: string) => (
                      <span
                        key={interest}
                        className="bg-soralia-primary text-white text-sm px-3 py-1 rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {user.contents && user.contents.length > 0 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Published Content</h2>
                <div className="space-y-6">
                  {user.contents
                    .slice((page - 1) * contentsPerPage, page * contentsPerPage)
                    .map(content => (
                      <div
                        key={content.id}
                        className="border-b border-gray-200 pb-6 last:border-0 last:pb-0"
                      >
                        <Link
                          href={`/news/${content.id}`}
                          className="font-semibold text-gray-900 text-lg hover:text-indigo-600 transition-colors"
                        >
                          {content.title}
                        </Link>
                        {content.excerpt && (
                          <p className="text-gray-600 text-sm mt-1 mb-3">{content.excerpt}</p>
                        )}
                        <RichTextRenderer
                          content={content.content}
                          className="prose prose-sm max-w-none content-body mb-3"
                        />
                        <ContentEngagementBar
                          contentId={content.id}
                          commentsEnabled={content.commentsEnabled}
                          commentCount={content.commentCount ?? 0}
                          chipsConfig={{
                            targetType: 'CONTENT',
                            targetId: content.id,
                            recipientUserId: user.id,
                          }}
                          className="mb-2"
                        >
                          {content.commentsEnabled && <CommentThread contentId={content.id} />}
                        </ContentEngagementBar>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {content.publishedAt
                                ? new Date(content.publishedAt).toLocaleDateString()
                                : ''}
                            </span>
                            <span className="text-xs bg-soralia-secondary text-white px-2 py-0.5 rounded">
                              {content.category}
                            </span>
                            {content.tags && content.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {content.tags.slice(0, 3).map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {content.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{content.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {Math.ceil(user.contents.length / contentsPerPage) > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-center gap-2">
                      {Array.from(
                        { length: Math.ceil(user.contents.length / contentsPerPage) },
                        (_, i) => (
                          <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className={`px-3 py-1 rounded ${
                              page === i + 1 ? 'bg-soralia-primary text-white' : 'bg-gray-200'
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
          )}
        </div>

        {/* Sidebar column */}
        <div className="lg:col-span-1">
          <PublicSidebarWidgets userId={user.id} locale={language} />
        </div>
      </div>

      {chatRecipientId && user && (
        <DirectoryChatModal
          recipientId={chatRecipientId}
          recipientName={user.name}
          onClose={() => setChatRecipientId(null)}
        />
      )}
    </div>
  );
}

export default function ResidentProfilePage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-8 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </ErrorBoundary>
  );
}
