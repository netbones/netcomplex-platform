/**
 * Agent Identity & Token Types
 *
 * Phase 111-01: Canonical types for the agent gateway.
 * AgentToken complements (does not replace) AgentAccess.
 * AgentAccess = the delegation grant (who delegated what to whom).
 * AgentToken = the issued credential (what scope X-agent token Y carries).
 */

// ═══════════════════════════════════════════════════════════════
// AGENT IDENTITY
// ═══════════════════════════════════════════════════════════════

/**
 * Caller type — discriminates the kind of entity making the request.
 * Mirrors Phase 110 AccessInput.caller with finer granularity.
 */
export type AgentCallerType = 'human' | 'ai' | 'cron' | 'delegated';

/**
 * Agent union type — each variant has a distinct auth mechanism.
 * - HumanAgent: authenticated via Better Auth session cookie
 * - AIAgent: authenticated via JWT bearer token (X-Agent-Token header)
 * - CronAgent: authenticated via shared secret or internal service token
 * - DelegatedProvider: authenticated via delegation token (JWT issued on delegation acceptance)
 */
export interface AgentBase {
  /** Tenant-scoped agent identity. */
  tenantId: string;
  /** User or service account id. */
  agentId: string;
  /** Discriminant for type narrowing. */
  callerType: AgentCallerType;
}

export interface HumanAgent extends AgentBase {
  callerType: 'human';
  sessionUserId: string;
}

export interface AIAgent extends AgentBase {
  callerType: 'ai';
  tokenId: string;
}

export interface CronAgent extends AgentBase {
  callerType: 'cron';
  jobId: string;
}

export interface DelegatedProviderAgent extends AgentBase {
  callerType: 'delegated';
  delegationId: string;
  propertyId: string;
}

export type Agent = HumanAgent | AIAgent | CronAgent | DelegatedProviderAgent;

// ═══════════════════════════════════════════════════════════════
// TOKEN TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Structured scope assigned to an agent token.
 * Stored as jsonb in AgentToken.scope.
 */
export interface AgentScope {
  /** Allowed space IDs from the SPACES registry. */
  spaces: string[];
  /** Allowed page keys (camelCase, matching page route slugs). */
  pages: string[];
  /** Allowed API endpoint patterns. */
  apis: string[];
  /** Allowed data domains for query projection. */
  dataDomains: string[];
  /** Allowed action keys. */
  actions: string[];
  /** Maximum token validity duration in seconds. */
  maxDuration: number;
}

/**
 * JWT payload for agent tokens.
 *
 * Signed with ES256 using an asymmetric keypair.
 * Stored in AgentToken.tokenHash as sha256(rawToken).
 */
export interface AgentTokenPayload {
  /** Token subject — agentId (user or service account id). */
  sub: string;
  /** Token issuer — platform identifier. */
  iss: string;
  /** Expiration time (Unix seconds). */
  exp: number;
  /** Issued-at time (Unix seconds). */
  iat: number;
  /** JWT ID — matches AgentToken.id. */
  jti: string;
  /** Agent caller type. */
  callerType: AgentCallerType;
  /** Resolved scope at time of issuance. */
  scope: AgentScope;
  /** Delegation ID (for DelegatedProviderAgent tokens). */
  delegationId?: string;
  /** Tenant ID. */
  tenantId: string;
}

// ═══════════════════════════════════════════════════════════════
// RESOLUTION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Effective scope after intersection with tenant gating and feature flags.
 * Consumed by Phase 110's AccessResolution.agent field.
 */
export interface EffectiveScope {
  /** Resolved scope after intersection. */
  scope: AgentScope;
  /** Token expiration timestamp (ISO 8601). */
  expiresAt: string;
  /** Token ID for audit trail. */
  tokenId: string;
  /** Delegation ID if this token was issued from a delegation. */
  delegationId: string | null;
}

/**
 * Result of token validation.
 */
export interface TokenValidationResult {
  /** Was the token valid? */
  valid: boolean;
  /** Decoded payload if valid. */
  payload: AgentTokenPayload | null;
  /** Reason for invalidation (expired, revoked, not_found, invalid_signature). */
  reason?: 'expired' | 'revoked' | 'not_found' | 'invalid_signature' | 'missing_header';
}
