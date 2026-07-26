'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Heart, Loader2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { useContentLike } from '../model/useContentLike';
import { SupportChipsButton, type SupportTarget } from '@features/support';

export interface ChipsConfig {
  targetType: SupportTarget;
  targetId: string;
  recipientUserId: string;
}

export interface ContentEngagementBarProps {
  /** Content.id this bar belongs to. */
  contentId: string;
  /** Whether the current user has already liked this post. */
  initialLiked?: boolean;
  /** Total like count to seed optimistic updates from. */
  likeCount?: number;
  /**
   * Creator opt-in flag. When false, the comments toggle (and the
   * comments slot below it) is not rendered at all — not just disabled.
   */
  commentsEnabled?: boolean;
  /** Total comment count, shown on the toggle button. */
  commentCount?: number;
  /** Defaults to the current page URL if omitted. */
  shareUrl?: string;
  /** Used as the title for the native Web Share sheet. */
  shareTitle?: string;
  defaultCommentsExpanded?: boolean;
  /** Fires whenever the comments section is opened or closed. */
  onCommentsToggle?: (expanded: boolean) => void;
  className?: string;
  /** Comments list/form, rendered only while expanded. */
  children?: ReactNode;
  /** When provided, renders a chips/tip button alongside the action bar. */
  chipsConfig?: ChipsConfig;
}

export function ContentEngagementBar({
  contentId,
  initialLiked = false,
  likeCount = 0,
  commentsEnabled = false,
  commentCount = 0,
  shareUrl,
  shareTitle = 'Check this out',
  defaultCommentsExpanded = false,
  onCommentsToggle,
  className,
  children,
  chipsConfig,
}: ContentEngagementBarProps) {
  const { liked, count, isPending, toggleLike } = useContentLike({
    contentId,
    initialLiked,
    initialCount: likeCount,
  });

  const [commentsExpanded, setCommentsExpanded] = useState(defaultCommentsExpanded);
  const [isSharing, setIsSharing] = useState(false);

  const handleLikeClick = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  const handleShareClick = useCallback(async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    if (!url) return;

    setIsSharing(true);

    // Always copy to clipboard — reliable on every platform.
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }

    // On mobile, also fire the native share sheet as a bonus.
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)
      ) {
        await navigator.share({ title: shareTitle, url });
      }
    } catch {
      // User dismissing the sheet is not a failure.
    } finally {
      setIsSharing(false);
    }
  }, [shareTitle, shareUrl]);

  const handleCommentsClick = useCallback(() => {
    setCommentsExpanded(previous => {
      const next = !previous;
      onCommentsToggle?.(next);
      return next;
    });
  }, [onCommentsToggle]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={handleLikeClick}
          disabled={isPending}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike this post' : 'Like this post'}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors',
            'hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60',
            liked ? 'text-red-500' : 'text-gray-500'
          )}
        >
          <Heart className={cn('h-4 w-4', liked && 'fill-current')} aria-hidden="true" />
          <span>{count > 0 ? count : ''}</span>
        </button>

        <button
          type="button"
          onClick={handleShareClick}
          disabled={isSharing}
          aria-label="Share this post"
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-soralia-primary/10 hover:text-soralia-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSharing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Share</span>
        </button>

        {chipsConfig && (
          <SupportChipsButton
            targetType={chipsConfig.targetType}
            targetId={chipsConfig.targetId}
            recipientUserId={chipsConfig.recipientUserId}
          />
        )}

        {commentsEnabled && (
          <button
            type="button"
            onClick={handleCommentsClick}
            aria-expanded={commentsExpanded}
            aria-label={commentsExpanded ? 'Hide comments' : 'Show comments'}
            className={cn(
              'ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors',
              'hover:bg-soralia-primary/10',
              commentsExpanded ? 'text-soralia-primary' : 'text-gray-500'
            )}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>{commentCount > 0 ? commentCount : 'Comment'}</span>
          </button>
        )}
      </div>

      {commentsEnabled && commentsExpanded && (
        <div className="border-t border-gray-100 pt-3" role="region" aria-label="Comments">
          {children}
        </div>
      )}
    </div>
  );
}
