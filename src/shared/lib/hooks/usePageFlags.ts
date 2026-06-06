'use client';

import { useState, useEffect } from 'react';
import { type PlatformPageFlags } from '@entities/tenant';

export function usePageFlags() {
  const [flags, setFlags] = useState<PlatformPageFlags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFlags() {
      try {
        const response = await fetch('/api/flags');
        if (!response.ok) {
          throw new Error('Failed to fetch page flags');
        }
        const data = await response.json();
        const unwrapped = data?.data ?? data;
        setFlags(unwrapped.flags);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchFlags();
  }, []);

  return { flags, isLoading, error };
}
