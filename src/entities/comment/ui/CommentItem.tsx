'use client';

import { useState, useCallback } from 'react';
import { Reply } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@shared/ui';
import { cn } from '@/shared/lib/utils';
import type { CommentDetailDTO } from '@entities/comment';
import { CommentForm } from './CommentForm';
import { VoteButtons } from './VoteButtons';
import { ReportMenu } from './ReportMenu';

export interface CommentItemProps {
  comment: CommentDetailDTO;
  contentId: string;
  depth?: number;
  maxDepth?: number;
}

function relativeTime(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function authorInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function CommentItem({ comment, contentId, depth = 0, maxDepth = 8 }: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [voteState, setVoteState] = useState({
    score: comment.score,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    userVote: comment.userVote,
  });

  const handleVoteChange = useCallback(
    (next: {
      score: number;
      upvotes: number;
      downvotes: number;
      userVote: 'UPVOTE' | 'DOWNVOTE' | null;
    }) => {
      setVoteState(next);
    },
    []
  );

  const isDeleted = !!comment.deletedAt;
  const canShowReply = depth < maxDepth;
  const indent = depth > 0 ? 'pl-3 sm:pl-4 border-l-2 border-gray-100' : '';

  return (
    <div className={cn('flex flex-col gap-2', depth > 0 && indent)}>
      <div className="flex gap-2.5">
        <Avatar className="h-8 w-8 flex-shrink-0 ring-1 ring-gray-200">
          {comment.author?.avatar && (
            <AvatarImage src={comment.author.avatar} alt={comment.author.name ?? 'avatar'} />
          )}
          <AvatarFallback className="text-xs">
            {authorInitials(comment.author?.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="truncate font-medium text-gray-900">
              {comment.author?.name ?? 'Unknown'}
            </span>
            <span className="text-gray-400">·</span>
            <time className="text-gray-500" dateTime={comment.createdAt}>
              {relativeTime(comment.createdAt)}
            </time>
            {comment.editedAt && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-gray-400 italic">edited</span>
              </>
            )}
          </div>

          <p
            className={cn(
              'mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed',
              isDeleted ? 'text-gray-400 italic' : 'text-gray-800'
            )}
          >
            {comment.body}
          </p>

          <div className="mt-1.5 flex items-center gap-2">
            <VoteButtons
              commentId={comment.id}
              score={voteState.score}
              upvotes={voteState.upvotes}
              downvotes={voteState.downvotes}
              userVote={voteState.userVote}
              onVoteChange={handleVoteChange}
            />

            {canShowReply && !isDeleted && (
              <button
                type="button"
                onClick={() => setReplyOpen(p => !p)}
                aria-expanded={replyOpen}
                aria-label="Reply to comment"
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
                  'text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700'
                )}
              >
                <Reply className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>
            )}

            {!isDeleted && <ReportMenu commentId={comment.id} />}
          </div>

          {replyOpen && (
            <div className="mt-2">
              <CommentForm
                contentId={contentId}
                parentId={comment.id}
                rootId={comment.rootId ?? comment.id}
                onSuccess={() => setReplyOpen(false)}
                onCancel={() => setReplyOpen(false)}
                placeholder={`Reply to ${comment.author?.name ?? 'this comment'}…`}
                submitLabel="Reply"
                compact
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-3 sm:ml-4 flex flex-col gap-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              contentId={contentId}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
}
