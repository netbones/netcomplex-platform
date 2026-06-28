/**
 * Agent Token Utilities
 *
 * JWT-based token lifecycle: sign → hash → store → verify → validate → revoke.
 * Uses ES256 (asymmetric) with a generated keypair — future-proof for wallet/Web3.
 * Public key can be published for cross-service validation without secret exposure.
 *
 * Credential abstraction: CredentialVerifier interface allows pluggable verifiers
 * (JWT, wallet signature, on-chain proof) without changing the resolution pipeline.
 */

import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify, generateKeyPair } from 'jose';
import { eq } from 'drizzle-orm';
import { agentTokens } from '@schema/agent-tokens';
import type {
  AgentTokenPayload,
  AgentScopeConfig,
  TokenValidationResult,
  AgentCallerType,
} from '@entities/agent';

let KEY_PAIR: { privateKey: CryptoKey; publicKey: CryptoKey } | null = null;

async function getKeyPair(): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
  if (KEY_PAIR) return KEY_PAIR;
  KEY_PAIR = await generateKeyPair('ES256');
  return KEY_PAIR;
}

const ALGORITHM = 'ES256';

// ═══════════════════════════════════════════════════════════════
// CREDENTIAL VERIFIER ABSTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Credential verifier interface — pluggable verification for different credential types.
 * Future verifiers (wallet signature, on-chain proof) implement this interface.
 * Phase 112/113 adds: wallet_es256k, onchain_eth.
 */
export interface CredentialVerifier {
  readonly type: string;
  verify(rawCredential: string): Promise<TokenValidationResult>;
}

/**
 * JWT verifier (ES256).
 * Current implementation — server holds private key, public key verifies.
 */
export const jwtVerifier: CredentialVerifier = {
  type: 'jwt_es256',
  async verify(rawCredential: string): Promise<TokenValidationResult> {
    try {
      const { publicKey } = await getKeyPair();
      const { payload } = await jwtVerify(rawCredential, publicKey, {
        algorithms: [ALGORITHM],
      });

      const decoded = payload as unknown as AgentTokenPayload;

      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, payload: null, reason: 'expired' };
      }

      const { db } = await import('@api/server');
      const tokenHashValue = hashToken(rawCredential);

      const [stored] = await db
        .select()
        .from(agentTokens)
        .where(eq(agentTokens.tokenHash, tokenHashValue))
        .limit(1);

      if (!stored) {
        return { valid: false, payload: null, reason: 'not_found' };
      }

      if (stored.revokedAt) {
        return { valid: false, payload: null, reason: 'revoked' };
      }

      // Update last used timestamp (fire-and-forget)
      db.update(agentTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(agentTokens.id, stored.id))
        .execute()
        .catch(() => {});

      return { valid: true, payload: decoded };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('expired') || message.includes('exp')) {
        return { valid: false, payload: null, reason: 'expired' };
      }
      return { valid: false, payload: null, reason: 'invalid_signature' };
    }
  },
};

/**
 * Select the appropriate verifier for a given credential type.
 * Writes to console on unknown types for observability — Pino structured log
 * integration follows in a follow-up audit phase.
 */
export async function selectVerifier(credentialType: string): Promise<CredentialVerifier> {
  switch (credentialType) {
    case 'jwt_es256':
      return jwtVerifier;
    // Future: case 'wallet_es256k': return walletVerifier;
    // Future: case 'onchain_eth': return onChainVerifier;
    default:
      console.warn(
        `[agent-gateway] Unknown credential type: ${credentialType}, falling back to jwt_es256`
      );
      return jwtVerifier;
  }
}

// ═══════════════════════════════════════════════════════════════
// TOKEN LIFECYCLE
// ═══════════════════════════════════════════════════════════════

/**
 * Sign a new agent token JWT.
 * Returns the raw JWT string (to be hashed and stored).
 * Uses ES256 asymmetric keypair — private key signs.
 */
export async function signAgentToken(params: {
  agentId: string;
  tokenId: string;
  tenantId: string;
  callerType: AgentCallerType;
  scope: AgentScopeConfig;
  delegationId?: string;
  expiresInSeconds: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const { privateKey } = await getKeyPair();

  const payload: Omit<AgentTokenPayload, 'iss'> = {
    sub: params.agentId,
    jti: params.tokenId,
    iat: now,
    exp: now + params.expiresInSeconds,
    tenantId: params.tenantId,
    callerType: params.callerType,
    scope: params.scope,
    delegationId: params.delegationId,
  };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuer(params.tenantId)
    .setJti(params.tokenId)
    .setSubject(params.agentId)
    .setIssuedAt(now)
    .setExpirationTime(now + params.expiresInSeconds)
    .sign(privateKey);
}

/**
 * Hash a raw token string for storage in AgentToken.tokenHash.
 * Uses sha256 — consistent, irreversible, fast.
 * Called once at token creation; never used for verification (jose handles that).
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Validate an agent token end-to-end: verify signature, check expiry,
 * look up in DB for revocation/non-existence.
 *
 * Delegates to the CredentialVerifier corresponding to the stored credentialType
 * (default: jwt_es256). Abstracted so Phase 112/113 can add wallet/on-chain
 * verifiers without touching the resolution pipeline.
 */
export async function validateToken(
  rawToken: string,
  credentialType?: string
): Promise<TokenValidationResult> {
  const verifier = await selectVerifier(credentialType ?? 'jwt_es256');
  return verifier.verify(rawToken);
}

/**
 * Parse the X-Agent-Token header from a request.
 * Returns the raw token string or null.
 */
export function parseAgentToken(request: Request): string | null {
  const header = request.headers.get('x-agent-token');
  if (!header) return null;

  // Support "Bearer <token>" or raw token
  const bearerMatch = header.match(/^Bearer\s+(.+)$/i);
  return bearerMatch ? bearerMatch[1] : header.trim();
}

/**
 * Legacy wrapper — verify and decode a token without DB lookup.
 * Used in tests and for pure JWT validation.
 */
export async function verifyAndDecodeToken(rawToken: string): Promise<AgentTokenPayload> {
  const { publicKey } = await getKeyPair();
  const { payload } = await jwtVerify(rawToken, publicKey, {
    algorithms: [ALGORITHM],
  });
  return payload as unknown as AgentTokenPayload;
}
