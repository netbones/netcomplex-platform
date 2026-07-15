/**
 * Next.js instrumentation hook — runs once per server process cold start.
 *
 * Registers the domain-event achievement listener (bd-q0x8). The typed
 * `node:events` bus in `src/shared/api/events/emitter.ts` is process-local,
 * so the listener MUST be registered in the same runtime that emits. This
 * hook guarantees the handler is wired on every lambda cold start.
 *
 * NOTE: this is the M5 stop-the-bleeding fix. The durable cross-request
 * topology (outbox + dispatcher) is tracked in TOPOLOGY.md (Lane A).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Importing the module runs its top-level `onEvent(...)` registrations.
    await import('@shared/api/achievements');
  }
}
