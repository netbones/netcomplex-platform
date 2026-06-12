'use client';

import { useState, useEffect } from 'react';
import type { PlatformPageFlags } from '@/entities/tenant/api/flags/platform-flags';
import { apiGet } from '@api/shared';

export function usePageFlags() {
  const [flags, setFlags] = useState<PlatformPageFlags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFlags() {
      try {
        const data = await apiGet<{ flags: PlatformPageFlags }>('/api/flags');
        setFlags(data.flags);
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
