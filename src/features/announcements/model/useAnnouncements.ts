'use client';

import { useState, useCallback, useEffect } from 'react';
import { createComponentLogger } from '@shared/lib';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/shared/api/http-client';
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
      const { data } = await apiGet<AnnouncementWithResource[]>(buildUrl());
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
        const { data: result } = await apiPost<AnnouncementWithResource>(
          '/api/announcements',
          data
        );
        // Refresh list after creation
        await fetchAnnouncements();
        return result;
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
        const { data: result } = await apiPatch<AnnouncementWithResource>(
          `/api/announcements/${id}`,
          data
        );
        // Refresh list after update
        await fetchAnnouncements();
        return result;
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
        await apiDelete(`/api/announcements/${id}`);
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
