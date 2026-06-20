'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlatformPageFlags } from '../types';

const FLAGS_URL = '/api/flags';

export function usePageFlags() {
  const [flags, setFlags] = useState<PlatformPageFlags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch(`${FLAGS_URL}?_t=${Date.now()}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const data = body?.data ?? body;
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
