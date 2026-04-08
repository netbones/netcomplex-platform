'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ResidentFilterOptions {
  defaultLimit?: number;
  defaultPage?: number;
  apiEndpoint?: string;
}

export interface UseResidentFilterReturn {
  // State
  residents: any[];
  loading: boolean;
  searchQuery: string;
  filterType: string;
  filterStreet: string;
  page: number;
  total: number;
  limit: number;
  viewMode: 'grid' | 'list';

  // Setters
  setSearchQuery: (query: string) => void;
  setFilterType: (type: string) => void;
  setFilterStreet: (street: string) => void;
  setPage: (page: number) => void;
  setViewMode: (mode: 'grid' | 'list') => void;

  // Computed
  filteredCount: number;
  totalPages: number;

  // Actions
  refetch: () => void;
}

export function useResidentFilter(options: ResidentFilterOptions = {}): UseResidentFilterReturn {
  const { defaultLimit = 6, defaultPage = 1, apiEndpoint = '/api/users' } = options;

  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Residents');
  const [filterStreet, setFilterStreet] = useState('All Streets');
  const [page, setPage] = useState(defaultPage);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const limit = defaultLimit;

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterStreet !== 'All Streets') params.set('street', filterStreet);
      params.set('page', String(page));
      params.set('limit', String(limit));

      // Pass role filter to API for BOARD/COMMITTEE/OWNER/RENTER
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
      console.error('Failed to fetch residents:', error);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStreet, page, filterType, apiEndpoint]);

  useEffect(() => {
    const debounce = setTimeout(fetchResidents, searchQuery ? 300 : 0);
    return () => clearTimeout(debounce);
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
    setPage,
    setViewMode,
    filteredCount,
    totalPages,
    refetch,
  };
}
