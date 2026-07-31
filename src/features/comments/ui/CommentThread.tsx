'use client';

import { useEffect, useMemo } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { trpc } from '@api/client';
import { cn } from '@/shared/lib/utils';
import type { CommentDetailDTO } from '@entities/comment';
import { CommentItem } from '@entities/comment';
import { CommentForm } from '@entities/comment';
import { subscribeCommentUpdates } from '@shared/lib';

export interface CommentThreadProps {
  contentId: string;
  className?: string;
  maxDepth?: number;
}

function unwrapEnvelope(item: unknown): unknown {
  if (item && typeof item === 'object' && 'data' in item) {
    return (item as { data: unknown }).data;
  }
  return item;
}

function countComments(comments: CommentDetailDTO[]): number {
  let count = 0;
  for (const c of comments) {
    count += 1;
    if (c.replies && c.replies.length > 0) {
      count += countComments(c.replies);
    }
  }
  return count;
}

export function CommentThread({ contentId, className, maxDepth = 8 }: CommentThreadProps) {
  const { data, isLoading, isError, error, refetch } = trpc.comments.list.useQuery({ contentId });

  const comments = useMemo<CommentDetailDTO[]>(() => {
    const raw = unwrapEnvelope(data);
    return Array.isArray(raw) ? (raw as CommentDetailDTO[]) : [];
  }, [data]);

  const totalCount = useMemo(() => countComments(comments), [comments]);

  // ADVISORY-037 P2.4 — subscribe to live comment row changes so new comments,
  // replies, status transitions (PUBLISHED ↔ FLAGGED ↔ REMOVED), and
  // denormalised vote-counter updates land without manual refetch.
  useEffect(() => {
    return subscribeCommentUpdates(contentId, () => {
      void refetch();
    });
  }, [contentId, refetch]);

  return (
    <section aria-label="Comments" className={cn('flex flex-col gap-4', className)}>
      <header className="flex items-center gap-2 text-sm text-gray-600">
        <MessageCircle className="h-4 w-4" />
        <span>
          {isLoading
            ? 'Loading comments…'
            : isError
              ? 'Failed to load comments'
              : `${totalCount} ${totalCount === 1 ? 'comment' : 'comments'}`}
        </span>
      </header>

      <CommentForm
        contentId={contentId}
        placeholder="Share your thoughts…"
        submitLabel="Post comment"
      />

      {isLoading && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error?.message || 'Failed to load comments.'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-1.5 text-xs font-medium text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && comments.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
          Be the first to comment.
        </p>
      )}

      {!isLoading && !isError && comments.length > 0 && (
        <div className="flex flex-col gap-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              contentId={contentId}
              depth={0}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </section>
  );
}
