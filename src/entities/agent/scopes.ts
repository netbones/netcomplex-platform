/**
 * Agent Scope Registry — Canonical Platform Delegation Scopes
 *
 * Two-axis model: domain:action
 * Validated at API layer on delegation create and accept.
 * Stored as String[] on AgentAccess.permissions and AgentToken.scope.
 *
 * Governance scope (proxy_vote) deferred to Phase 112+.
 */
export const AGENT_SCOPES = [
  'maintenance:read',
  'maintenance:create',
  'maintenance:coordinate',
  'maintenance:manage',
  'maintenance:approve',
  'tenancy:read',
  'tenancy:manage',
  'tenancy:invite',
  'inspection:schedule',
  'inspection:record',
  'inspection:view',
  'listing:read',
  'listing:manage',
  'listing:market',
  'communication:contact_occupant',
  'communication:notify_occupant',
  'financials:read',
  'financials:collect',
  'documents:read',
  'documents:upload',
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export function validateScopes(requested: string[]): string[] {
  return requested.filter(s => !AGENT_SCOPES.includes(s as AgentScope));
}

export const SCOPE_BUNDLES = {
  'letting-agent': [
    'tenancy:read',
    'tenancy:manage',
    'tenancy:invite',
    'maintenance:read',
    'maintenance:coordinate',
    'listing:read',
    'listing:manage',
    'listing:market',
    'communication:contact_occupant',
    'financials:read',
  ],
  'maintenance-contractor': [
    'maintenance:read',
    'maintenance:coordinate',
    'inspection:view',
    'communication:notify_occupant',
  ],
  inspector: [
    'inspection:schedule',
    'inspection:record',
    'inspection:view',
    'documents:read',
    'maintenance:read',
  ],
  'property-manager': [
    'tenancy:read',
    'tenancy:manage',
    'maintenance:read',
    'maintenance:manage',
    'maintenance:approve',
    'inspection:view',
    'documents:read',
    'documents:upload',
    'financials:read',
  ],
} as const satisfies Record<string, AgentScope[]>;

export type ScopeBundle = keyof typeof SCOPE_BUNDLES;
