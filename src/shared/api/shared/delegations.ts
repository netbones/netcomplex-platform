/**
 * Delegation Shared API
 *
 * Cross-cutting delegation utilities consumed by all delegation route handlers.
 */

import { eq } from 'drizzle-orm';
import { db } from '@api/server';
import { delegationActions } from '@schema/delegation-actions';

export type DelegationActionType =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'revoked'
  | 'expired'
  | 'scope_modified'
  | 'token_issued';

/**
 * Log a delegation action to the DelegationAction audit trail.
 * Fire-and-forget unless caller awaits.
 *
 * Every delegation state transition writes a row with actorId, action type,
 * and optional metadata. Append-only — no delete API.
 */
export async function logDelegationAction(params: {
  tenantId: string;
  delegationId: string;
  action: DelegationActionType;
  actorId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const id = `da_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(delegationActions).values({
    id,
    tenantId: params.tenantId,
    delegationId: params.delegationId,
    action: params.action,
    actorId: params.actorId,
    metadata: params.metadata ?? null,
  });
}
