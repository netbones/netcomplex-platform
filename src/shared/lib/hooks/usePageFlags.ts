'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlatformPageFlags } from '../types';
import { apiGet } from '@api/shared';

export function usePageFlags() {
  const [flags, setFlags] = useState<PlatformPageFlags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      const data = await apiGet<{ flags: PlatformPageFlags }>('/api/flags');
      setFlags(data.flags);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return { flags, isLoading, error, refetch: fetchFlags };
}
