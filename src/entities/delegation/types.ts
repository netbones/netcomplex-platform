/**
 * Delegation Domain — Types
 *
 * Phase 111-04: Canonical types for the delegation domain.
 * Consumed by widget components and API hooks.
 */

/** Delegation as returned by trpc.delegations.listDelegations */
export interface DelegationListItem {
  id: string;
  propertyId: string;
  propertyAddress: string | null;
  agentId: string;
  agentName: string | null;
  agentEmail: string | null;
  grantedById: string;
  grantedByName: string | null;
  permissions: string[];
  status: DelegationStatusFilter;
  startedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  /** Whether the resident blocked this agent's contact scope. */
  blocked?: boolean;
}

export type DelegationStatusFilter = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

/** Parameters for listing delegations */
export interface DelegationListParams {
  propertyId?: string;
  status?: DelegationStatusFilter;
  agentId?: string;
}

/** Payload for blocking/unblocking a delegation's communication:contact_occupant scope */
export interface DelegationBlockPayload {
  id: string;
  blocked: boolean;
}

/** Audit log entry */
export interface DelegationAuditEntry {
  id: string;
  delegationId: string;
  action: string;
  actorId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Human-readable labels for the canonical AgentScope taxonomy.
 * Used by the DelegationWidget to display scopes clearly.
 */
export const SCOPE_LABELS: Record<string, string> = {
  'maintenance:read': 'View maintenance requests',
  'maintenance:create': 'Raise maintenance requests',
  'maintenance:coordinate': 'Coordinate with occupants on maintenance',
  'maintenance:manage': 'Manage maintenance (assign, close)',
  'maintenance:approve': 'Approve maintenance costs',
  'tenancy:read': 'View occupancy & lease dates',
  'tenancy:manage': 'Manage tenancy & renewals',
  'tenancy:invite': 'Invite new tenants',
  'inspection:schedule': 'Schedule inspections',
  'inspection:record': 'Record inspection findings',
  'inspection:view': 'View inspection history',
  'listing:read': 'View property listing',
  'listing:manage': 'Edit listing details',
  'listing:market': 'Publish & market property',
  'communication:contact_occupant': 'Message occupants directly',
  'communication:notify_occupant': 'Send notifications to occupants',
  'financials:read': 'View financial records',
  'financials:collect': 'Record payments',
  'documents:read': 'View property documents',
  'documents:upload': 'Upload property documents',
};
