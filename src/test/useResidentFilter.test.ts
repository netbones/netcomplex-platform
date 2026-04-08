import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useResidentFilter } from '../hooks/useResidentFilter';

/*
 * useResidentFilter Hook Tests
 * =============================
 * Tests for the resident filter hook functionality.
 */

describe('useResidentFilter', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [], total: 0 }),
        }) as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useResidentFilter());

    expect(result.current.loading).toBe(true);
    expect(result.current.residents).toEqual([]);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.filterType).toBe('All Residents');
    expect(result.current.filterStreet).toBe('All Streets');
    expect(result.current.page).toBe(1);
    expect(result.current.total).toBe(0);
    expect(result.current.viewMode).toBe('grid');
  });

  it('should accept custom options', () => {
    const { result } = renderHook(() =>
      useResidentFilter({
        defaultLimit: 12,
        defaultPage: 2,
        apiEndpoint: '/api/custom',
      })
    );

    expect(result.current.limit).toBe(12);
    expect(result.current.page).toBe(2);
  });

  it('should update searchQuery when setSearchQuery is called', async () => {
    const { result } = renderHook(() => useResidentFilter());

    act(() => {
      result.current.setSearchQuery('john');
    });

    await waitFor(() => {
      expect(result.current.searchQuery).toBe('john');
    });
  });

  it('should update filterType when setFilterType is called', async () => {
    const { result } = renderHook(() => useResidentFilter());

    act(() => {
      result.current.setFilterType('Board Members');
    });

    await waitFor(() => {
      expect(result.current.filterType).toBe('Board Members');
    });
  });

  it('should update filterStreet when setFilterStreet is called', async () => {
    const { result } = renderHook(() => useResidentFilter());

    act(() => {
      result.current.setFilterStreet('Pagoda Rd');
    });

    await waitFor(() => {
      expect(result.current.filterStreet).toBe('Pagoda Rd');
    });
  });

  it('should update page when setPage is called', async () => {
    const { result } = renderHook(() => useResidentFilter());

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });
  });

  it('should update viewMode when setViewMode is called', () => {
    const { result } = renderHook(() => useResidentFilter());

    act(() => {
      result.current.setViewMode('list');
    });

    expect(result.current.viewMode).toBe('list');
  });

  it('should calculate totalPages correctly', async () => {
    // Mock fetch to return 12 total items with limit 6
    global.fetch = vi.fn().mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [], total: 12 }),
        }) as any
    );

    const { result } = renderHook(() => useResidentFilter({ defaultLimit: 6 }));

    await waitFor(() => {
      expect(result.current.totalPages).toBe(2);
    });
  });

  it('should calculate filteredCount based on filter type', async () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [{ id: '1' }], total: 1 }),
        }) as any
    );

    const { result } = renderHook(() => useResidentFilter());

    act(() => {
      result.current.setFilterType('Board Members');
    });

    await waitFor(() => {
      expect(result.current.filteredCount).toBe(1);
    });
  });

  it('should provide refetch function', () => {
    const { result } = renderHook(() => useResidentFilter());

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should call API with correct parameters on filter change', async () => {
    const fetchSpy = vi.fn().mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [], total: 0 }),
        }) as any
    );
    global.fetch = fetchSpy;

    const { result } = renderHook(() => useResidentFilter({ apiEndpoint: '/api/users' }));

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    // Change filter and wait for debounce
    act(() => {
      result.current.setFilterType('Board Members');
    });

    await waitFor(() => {
      const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0];
      expect(lastCall).toContain('role=BOARD');
    });
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('Network error')));

    const { result } = renderHook(() => useResidentFilter());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.residents).toEqual([]);
    });
  });

  it('should handle empty API response', async () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }) as any
    );

    const { result } = renderHook(() => useResidentFilter());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.residents).toEqual([]);
    });
  });

  it('should use custom apiEndpoint', async () => {
    const fetchSpy = vi.fn().mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [], total: 0 }),
        }) as any
    );
    global.fetch = fetchSpy;

    renderHook(() => useResidentFilter({ apiEndpoint: '/api/custom-users' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
      const callUrl = fetchSpy.mock.calls[0][0];
      expect(callUrl).toContain('/api/custom-users');
    });
  });
});
