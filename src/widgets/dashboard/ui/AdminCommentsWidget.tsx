'use client';

import { useState, useCallback } from 'react';
import { Shield, Flag, Trash2, EyeOff, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { trpc } from '@api/client';
import { LoadingSkeleton, ErrorBoundary } from '@shared/ui';
import { cn } from '@/shared/lib/utils';

interface FlaggedItemAuthor {
  id: string | null;
  name: string | null;
  avatar: string | null;
  profileSlug: string | null;
}

interface FlaggedItem {
  id: string;
  contentId: string;
  authorId: string;
  body: string;
  status: string;
  score: number;
  upvotes: number;
  downvotes: number;
  moderationNotes: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
  createdAt: string;
  author: FlaggedItemAuthor | null;
  openReports: number;
}

// ── Helpers ──

type StatusFilter = 'FLAGGED' | 'HIDDEN' | 'REMOVED';

interface FilterTabDef {
  id: StatusFilter;
  label: string;
  description?: string;
}

const TABS: FilterTabDef[] = [
  { id: 'FLAGGED', label: 'Flagged', description: 'Auto-flagged or community reported' },
  { id: 'HIDDEN', label: 'Hidden', description: 'Soft-removed by admin' },
  { id: 'REMOVED', label: 'Removed', description: 'Hard-removed by admin' },
];

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Component ──

export function AdminCommentsWidget() {
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('FLAGGED');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading, isError, error } = trpc.comments.listFlagged.useQuery({
    status: activeStatus,
    page: 1,
    limit: 20,
  });

  const moderateMutation = trpc.comments.moderate.useMutation({
    onSuccess: () => {
      toast.success('Moderation applied');
      utils.comments.listFlagged.invalidate();
    },
    onError: err => {
      toast.error(err.message || 'Failed to moderate comment');
    },
  });

  const handleModerate = useCallback(
    async (commentId: string, action: 'REMOVED' | 'HIDDEN' | 'PUBLISHED') => {
      setPendingId(commentId);
      try {
        await moderateMutation.mutateAsync({ commentId, action });
      } finally {
        setPendingId(null);
      }
    },
    [moderateMutation]
  );

  const items = ((data?.data as { items?: FlaggedItem[] } | undefined)?.items ??
    []) as FlaggedItem[];
  const pagination = (data?.data as { pagination?: { total?: number } } | undefined)?.pagination;
  const total = pagination?.total ?? items.length;

  return (
    <section
      className="flex h-full flex-col rounded-lg border border-gray-200 bg-white"
      aria-label="Flagged comments moderation"
    >
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-900">Comments Moderation</h2>
          {total > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {total}
            </span>
          )}
        </div>
      </header>

      <nav className="flex border-b border-gray-100 text-xs" aria-label="Status filter">
        {TABS.map(tab => {
          const active = activeStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveStatus(tab.id)}
              className={cn(
                'flex-1 border-b-2 px-3 py-2 font-medium transition-colors',
                active
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading && (
          <div className="space-y-2">
            <LoadingSkeleton lines={3} />
            <LoadingSkeleton lines={2} />
            <LoadingSkeleton lines={3} />
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load queue</p>
              <p className="mt-0.5 text-xs text-red-600">{error?.message ?? 'Unknown error'}</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-gray-400">
            <Flag className="mb-2 h-6 w-6 opacity-50" />
            <p>No {TABS.find(t => t.id === activeStatus)?.label.toLowerCase()} comments.</p>
            <p className="mt-0.5 text-xs">
              Auto-flag triggers at tenant-configured report threshold.
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <ul className="space-y-3">
            {items.map(item => (
              <li key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-xs">
                    <Flag className="h-3 w-3 flex-shrink-0 text-red-500" />
                    <span className="truncate font-medium text-gray-900">
                      {item.author?.name ?? 'Unknown'}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{relativeTime(item.createdAt)}</span>
                    {item.openReports > 0 && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                          {item.openReports} {item.openReports === 1 ? 'report' : 'reports'}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-600">
                    {item.score > 0 ? '+' : ''}
                    {item.score}
                  </span>
                </div>

                <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{item.body}</p>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                  <Link
                    href={`/news/${item.contentId}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    View in context
                  </Link>
                  <div className="flex items-center gap-1">
                    {(item.status === 'FLAGGED' || item.status === 'HIDDEN') && (
                      <button
                        type="button"
                        onClick={() => handleModerate(item.id, 'PUBLISHED')}
                        disabled={pendingId === item.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                        aria-label="Approve and republish comment"
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        Approve
                      </button>
                    )}
                    {item.status !== 'HIDDEN' && (
                      <button
                        type="button"
                        onClick={() => handleModerate(item.id, 'HIDDEN')}
                        disabled={pendingId === item.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        aria-label="Hide comment"
                      >
                        <EyeOff className="h-3 w-3" />
                        Hide
                      </button>
                    )}
                    {item.status !== 'REMOVED' && (
                      <button
                        type="button"
                        onClick={() => handleModerate(item.id, 'REMOVED')}
                        disabled={pendingId === item.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        aria-label="Remove comment"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function AdminCommentsWidgetWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <AdminCommentsWidget />
    </ErrorBoundary>
  );
}
