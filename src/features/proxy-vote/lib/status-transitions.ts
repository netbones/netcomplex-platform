/**
 * Pure-function status transition machine for ProxyVote workflow.
 *
 * Encodes the 7-status lifecycle from CONTEXT.md §Status Lifecycle:
 *   Draft → WaitingForUpload → WaitingForProxy → PendingHoaReview
 *        ↘ Withdrawn (from {Draft, WaitingForUpload, WaitingForProxy, PendingHoaReview})
 *        ↘ Approved | Rejected (terminal states from PendingHoaReview)
 *
 * Terminal states (Approved, Rejected, Withdrawn) reject all events.
 *
 * This module has no side effects and no external dependencies — it is the
 * single source of truth for valid ProxyStatus transitions. All tRPC mutation
 * procedures (plan 125-05) MUST invoke `transition()` before persisting status
 * changes; doing so protects against workflow bypass via direct DB writes.
 */

export type ProxyStatus =
  | 'Draft'
  | 'WaitingForUpload'
  | 'WaitingForProxy'
  | 'PendingHoaReview'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn';

export type ProxyStatusEvent =
  | 'upload'
  | 'uploadComplete'
  | 'proxyAccepted'
  | 'proxyDeclined'
  | 'approve'
  | 'reject'
  | 'withdraw';

export class ProxyStatusError extends Error {
  constructor(current: ProxyStatus, event: ProxyStatusEvent) {
    super(`Invalid transition: ${current} → ${event}`);
    this.name = 'ProxyStatusError';
  }
}

/**
 * Adjacency map of valid transitions. Each KEY is the current status;
 * the nested object maps each event in that status to its next state.
 *
 * Terminal states (Approved, Rejected, Withdrawn) intentionally have empty
 * maps — every event from a terminal state throws ProxyStatusError.
 */
const TRANSITIONS: Readonly<
  Record<ProxyStatus, Readonly<Partial<Record<ProxyStatusEvent, ProxyStatus>>>>
> = {
  Draft: {
    upload: 'WaitingForUpload',
    withdraw: 'Withdrawn',
  },
  WaitingForUpload: {
    uploadComplete: 'WaitingForProxy',
    withdraw: 'Withdrawn',
  },
  WaitingForProxy: {
    proxyAccepted: 'PendingHoaReview',
    proxyDeclined: 'Withdrawn',
    withdraw: 'Withdrawn',
  },
  PendingHoaReview: {
    approve: 'Approved',
    reject: 'Rejected',
    withdraw: 'Withdrawn',
  },
  Approved: {},
  Rejected: {},
  Withdrawn: {},
};

export function transition(current: ProxyStatus, event: ProxyStatusEvent): ProxyStatus {
  const next = TRANSITIONS[current][event];
  if (next === undefined) {
    throw new ProxyStatusError(current, event);
  }
  return next;
}

export const ALL_PROXY_STATUSES: readonly ProxyStatus[] = [
  'Draft',
  'WaitingForUpload',
  'WaitingForProxy',
  'PendingHoaReview',
  'Approved',
  'Rejected',
  'Withdrawn',
] as const;

export const ALL_PROXY_STATUS_EVENTS: readonly ProxyStatusEvent[] = [
  'upload',
  'uploadComplete',
  'proxyAccepted',
  'proxyDeclined',
  'approve',
  'reject',
  'withdraw',
] as const;

/**
 * Read-only adjacency map exposed for diagnostics, UI rendering, and tests.
 * This is a public, frozen view onto the same data powering `transition()`.
 * Mutating the returned object is a no-op — TypeScript will reject it via
 * `Readonly<>` wrappers.
 */
export type StatusTransitionMap = Readonly<
  Record<ProxyStatus, Readonly<Partial<Record<ProxyStatusEvent, ProxyStatus>>>>
>;

export const statusTransitionMap: StatusTransitionMap = TRANSITIONS;
