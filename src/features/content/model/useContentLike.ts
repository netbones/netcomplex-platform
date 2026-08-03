'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/shared/api/http-client';

interface UseContentLikeOptions {
  contentId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

interface UseContentLikeResult {
  liked: boolean;
  count: number;
  isPending: boolean;
  toggleLike: () => void;
}

/**
 * Optimistic like/unlike state for a single Content post.
 *
 * When `initialLiked` / `initialCount` are omitted the hook fetches the
 * current state from `GET /api/content/:id/like` on mount so the component
 * works correctly after a page refresh.
 */
export function useContentLike({
  contentId,
  initialLiked = false,
  initialCount = 0,
}: UseContentLikeOptions): UseContentLikeResult {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    apiGet<{ liked: boolean; likes: number }>(`/api/content/${contentId}/like`)
      .then(({ data }) => {
        setLiked(data.liked);
        setCount(data.likes);
      })
      .catch(() => {});
  }, [contentId]);

  const { mutate, isPending } = useMutation<
    void,
    Error,
    boolean,
    { previousLiked: boolean; previousCount: number }
  >({
    mutationFn: async (nextLiked: boolean) => {
      if (nextLiked) {
        await apiPost(`/api/content/${contentId}/like`);
      } else {
        await apiDelete(`/api/content/${contentId}/like`);
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
