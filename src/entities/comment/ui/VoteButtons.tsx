'use client';

import { useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { trpc, authClient } from '@api/client';
import { cn } from '@/shared/lib/utils';
import type { CommentVoteType } from '@entities/comment';

export interface VoteButtonsProps {
  commentId: string;
  score: number;
  upvotes: number;
  downvotes: number;
  userVote: 'UPVOTE' | 'DOWNVOTE' | null;
  onVoteChange?: (state: {
    score: number;
    upvotes: number;
    downvotes: number;
    userVote: CommentVoteType | null;
  }) => void;
}

export function VoteButtons({
  commentId,
  score,
  upvotes,
  downvotes,
  userVote,
  onVoteChange,
}: VoteButtonsProps) {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const voteMutation = trpc.comments.vote.useMutation({
    onSuccess: (result, variables) => {
      if (!result?.data?.success) return;

      let nextUp = upvotes;
      let nextDown = downvotes;
      let nextVote: 'UPVOTE' | 'DOWNVOTE' | null = userVote;

      if (userVote === null) {
        if (variables.type === 'UPVOTE') {
          nextUp = upvotes + 1;
        } else {
          nextDown = downvotes + 1;
        }
        nextVote = variables.type;
      } else if (userVote === variables.type) {
        if (variables.type === 'UPVOTE') {
          nextUp = Math.max(0, upvotes - 1);
        } else {
          nextDown = Math.max(0, downvotes - 1);
        }
        nextVote = null;
      } else {
        if (variables.type === 'UPVOTE') {
          nextUp = upvotes + 1;
          nextDown = Math.max(0, downvotes - 1);
        } else {
          nextDown = downvotes + 1;
          nextUp = Math.max(0, upvotes - 1);
        }
        nextVote = variables.type;
      }

      const nextScore = nextUp - nextDown;
      onVoteChange?.({
        score: nextScore,
        upvotes: nextUp,
        downvotes: nextDown,
        userVote: nextVote,
      });
      utils.comments.list.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to record vote');
    },
  });

  const handleVote = useCallback(
    async (type: 'UPVOTE' | 'DOWNVOTE') => {
      if (!session?.user) {
        toast.error('Sign in to vote');
        return;
      }
      await voteMutation.mutateAsync({ commentId, type });
    },
    [session, voteMutation, commentId]
  );

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        type="button"
        onClick={() => handleVote('UPVOTE')}
        disabled={voteMutation.isPending}
        aria-pressed={userVote === 'UPVOTE'}
        aria-label="Upvote"
        className={cn(
          'rounded p-1 transition-colors',
          'hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60',
          userVote === 'UPVOTE' ? 'text-green-600' : 'text-gray-400'
        )}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <span
        className={cn(
          'min-w-[1.25rem] text-center font-medium tabular-nums',
          score > 0 ? 'text-green-700' : score < 0 ? 'text-red-700' : 'text-gray-600'
        )}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={() => handleVote('DOWNVOTE')}
        disabled={voteMutation.isPending}
        aria-pressed={userVote === 'DOWNVOTE'}
        aria-label="Downvote"
        className={cn(
          'rounded p-1 transition-colors',
          'hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60',
          userVote === 'DOWNVOTE' ? 'text-red-600' : 'text-gray-400'
        )}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
