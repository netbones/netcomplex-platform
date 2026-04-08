'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiToast } from '@/hooks/useApiToast';

/*
 * TAG CLOUD WIDGET
 * ---------------
 * Used by: SidebarWidgetBox (type: 'tag-cloud')
 *
 * Displays content tags with size based on frequency.
 * - If authorId provided: filters tags by that user's content
 * - If no authorId: shows all site content tags (general tag cloud)
 * ---------------
 */

interface TagCloudWidgetProps {
  widgetId: string;
  authorId?: string;
}

export function TagCloudWidget({ widgetId, authorId }: TagCloudWidgetProps) {
  const { t } = useTranslation('dashboard');
  const { fetch } = useApiToast({ component: 'TagCloudWidget' });
  const [tags, setTags] = useState<{ name: string; size: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserTags();
  }, [authorId]);

  const buildApiUrl = () => {
    if (authorId) {
      return `/api/content?authorId=${authorId}`;
    }
    return '/api/content';
  };

  const getTagSize = (count: number): string => {
    if (count >= 10) return 'text-lg';
    if (count >= 5) return 'text-base';
    if (count >= 3) return 'text-sm';
    return 'text-xs';
  };

  const fetchUserTags = () => {
    fetch(
      fetch(buildApiUrl()).then(res => res.json()),
      {
        error: 'Failed to fetch user tags',
        onSuccess: (data: unknown[]) => {
          if (!Array.isArray(data)) return;

          const tagCounts: Record<string, number> = {};
          data.forEach((item: { tags?: string[] }) => {
            if (item.tags && Array.isArray(item.tags)) {
              item.tags.forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              });
            }
          });

          const tagArray = Object.entries(tagCounts)
            .map(([name, count]) => ({
              name,
              count,
              size: getTagSize(count),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          setTags(tagArray);
        },
        onError: () => setLoading(false),
      }
    );
  };

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded"></div>;
  }

  if (tags.length === 0) {
    return <p className="text-sm text-gray-500">No tags yet</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <span
          key={tag.name}
          className={`${tag.size} px-2 py-1 bg-gray-100 text-gray-700 rounded-full`}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
