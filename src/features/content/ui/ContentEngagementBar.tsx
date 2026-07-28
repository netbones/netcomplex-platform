'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Heart, MessageCircle, Share2, Copy, Check, Volleyball } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { useContentLike } from '../model/useContentLike';
import { SupportChipsButton, type SupportTarget } from '@features/support';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui';

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

  const handleLikeClick = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

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

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Share this post"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-soralia-primary/10 hover:text-soralia-primary"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>Share</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" sideOffset={8} className="w-56 p-2">
            <ShareMenu url={shareUrl} title={shareTitle} />
          </PopoverContent>
        </Popover>

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

function ShareMenu({ url: _url, title }: { url?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const url = _url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const encodedUrl = encodeURIComponent(url);
  const text = title ? encodeURIComponent(title) : '';

  const handleCopy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [url]);

  const handleShare = useCallback((shareUrl: string) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </span>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>

      <div className="mx-3 my-1 border-t border-gray-100" />

      <button
        type="button"
        onClick={() =>
          handleShare(`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`)
        }
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </span>
        X
      </button>

      <button
        type="button"
        onClick={() => handleShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <span className="flex h-6 w-6 items-center justify-center text-[#1877F2]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </span>
        Facebook
      </button>

      <button
        type="button"
        onClick={() => handleShare(`https://wa.me/?text=${text ? `${text}%0a` : ''}${encodedUrl}`)}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <span className="flex h-6 w-6 items-center justify-center text-[#25D366]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
        WhatsApp
      </button>

      <button
        type="button"
        onClick={() =>
          handleShare(
            `https://www.threads.net/intent/post?text=${text ? `${text}%0a` : ''}${encodedUrl}`
          )
        }
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <Volleyball className="h-4 w-4 text-gray-500" />
        Threads
      </button>
    </div>
  );
}
