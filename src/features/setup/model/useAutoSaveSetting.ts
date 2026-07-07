'use client';

import { useRef, useCallback, useState } from 'react';

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: number | null;
  error: string | null;
}

/**
 * Debounced auto-save hook for setup settings.
 *
 * Provides `saveSetting(key, value)` which debounces PATCH requests to
 * `/api/platform/setup/settings` by 500ms. Shows saving status, handles
 * errors, and supports optimistic local state updates.
 *
 * Usage:
 * ```tsx
 * const { saveSetting, isSaving, lastSaved, error } = useAutoSaveSetting(tenantId);
 * // Call on input blur:
 * <input onBlur={e => saveSetting('launch.name', e.target.value)} />
 * ```
 */
export function useAutoSaveSetting(tenantId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ key: string; value: unknown } | null>(null);

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  const saveSetting = useCallback(
    (key: string, value: unknown) => {
      // Track pending save for optimistic updates
      pendingRef.current = { key, value };

      // Clear any previously queued save
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Show saving indicator
      setState(prev => ({ ...prev, isSaving: true, error: null }));

      // Debounce 500ms before firing the PATCH
      timerRef.current = setTimeout(async () => {
        const pending = pendingRef.current;
        if (!pending) return;

        try {
          const res = await fetch('/api/platform/setup/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId,
              key: pending.key,
              value: pending.value,
            }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({ error: 'Save failed' }));
            throw new Error(body.error || `Save failed (${res.status})`);
          }

          pendingRef.current = null;

          setState({
            isSaving: false,
            lastSaved: Date.now(),
            error: null,
          });
        } catch (err) {
          pendingRef.current = null;

          setState({
            isSaving: false,
            lastSaved: null,
            error: err instanceof Error ? err.message : 'Save failed',
          });
        }
      }, 500);
    },
    [tenantId]
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    saveSetting,
    isSaving: state.isSaving,
    lastSaved: state.lastSaved,
    error: state.error,
    clearError,
  };
}
