'use client';

import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface UseContentLikeOptions {
  contentId: string;
  initialLiked: boolean;
  initialCount: number;
}

interface UseContentLikeResult {
  liked: boolean;
  count: number;
  isPending: boolean;
  toggleLike: () => void;
}

/**
 * Optimistic like/unlike state for a single Content post.
 */
export function useContentLike({
  contentId,
  initialLiked,
  initialCount,
}: UseContentLikeOptions): UseContentLikeResult {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  const { mutate, isPending } = useMutation<
    void,
    Error,
    boolean,
    { previousLiked: boolean; previousCount: number }
  >({
    mutationFn: async (nextLiked: boolean) => {
      const response = await fetch(`/api/content/${contentId}/like`, {
        method: nextLiked ? 'POST' : 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to update like state');
      }
    },
    onMutate: (nextLiked: boolean) => {
      const previousLiked = liked;
      const previousCount = count;

      setLiked(nextLiked);
      setCount(current => current + (nextLiked ? 1 : -1));

      return { previousLiked, previousCount };
    },
    onError: (_error, _nextLiked, context) => {
      if (!context) return;
      setLiked(context.previousLiked);
      setCount(context.previousCount);
    },
  });

  const toggleLike = useCallback(() => {
    mutate(!liked);
  }, [liked, mutate]);

  return { liked, count, isPending, toggleLike };
}
