'use client';

import { useState, useEffect } from 'react';
import type { DisputeStatus } from '../model/types';

interface CoolingOffTimerProps {
  coolingOffEndsAt: string | undefined;
  status: DisputeStatus;
}

function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return 'Ready to Submit';
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function CoolingOffTimer({ coolingOffEndsAt, status }: CoolingOffTimerProps) {
  const [remaining, setRemaining] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Only show for DRAFT with future coolingOffEndsAt
    if (status !== 'DRAFT' || !coolingOffEndsAt) {
      setRemaining(null);
      setExpired(false);
      return;
    }

    const endsAt = new Date(coolingOffEndsAt).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = endsAt - now;

      if (diff <= 0) {
        setExpired(true);
        setRemaining(null);
        return;
      }

      setRemaining(formatRemaining(diff));
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [coolingOffEndsAt, status]);

  if (status !== 'DRAFT') return null;
  if (!coolingOffEndsAt) return null;
  if (expired) {
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
        <span className="text-sm font-medium text-emerald-700" role="timer" aria-live="polite">
          Ready to Submit
        </span>
      </div>
    );
  }
  if (!remaining) return null;

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
      <span className="text-xs text-amber-600 block mb-1">Cooling-off period</span>
      <span
        className="text-sm font-mono font-semibold text-amber-700"
        role="timer"
        aria-live="polite"
        aria-label={`Cooling-off period remaining: ${remaining}`}
      >
        {remaining}
      </span>
    </div>
  );
}
