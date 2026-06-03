'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  UserCircle,
  FileText,
  Calendar,
  BarChart2,
  Settings,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ActivityItem {
  id: string;
  domain: string;
  action: string;
  resourceLabel: string | null;
  actorName: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  tenantId?: string;
}

interface AdminActivityStreamProps {
  isPlatformAdmin?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DOMAIN_TABS = [
  { id: 'all', label: 'All' },
  { id: 'users', label: 'Users' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'content', label: 'Content' },
  { id: 'events', label: 'Events' },
  { id: 'surveys', label: 'Surveys' },
  { id: 'system', label: 'System' },
] as const;

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  maintenance: Wrench,
  users: UserCircle,
  content: FileText,
  events: Calendar,
  surveys: BarChart2,
  system: Settings,
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function domainColour(domain: string): string {
  const map: Record<string, string> = {
    maintenance: 'bg-red-100 text-red-600',
    users: 'bg-indigo-100 text-indigo-600',
    content: 'bg-emerald-100 text-emerald-600',
    events: 'bg-purple-100 text-purple-600',
    surveys: 'bg-blue-100 text-blue-600',
    system: 'bg-gray-100 text-gray-600',
  };
  return map[domain] ?? 'bg-gray-100 text-gray-600';
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    submitted: 'submitted a maintenance request',
    started: 'started work on',
    completed: 'completed',
    cancelled: 'cancelled',
    joined: 'joined as a new resident',
    published: 'published',
    drafted: 'saved a draft of',
    activated: 'activated survey',
    closed: 'closed survey',
    updated: 'updated',
  };
  return map[action] ?? action;
}

function formatMetadata(domain: string, metadata: Record<string, unknown>): string {
  try {
    if (domain === 'maintenance') {
      return `${metadata.category ?? ''} · Priority: ${metadata.priority ?? '—'}`;
    }
    if (domain === 'users') return `Role: ${metadata.role ?? '—'}`;
    if (domain === 'content') return `${metadata.category ?? ''}`;
    if (domain === 'surveys') return `Status: ${metadata.status ?? '—'}`;
    if (domain === 'events') return `${metadata.location ?? ''}`;
    return '';
  } catch {
    return '';
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 0) return 'just now';
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════
// FEED ITEM
// ═══════════════════════════════════════════════════════════════

function ActivityFeedItem({
  item,
  index,
  isPlatformAdmin,
}: {
  item: ActivityItem;
  index: number;
  isPlatformAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const DomainIcon = DOMAIN_ICONS[item.domain] ?? Settings;
  const colourClass = domainColour(item.domain);
  const hasDetails = item.metadata && Object.keys(item.metadata).length > 0;

  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors hover:bg-gray-100 ${
        expanded ? 'bg-gray-100' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
      }`}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      {/* Domain icon in a coloured circle */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colourClass}`}
      >
        <DomainIcon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Action description — truncated when collapsed */}
        <p className={`text-sm text-gray-900 ${expanded ? '' : 'line-clamp-1'}`}>
          <span className="font-medium">{item.actorName ?? 'System'}</span>{' '}
          {actionLabel(item.action)}{' '}
          {item.resourceLabel && <span className="font-medium">{item.resourceLabel}</span>}
        </p>

        {/* Metadata line */}
        {hasDetails && (
          <p className="text-xs text-gray-500 mt-0.5">
            {formatMetadata(item.domain, item.metadata!)}
          </p>
        )}

        {/* Expanded detail area */}
        {expanded && hasDetails && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            {Object.entries(item.metadata!).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium text-gray-600 capitalize">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform admin tenant badge */}
      {isPlatformAdmin && item.tenantId && (
        <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
          {item.tenantId.slice(0, 8)}
        </span>
      )}

      {/* Timestamp + expand indicator */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <time className="text-xs text-gray-400 whitespace-nowrap">
          {formatRelativeTime(item.createdAt)}
        </time>
        <ChevronRight
          className={`w-3 h-3 text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SKELETON / ERROR STATES
// ═══════════════════════════════════════════════════════════════

function ActivitySkeleton() {
  return (
    <div className="px-4 py-2 space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
        >
          <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-sm text-red-600 mb-2">Could not load activity</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm text-red-500 underline hover:text-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AdminActivityStream({ isPlatformAdmin = false }: AdminActivityStreamProps) {
  const [domain, setDomain] = useState<string>('all');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const fetchActivity = useCallback(async (selectedDomain: string, cursor?: string) => {
    const params = new URLSearchParams({ domain: selectedDomain, limit: '20' });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`/api/admin/activity?${params}`);
    if (!res.ok) throw new Error('Failed to fetch activity');

    const body = await res.json();
    // Handle canonical apiSuccess envelope: { success: true, data: { items, nextCursor } }
    const payload = body.success ? body.data : body;
    return {
      items: (payload.items ?? []) as ActivityItem[],
      nextCursor: (payload.nextCursor ?? null) as string | null,
    };
  }, []);

  // Initial load + domain switch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setItems([]);
    setNextCursor(null);

    fetchActivity(domain)
      .then(data => {
        if (cancelled) return;
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [domain, fetchActivity]);

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    fetchActivity(domain, nextCursor)
      .then(data => {
        setItems(prev => [...prev, ...data.items]);
        setNextCursor(data.nextCursor);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  };

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    fetchActivity(domain)
      .then(data => {
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
      </div>

      {/* Domain filter tabs */}
      <div className="px-4 py-2 border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-1" role="tablist" aria-label="Activity domain filter">
          {DOMAIN_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={domain === tab.id}
              onClick={() => setDomain(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                domain === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {error ? (
        <ActivityError onRetry={handleRetry} />
      ) : loading ? (
        <ActivitySkeleton />
      ) : items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      ) : (
        <div className="px-4 py-2">
          {items.map((item, index) => (
            <ActivityFeedItem
              key={`${item.domain}-${item.id}`}
              item={item}
              index={index}
              isPlatformAdmin={isPlatformAdmin}
            />
          ))}

          {/* Load more button */}
          {nextCursor && (
            <div className="py-3 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
                {!loadingMore && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminActivityStream;
