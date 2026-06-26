// Dispute lifecycle state machine — pure functions, client-safe.
// Valid transitions per ADVISORY-017 §6.

import type { DisputeStatus } from './types';

export const VALID_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'WITHDRAWN'],
  UNDER_REVIEW: ['MEDIATION_OFFERED', 'FORMAL_RULING', 'WITHDRAWN'],
  MEDIATION_OFFERED: ['MEDIATION_ACTIVE', 'FORMAL_RULING', 'WITHDRAWN'],
  MEDIATION_ACTIVE: ['MEDIATED_RESOLVED', 'FORMAL_RULING', 'WITHDRAWN'],
  MEDIATED_RESOLVED: ['RESOLVED', 'WITHDRAWN'],
  FORMAL_RULING: ['RESOLVED', 'ESCALATED_CSOS', 'WITHDRAWN'],
  RESOLVED: [],
  WITHDRAWN: [],
  ESCALATED_CSOS: ['CSOS_CLOSED'],
  CSOS_CLOSED: [],
};

const TERMINAL_STATUSES: ReadonlySet<DisputeStatus> = new Set([
  'RESOLVED',
  'WITHDRAWN',
  'CSOS_CLOSED',
]);

export function isTerminalStatus(status: DisputeStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canTransition(from: DisputeStatus, to: DisputeStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
