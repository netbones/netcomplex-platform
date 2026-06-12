'use client';

import { useState, useCallback, useEffect } from 'react';
import { createComponentLogger } from '@shared/lib';
import type { AnnouncementWithResource } from './types';
import type { AnnouncementFormData } from '@entities/content';

const log = createComponentLogger('useAnnouncements');

interface UseAnnouncementsOptions {
  /** If true, only fetch active (non-expired) announcements */
  activeOnly?: boolean;
  /** Limit number of results (for widget queries) */
  limit?: number;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

interface UseAnnouncementsReturn {
  announcements: AnnouncementWithResource[];
  loading: boolean;
  error: string | null;
  submitting: boolean;
  createAnnouncement: (data: AnnouncementFormData) => Promise<AnnouncementWithResource | null>;
  updateAnnouncement: (
    id: string,
    data: Partial<AnnouncementFormData>
  ) => Promise<AnnouncementWithResource | null>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
  refresh: () => void;
}

export function useAnnouncements(options: UseAnnouncementsOptions = {}): UseAnnouncementsReturn {
  const { activeOnly = false, limit, autoFetch = true } = options;

  const [announcements, setAnnouncements] = useState<AnnouncementWithResource[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (activeOnly) params.set('active', 'true');
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return `/api/announcements${qs ? `?${qs}` : ''}`;
  }, [activeOnly, limit]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) {
        throw new Error(`Failed to fetch announcements: ${res.status}`);
      }
      const body = await res.json();
      const data = body?.data ?? body;
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      log.error({}, 'Failed to fetch announcements', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    if (autoFetch) {
      fetchAnnouncements();
    }
  }, [autoFetch, fetchAnnouncements]);

  const createAnnouncement = useCallback(
    async (data: AnnouncementFormData): Promise<AnnouncementWithResource | null> => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create announcement');
        }

        const body = await res.json();
        const result = body?.data ?? body;
        // Refresh list after creation
        await fetchAnnouncements();
        return result as AnnouncementWithResource;
      } catch (err) {
        log.error({}, 'Failed to create announcement', err);
        setError(err instanceof Error ? err.message : 'Failed to create announcement');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchAnnouncements]
  );

  const updateAnnouncement = useCallback(
    async (
      id: string,
      data: Partial<AnnouncementFormData>
    ): Promise<AnnouncementWithResource | null> => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`/api/announcements/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update announcement');
        }

        const body = await res.json();
        const result = body?.data ?? body;
        // Refresh list after update
        await fetchAnnouncements();
        return result as AnnouncementWithResource;
      } catch (err) {
        log.error({}, 'Failed to update announcement', err);
        setError(err instanceof Error ? err.message : 'Failed to update announcement');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchAnnouncements]
  );

  const deleteAnnouncement = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to delete announcement');
        }
        // Refresh list after deletion
        await fetchAnnouncements();
        return true;
      } catch (err) {
        log.error({}, 'Failed to delete announcement', err);
        setError(err instanceof Error ? err.message : 'Failed to delete announcement');
        return false;
      }
    },
    [fetchAnnouncements]
  );

  return {
    announcements,
    loading,
    error,
    submitting,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refresh: fetchAnnouncements,
  };
}
