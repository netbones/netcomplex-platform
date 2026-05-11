'use client';

import { useState, useCallback } from 'react';

export type MaintenanceStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_PARTS'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export interface MaintenanceFilters {
  status?: MaintenanceStatus[];
  priority?: MaintenancePriority[];
  category?: string[];
  search?: string;
}

const defaultFilters: MaintenanceFilters = {
  status: [],
  priority: [],
  category: [],
  search: '',
};

export function useMaintenanceFilter(initialFilters: Partial<MaintenanceFilters> = {}) {
  const [filters, setFilters] = useState<MaintenanceFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  const updateFilters = useCallback((updates: Partial<MaintenanceFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleStatus = useCallback((status: MaintenanceStatus) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status?.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...(prev.status || []), status],
    }));
  }, []);

  const togglePriority = useCallback((priority: MaintenancePriority) => {
    setFilters(prev => ({
      ...prev,
      priority: prev.priority?.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...(prev.priority || []), priority],
    }));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      category: prev.category?.includes(category)
        ? prev.category.filter(c => c !== category)
        : [...(prev.category || []), category],
    }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'search') return value && value.length > 0;
    return Array.isArray(value) && value.length > 0;
  });

  return {
    filters,
    updateFilters,
    toggleStatus,
    togglePriority,
    toggleCategory,
    setSearch,
    clearFilters,
    hasActiveFilters,
  };
}
