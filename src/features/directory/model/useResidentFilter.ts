'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Resident, UseResidentFilterReturn, ViewMode } from '@entities/directory';
import { DEBOUNCE_DELAY_MS, DEFAULT_PAGE_LIMIT } from '@entities/directory';
import { apiGet } from '@/shared/api/http-client';

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
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStreet !== 'All Streets') params.street = filterStreet;

      if (filterType !== 'All Residents') {
        const filterValue = filterType.replace(' Members', '').replace('s', '');
        if (filterValue === 'Board') {
          params.role = 'BOARD';
        } else if (filterValue === 'Committee') {
          params.role = 'COMMITTEE';
        } else if (filterValue === 'Owner') {
          params.residencyType = 'OWNER';
        } else if (filterValue === 'Renter') {
          params.residencyType = 'RENTER';
        }
      }

      const { data, meta } = await apiGet<Resident[]>(apiEndpoint, params);

      if (data && typeof data === 'object' && 'users' in data) {
        setResidents((data as { users: Resident[] }).users);
      } else if (Array.isArray(data)) {
        setResidents(data as Resident[]);
      } else {
        setResidents([]);
      }
      setTotal((meta as { total?: number })?.total ?? (Array.isArray(data) ? data.length : 0));
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
