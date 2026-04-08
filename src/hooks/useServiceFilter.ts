'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ServiceFilterOptions {
  defaultLimit?: number;
  defaultPage?: number;
  apiEndpoint?: string;
}

export interface UseServiceFilterReturn {
  services: any[];
  loading: boolean;
  searchQuery: string;
  category: string;
  serviceType: string;
  verifiedOnly: boolean;
  page: number;
  total: number;
  limit: number;
  viewMode: 'grid' | 'list';
  setSearchQuery: (query: string) => void;
  setCategory: (category: string) => void;
  setServiceType: (type: string) => void;
  setVerifiedOnly: (verified: boolean) => void;
  setPage: (page: number | ((p: number) => number)) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  filteredCount: number;
  totalPages: number;
  refetch: () => void;
}

export function useServiceFilter(options: ServiceFilterOptions = {}): UseServiceFilterReturn {
  const {
    defaultLimit = 12,
    defaultPage = 1,
    apiEndpoint = '/api/community-services/listings',
  } = options;

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [serviceType, setServiceType] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(defaultPage);

  const handleSetPage = useCallback((value: number | ((p: number) => number)) => {
    setPage(prev => (typeof value === 'function' ? value(prev) : value));
  }, []);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const limit = defaultLimit;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (category !== 'ALL') params.set('category', category);
      if (serviceType !== 'ALL') params.set('type', serviceType);
      if (verifiedOnly) params.set('verified', 'true');
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`${apiEndpoint}?${params}`);
      const data = await res.json();

      if (data.listings) {
        setServices(data.listings || []);
        setTotal(data.pagination?.total || 0);
      } else if (Array.isArray(data)) {
        setServices(data);
        setTotal(data.length);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, serviceType, verifiedOnly, page, apiEndpoint]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const refetch = useCallback(() => {
    fetchServices();
  }, [fetchServices]);

  const totalPages = Math.ceil(total / limit);

  return {
    services,
    loading,
    searchQuery,
    category,
    serviceType,
    verifiedOnly,
    page,
    total,
    limit,
    viewMode,
    setSearchQuery,
    setCategory,
    setServiceType,
    setVerifiedOnly,
    setPage: handleSetPage,
    setViewMode,
    filteredCount: services.length,
    totalPages,
    refetch,
  };
}
