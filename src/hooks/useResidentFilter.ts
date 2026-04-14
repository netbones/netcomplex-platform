'use client';

import { useState, useEffect, useCallback } from 'react';
import { createComponentLogger } from '@/lib/logging';
import type { Resident } from '@/components/shared/UnifiedResidentCard';

const log = createComponentLogger('useResidentFilter');

export interface UseResidentFilterReturn {
  residents: Resident[];
  loading: boolean;
  searchQuery: string;
  filterType: string;
  filterStreet: string;
  page: number;
  total: number;
  limit: number;
  viewMode: 'grid' | 'list';
  setSearchQuery: (query: string) => void;
  setFilterType: (type: string) => void;
  setFilterStreet: (street: string) => void;
  setPage: (page: number | ((p: number) => number)) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  filteredCount: number;
  totalPages: number;
  refetch: () => void;
}

export interface ResidentFilterOptions {
  defaultLimit?: number;
  defaultPage?: number;
  apiEndpoint?: string;
}

export function useResidentFilter(options: ResidentFilterOptions = {}): UseResidentFilterReturn {
  const { defaultLimit = 6, defaultPage = 1, apiEndpoint = '/api/users' } = options;

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Residents');
  const [filterStreet, setFilterStreet] = useState('All Streets');
  const [page, setPage] = useState(defaultPage);

  const handleSetPage = useCallback((value: number | ((p: number) => number)) => {
    setPage(prev => (typeof value === 'function' ? value(prev) : value));
  }, []);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const limit = defaultLimit;

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
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

      const res = await fetch(`${apiEndpoint}?${params}`);
      const data = await res.json();

      if (data.users) {
        setResidents(data.users || []);
        setTotal(data.total || 0);
      } else if (Array.isArray(data)) {
        setResidents(data);
        setTotal(data.length);
      } else {
        setResidents([]);
      }
    } catch (error) {
      log.error({}, 'Failed to fetch residents', error);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStreet, page, filterType, apiEndpoint]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const refetch = useCallback(() => {
    fetchResidents();
  }, [fetchResidents]);

  const totalPages = Math.ceil(total / limit);
  const filteredCount = filterType !== 'All Residents' ? residents.length : total;

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
