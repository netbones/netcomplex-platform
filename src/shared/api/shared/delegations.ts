/**
 * Delegation Shared API
 *
 * Cross-cutting delegation utilities consumed by all delegation route handlers.
 */

import { eq } from 'drizzle-orm';
import { db } from '../db';
import { delegationActions } from '@schema/delegation-actions';
import { createPrefixedId } from '@shared/lib/id';

export type DelegationActionType =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'revoked'
  | 'expired'
  | 'scope_modified'
  | 'token_issued'
  | 'blocked'
  | 'unblocked';

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
  const id = createPrefixedId('da');
  await db.insert(delegationActions).values({
    id,
    tenantId: params.tenantId,
    delegationId: params.delegationId,
    action: params.action,
    actorId: params.actorId,
    metadata: params.metadata ?? null,
  });
}
