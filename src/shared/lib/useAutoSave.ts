'use client';

import { useLocalStorage, useDebounceValue } from 'usehooks-ts';
import { useEffect, useRef, useState } from 'react';

export interface UseAutoSaveOptions<T> {
  /** localStorage key */
  key: string;
  /** Data to persist */
  data: T;
  /** Debounce delay in ms (default: 2000) */
  delay?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Persists data to localStorage with debounce, and exposes a
 * "saved N seconds ago" indicator.
 *
 * Wraps usehooks-ts `useLocalStorage` and `useDebounceValue` for
 * SSR-safe persistence and debounced writes.
 *
 * @returns savedData (restored on mount), secondsSinceSave counter, and clearSaved
 */
export function useAutoSave<T>({ key, data, delay = 2000, enabled = true }: UseAutoSaveOptions<T>) {
  const [debouncedData] = useDebounceValue(data, delay);
  const [savedData, setSavedData, removeSavedData] = useLocalStorage<T | null>(key, null);
  const lastSavedAt = useRef<number | null>(null);
  const [secondsSinceSave, setSecondsSinceSave] = useState<number | null>(null);

  // Persist debounced data to localStorage
  useEffect(() => {
    if (!enabled) return;

    try {
      setSavedData(debouncedData);
    } catch (err: unknown) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.code === 22 ||
          err.message.toLowerCase().includes('quota'))
      ) {
        console.warn('[useAutoSave] localStorage quota exceeded — save skipped', err);
        setSecondsSinceSave(null);
        return;
      }
      throw err;
    }

    lastSavedAt.current = Date.now();
    setSecondsSinceSave(0);
  }, [debouncedData, enabled, setSavedData]);

  // Update "saved N seconds ago" indicator every second
  useEffect(() => {
    if (lastSavedAt.current === null) return;

    const interval = setInterval(() => {
      if (lastSavedAt.current !== null) {
        setSecondsSinceSave(Math.floor((Date.now() - lastSavedAt.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearSaved = () => {
    removeSavedData();
  };

  return {
    savedData,
    secondsSinceSave,
    clearSaved,
  };
}
