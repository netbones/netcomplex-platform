/**
 * Signature provider adapter contract (plan 125-04, task 02; updated 126-02).
 *
 * Every signature source — INTERNAL (draw/type), DOCUSIGN, ADOBE_SIGN, PGP,
 * GOV_EID — must conform to this interface. Phase 125 ships only the
 * INTERNAL adapter (`internal-adapter.ts`); the four external providers
 * are schema-reserved but code-deferred. Adding a new provider later means
 * implementing this interface and registering it in `registry.ts` —
 * callers never change.
 *
 * Note: PLAN 126-02 narrowed SignatureProvider from 8 -> 5 values
 * (dropped PASSKEY/NOSTR/LIGHTNING). Identity-bound signage now flows
 * through INTERNAL + Credential.credentialId; WebAuthn/PGP-style flows
 * were deferred per ADVISORY-034-SUPPLEMENTAL-1 Gate S1.
 *
 * The discriminated `SignatureEvidence` shape lives in
 * `model/types.ts`; an adapter's `sign()` output must pass the
 * matching Zod `signatureEvidenceSchema` discriminated-union member.
 */

import type { SignatureEvidence, SignatureProvider } from '../../model/types';

/**
 * Input for {@link SignatureProviderAdapter.sign}. Mirrors the two INTERNAL
 * modes (draw → base64 PNG, type → typed name). External providers will
 * accept a different shape via the same `sign()` signature; the
 * adapter is responsible for translating its own provider-specific request
 * into a `SignatureEvidence`.
 */
export interface SignInput {
  /** Non-empty `data:image/png;base64,…` produced by react-signature-canvas. Required when mode = 'draw'. */
  signatureDataUrl?: string;
  /** Non-empty typed name. Required when mode = 'type'. */
  typedName?: string;
  /** Opaque provider-specific payload (e.g., LNbits bolt11, Nostr event id). Optional for INTERNAL. */
  providerPayload?: unknown;
}

export interface SignatureProviderAdapter {
  /**
   * Produce a {@link SignatureEvidence} envelope for the provider.
   *
   * Implementations MUST:
   *  - Set `provider` to the value returned by `getProvider()`.
   *  - Set `timestamp` to an ISO 8601 string (UTC recommended).
   *  - Reject empty/invalid input by throwing `SignatureError` (from
   *    `./internal-adapter`). Threat model mitigation: prevents an empty
   *    canvas or empty typed name from being stored as "evidence".
   *  - Produce output that passes `signatureEvidenceSchema.parse()`.
   */
  sign(mode: 'draw' | 'type', input: SignInput): Promise<SignatureEvidence>;

  /**
   * Verify a stored evidence envelope. Returns `true` when the evidence is
   * structurally intact AND (for external providers) cryptographically
   * valid; `false` otherwise. This call MUST NEVER throw — call sites
   * (tRPC signProxy mutation, plan 125-05) use it as a boolean gate.
   */
  verify(evidence: SignatureEvidence | null | undefined): Promise<boolean>;

  /** Identifier of the provider this adapter implements. */
  getProvider(): SignatureProvider;
}
