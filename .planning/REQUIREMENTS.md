# Requirements

This document maps all phase requirements across the project. Each requirement ID is prefixed with the domain abbreviation.

## Phase 111: Agent Gateway

| ID       | Description                                                                                       | Covered By |
| -------- | ------------------------------------------------------------------------------------------------- | ---------- |
| AGENT-01 | AgentToken model persists scoped, expirable, revocable JWT credentials                            | 111-01     |
| AGENT-02 | AgentToken complements (not replaces) AgentAccess                                                 | 111-01     |
| AGENT-03 | AgentAccess.status replaces isActive with DelegationStatus workflow                               | 111-01     |
| AGENT-04 | DelegationAction records every delegation lifecycle event with actor id and metadata              | 111-01     |
| AGENT-05 | AgentPermission enum removed; permissions stored as String[] validated against AgentScopeRegistry | 111-01     |
| AGENT-06 | AgentAccess.originalPermissions captures grant-time permissions; never mutated after creation     | 111-01     |
| AGENT-07 | ResidentDelegation model allows owners to grant renters scoped initiation rights                  | 111-01     |
| AGENT-08 | DelegationAction has @@index([delegationId]) and @@index([tenantId])                              | 111-01     |
| AGENT-09 | User model has back-relations agentTokensAsAgent and agentTokensIssued for AgentToken             | 111-01     |
| AGENT-10 | AGENT_SCOPES and SCOPE_BUNDLES exported from scopes.ts                                            | 111-01     |
| AGENT-11 | POST /api/agent/tokens creates scoped tokens; PATCH revoke invalidates immediately                | 111-01     |
| AGENT-12 | X-Agent-Token header parsed and validated; unknown/expired/revoked tokens return 401              | 111-01     |
| AGENT-13 | Owner can POST /api/properties/[id]/delegate to create a PENDING delegation                       | 111-02     |
| AGENT-14 | Provider can POST /api/delegations/[id]/accept (issues AgentToken)                                | 111-02     |
| AGENT-15 | Provider can POST /api/delegations/[id]/reject                                                    | 111-02     |
| AGENT-16 | Owner can PATCH /api/delegations/[id]/revoke                                                      | 111-02     |
| AGENT-17 | Every delegation status change writes a DelegationAction row                                      | 111-02     |
| AGENT-18 | Unverified providers cannot accept delegations                                                    | 111-02     |
| AGENT-19 | Delegation acceptance auto-issues scoped AgentToken                                               | 111-02     |
| AGENT-20 | Delegation create validates scopes against AGENT_SCOPES registry                                  | 111-02     |
| AGENT-21 | AgentAccess.originalPermissions set at creation time                                              | 111-02     |
| AGENT-22 | Unknown scopes return 400 VALIDATION_ERROR with invalid scopes list                               | 111-02     |
| AGENT-23 | Bundle presets expand server-side to canonical scope arrays                                       | 111-02     |
| AGENT-24 | resolveAgentScope() decodes token, looks up AgentAccess, resolves EffectiveScope                  | 111-03     |
| AGENT-25 | Phase 110 resolveAgent() stub replaced with real resolveAgentScope() call                         | 111-03     |
| AGENT-26 | GET /api/access?caller=agent&token=X returns actual agent scopes                                  | 111-03     |
| AGENT-27 | Scope intersection: agent scope ∩ tenant gating ∩ feature flags                                   | 111-03     |
| AGENT-28 | usePageAccess() hydrates non-null agent field when caller=agent                                   | 111-03     |
| AGENT-29 | Phase 41 canAccess() extended with agent scope dimension                                          | 111-03     |
| AGENT-30 | Delegation domain entity exports types, API client, and React hooks                               | 111-04     |
| AGENT-31 | DelegationWidget shows active delegations with per-agent block toggle                             | 111-04     |
| AGENT-32 | Block removes communication:contact_occupant from permissions                                     | 111-04     |
| AGENT-33 | DelegationAuditLog displays DelegationAction rows reverse-chronological                           | 111-04     |
| AGENT-34 | Widget displays human-readable scope labels via SCOPE_LABELS                                      | 111-04     |
| AGENT-35 | Widget is consumable as standalone embeddable component                                           | 111-04     |
| AGENT-36 | MaintenanceRequest.routingType determines HOA vs LANDLORD routing                                 | 111-05     |
| AGENT-37 | Routing decision automatic based on OccupancyType                                                 | 111-05     |
