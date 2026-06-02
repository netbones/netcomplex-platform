'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Tracks the lifecycle of saves fired by the survey editor.
 *
 * - `saving` while at least one request is in flight
 * - `saved` briefly (2s) after the last request resolves
 * - `error` if the most recent request failed
 * - `idle` otherwise
 *
 * Also tracks `dirty` — set by the caller when a local edit happens
 * that hasn't yet been flushed by a save. Resets to false when a
 * save completes successfully.
 */
export function useSaveStatus() {
  const [state, setState] = useState<SaveState>('idle');
  const [dirty, setDirty] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inflightRef = useRef(0);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark a change as pending a save. Caller invokes this on every edit.
  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const beginSave = useCallback(() => {
    inflightRef.current += 1;
    setState('saving');
    setErrorMessage(null);
  }, []);

  const endSave = useCallback((ok: boolean, errMsg?: string) => {
    inflightRef.current = Math.max(0, inflightRef.current - 1);

    if (inflightRef.current > 0) {
      // More requests pending — keep state as "saving"
      return;
    }

    if (ok) {
      setDirty(false);
      setErrorMessage(null);
      setState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setState('idle'), 2000);
    } else {
      setErrorMessage(errMsg ?? 'Failed to save');
      setState('error');
    }
  }, []);

  // Clear the "saved" timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { state, dirty, errorMessage, markDirty, beginSave, endSave };
}
