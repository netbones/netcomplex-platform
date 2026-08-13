'use client';

import { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { SECURITY_HOLD_CONFIRM_MS } from '@entities/security';

interface HoldPanicButtonProps {
  disabled?: boolean;
  onConfirm: () => void;
}

export function HoldPanicButton({ disabled, onConfirm }: HoldPanicButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const cancelHold = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    startRef.current = null;
    setHolding(false);
    setProgress(0);
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;
    cancelHold();
    setHolding(true);
    startRef.current = performance.now();

    const tick = () => {
      if (startRef.current == null) return;
      const elapsed = performance.now() - startRef.current;
      setProgress(Math.min(100, (elapsed / SECURITY_HOLD_CONFIRM_MS) * 100));
      if (elapsed < SECURITY_HOLD_CONFIRM_MS) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    timerRef.current = window.setTimeout(() => {
      cancelHold();
      onConfirm();
    }, SECURITY_HOLD_CONFIRM_MS);
  }, [cancelHold, disabled, onConfirm]);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className={cn(
        'relative w-full max-w-[280px] mx-auto flex items-center justify-center gap-2.5',
        'bg-red-600 text-white border-none py-4 px-4 text-base font-medium rounded-xl',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        holding && 'ring-4 ring-red-300'
      )}
      aria-label="Hold to send panic alert"
    >
      <span
        className="absolute inset-0 rounded-xl bg-red-800/30 origin-left"
        style={{ transform: `scaleX(${progress / 100})` }}
        aria-hidden
      />
      <AlertTriangle className="relative w-5 h-5" aria-hidden />
      <span className="relative">{holding ? 'Hold…' : 'Panic button'}</span>
    </button>
  );
}
