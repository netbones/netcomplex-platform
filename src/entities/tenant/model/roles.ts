/**
 * Pure function that resolves a user's effective role from their identity state.
 *
 * Priority order: AGENT > OWNER > SOLO > RESIDENT.
 * This is a pure function — does NOT depend on loading states, tRPC queries,
 * or any side effects. Callers are responsible for passing resolved booleans.
 */
export function getEffectiveRole(
  isAgent: boolean,
  isPropertyOwner: boolean,
  isSoloSeatHolder: boolean
): 'AGENT' | 'OWNER' | 'SOLO' | 'RESIDENT' {
  if (isAgent) return 'AGENT';
  if (isPropertyOwner) return 'OWNER';
  if (isSoloSeatHolder) return 'SOLO';
  return 'RESIDENT';
}
