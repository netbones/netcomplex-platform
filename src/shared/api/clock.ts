let clockOverride: (() => Date) | null = null;

/**
 * Centralized clock for all timestamp generation.
 * Use instead of `new Date()` to enable deterministic testing.
 *
 * In tests:
 *   import { setClock } from '@shared/lib/clock';
 *   setClock(() => new Date('2026-06-21T12:00:00Z'));
 */
export function now(): Date {
  return clockOverride ? clockOverride() : new Date();
}

/**
 * Override the clock with a custom function (for testing).
 * Pass null to reset to the real clock.
 */
export function setClock(fn: (() => Date) | null): void {
  clockOverride = fn;
}
