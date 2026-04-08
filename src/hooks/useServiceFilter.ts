'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ServiceFilterOptions {
  defaultLimit?: number;
  defaultPage?: number;
  apiEndpoint?: string;
}

export interface UseServiceFilterReturn {
  // State
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

  // Setters
  setSearchQuery: (query: string) => void;
  setCategory: (category: string) => void;
  setServiceType: (type: string) => void;
  setVerifiedOnly: (verified: boolean) => void;
  setPage: (page: number) => void;
  setViewMode: (mode: 'grid' | 'list') => void;

  // Computed
  filteredCount: number;
  totalPages: number;

  // Actions
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
  const [category, setCategory] = useState('ALL');
  const [serviceType, setServiceType] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(defaultPage);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const limit = defaultLimit;

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
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
  }, [searchQuery, category, serviceType, verifiedOnly, page, apiEndpoint]);

  useEffect(() => {
    const debounce = setTimeout(fetchServices, searchQuery ? 300 : 0);
    return () => clearTimeout(debounce);
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
    setPage,
    setViewMode,
    filteredCount: services.length,
    totalPages,
    refetch,
  };
}
