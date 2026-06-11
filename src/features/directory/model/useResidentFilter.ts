'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Resident, UseResidentFilterReturn, ViewMode } from '@entities/directory';
import { DEBOUNCE_DELAY_MS, DEFAULT_PAGE_LIMIT } from '@entities/directory';
import { apiGet } from '@api/shared';

export interface UseResidentFilterOptions {
  defaultLimit?: number;
  defaultPage?: number;
  apiEndpoint?: string;
}

export function useResidentFilter(options: UseResidentFilterOptions = {}): UseResidentFilterReturn {
  const {
    defaultLimit = DEFAULT_PAGE_LIMIT,
    defaultPage = 1,
    apiEndpoint = '/api/users',
  } = options;

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Residents');
  const [filterStreet, setFilterStreet] = useState('All Streets');
  const [page, setPage] = useState(defaultPage);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const limit = defaultLimit;

  const handleSetPage = useCallback((value: number | ((p: number) => number)) => {
    setPage(prev => (typeof value === 'function' ? value(prev) : value));
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterStreet !== 'All Streets') params.set('street', filterStreet);
      params.set('page', String(page));
      params.set('limit', String(limit));

      if (filterType !== 'All Residents') {
        const filterValue = filterType.replace(' Members', '').replace('s', '');
        if (filterValue === 'Board') {
          params.set('role', 'BOARD');
        } else if (filterValue === 'Committee') {
          params.set('role', 'COMMITTEE');
        } else if (filterValue === 'Owner') {
          params.set('residentType', 'OWNER');
        } else if (filterValue === 'Renter') {
          params.set('residentType', 'RENTER');
        }
      }

      const queryStr = params.toString();
      const url = queryStr ? `${apiEndpoint}?${queryStr}` : apiEndpoint;
      const body = await apiGet<Record<string, unknown>>(url);

      if (body && typeof body === 'object' && 'users' in body) {
        setResidents((body as { users: Resident[] }).users);
        setTotal((body as { total?: number }).total ?? 0);
      } else if (Array.isArray(body)) {
        setResidents(body as Resident[]);
        setTotal(body.length);
      } else {
        setResidents([]);
      }
    } catch {
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStreet, page, filterType, apiEndpoint, limit]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const refetch = useCallback(() => {
    fetchResidents();
  }, [fetchResidents]);

  const filteredCount = filterType !== 'All Residents' ? residents.length : total;
  const totalPages = Math.ceil(total / limit);

  return {
    residents,
    loading,
    searchQuery,
    filterType,
    filterStreet,
    page,
    total,
    limit,
    viewMode,
    setSearchQuery,
    setFilterType,
    setFilterStreet,
    setPage: handleSetPage,
    setViewMode,
    filteredCount,
    totalPages,
    refetch,
  };
}
