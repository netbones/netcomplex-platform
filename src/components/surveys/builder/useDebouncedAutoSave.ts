'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

interface UseDebouncedAutoSaveOptions {
  /** Delay in ms before the actual save fires (default 2000). */
  delay?: number;
  /** The save function — called with the latest value. */
  onSave: (value: string) => void | Promise<void>;
  /**
   * Mark-dirty callback — fired on every edit so the UI can show an
   * "Unsaved changes" indicator.
   */
  onDirty?: () => void;
}

/**
 * Debounce wrapper for TipTap (and other rapid-fire) onChange handlers.
 *
 * Returns a `schedule` function that buffers the most recent value and
 * flushes it via `onSave` after the delay. Each new value resets the
 * timer. Also fires `onDirty` synchronously on every edit so the
 * caller can flip a UI indicator immediately.
 */
export function useDebouncedAutoSave({
  delay = 2000,
  onSave,
  onDirty,
}: UseDebouncedAutoSaveOptions) {
  const latestRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  const flush = useDebounceCallback(
    async () => {
      if (!isDirtyRef.current || latestRef.current === null) return;
      isDirtyRef.current = false;
      const value = latestRef.current;
      await onSave(value);
    },
    delay,
    { leading: false, trailing: true, maxWait: delay * 2 }
  );

  const schedule = useCallback(
    (value: string) => {
      latestRef.current = value;
      isDirtyRef.current = true;
      onDirty?.();
      flush();
    },
    [flush, onDirty]
  );

  // Flush any pending save on unmount
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && latestRef.current !== null) {
        void onSave(latestRef.current);
      }
    };
    // We intentionally only run the cleanup on unmount.
  }, []);

  return { schedule };
}
