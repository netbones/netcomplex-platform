import { describe, it, expect } from 'vitest';
import {
  InternalSignatureAdapter,
  SignatureError,
  signWithInternal,
  verifyInternalSignature,
  getProvider as getInternalProvider,
} from '@/features/proxy-vote/server/signature/internal-adapter';
import { signatureEvidenceSchema } from '@/features/proxy-vote/model/proxy-vote.zod';
import type { SignatureEvidence } from '@/features/proxy-vote/model/types';

/**
 * TDD tests for InternalSignatureAdapter (plan 125-04, task 01).
 *
 * Verifies:
 *  - sign('draw', { signatureDataUrl }) returns INTERNAL draw evidence with
 *    non-empty base64 PNG, ISO 8601 timestamp, typedName undefined.
 *  - sign('type', { typedName }) returns INTERNAL type evidence with the
 *    typed name set, signatureDataUrl undefined.
 *  - sign('draw', { signatureDataUrl: '' }) throws SignatureError.
 *  - sign('type', { typedName: '' }) throws SignatureError (message
 *    contains 'typedName required').
 *  - verify(validDrawEvidence) → true.
 *  - verify(validTypeEvidence) → true.
 *  - verify() rejects mismatched mode → false.
 *  - verify(null) → false.
 *  - Evidence output passes signatureEvidenceSchema.parse() (Zod validation).
 *  - Convenience wrappers signWithInternal / verifyInternalSignature /
 *    getProvider behave identically and produce 'INTERNAL' provider literal.
 */

describe('InternalSignatureAdapter (plan 125-04 task 01)', () => {
  const VALID_PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  describe('sign() — draw mode', () => {
    it('returns INTERNAL draw evidence with non-empty base64 and ISO timestamp', async () => {
      const adapter = new InternalSignatureAdapter();
      const evidence = await adapter.sign('draw', { signatureDataUrl: VALID_PNG_DATA_URL });

      expect(evidence.provider).toBe('INTERNAL');
      expect(evidence.mode).toBe('draw');
      expect(evidence.signatureDataUrl).toBe(VALID_PNG_DATA_URL);
      expect(evidence.typedName).toBeUndefined();
      expect(typeof evidence.timestamp).toBe('string');
      // ISO 8601 round-trip — Date can re-parse the timestamp string.
      expect(Number.isFinite(Date.parse(evidence.timestamp))).toBe(true);
    });

    it('output passes signatureEvidenceSchema.parse()', async () => {
      const adapter = new InternalSignatureAdapter();
      const evidence = await adapter.sign('draw', { signatureDataUrl: VALID_PNG_DATA_URL });
      const parsed = signatureEvidenceSchema.parse(evidence);
      expect(parsed.provider).toBe('INTERNAL');
    });
  });

  describe('sign() — type mode', () => {
    it('returns INTERNAL type evidence with typedName set and no dataUrl', async () => {
      const adapter = new InternalSignatureAdapter();
      const evidence = await adapter.sign('type', { typedName: 'John Smith' });

      expect(evidence.provider).toBe('INTERNAL');
      expect(evidence.mode).toBe('type');
      expect(evidence.typedName).toBe('John Smith');
      expect(evidence.signatureDataUrl).toBeUndefined();
      expect(typeof evidence.timestamp).toBe('string');
      expect(Number.isFinite(Date.parse(evidence.timestamp))).toBe(true);
    });
  });

  describe('sign() — rejection cases', () => {
    it('throws SignatureError for empty draw signatureDataUrl', async () => {
      const adapter = new InternalSignatureAdapter();
      await expect(adapter.sign('draw', { signatureDataUrl: '' })).rejects.toBeInstanceOf(
        SignatureError
      );
    });

    it('throws SignatureError with "typedName required" for empty typedName', async () => {
      const adapter = new InternalSignatureAdapter();
      await expect(adapter.sign('type', { typedName: '' })).rejects.toThrow(/typedName required/);
    });
  });

  describe('verify()', () => {
    it('returns true for valid draw evidence', async () => {
      const adapter = new InternalSignatureAdapter();
      const evidence = await adapter.sign('draw', { signatureDataUrl: VALID_PNG_DATA_URL });
      expect(await adapter.verify(evidence)).toBe(true);
    });

    it('returns true for valid type evidence', async () => {
      const adapter = new InternalSignatureAdapter();
      const evidence = await adapter.sign('type', { typedName: 'John Smith' });
      expect(await adapter.verify(evidence)).toBe(true);
    });

    it('returns false when mode mismatches evidence', async () => {
      const adapter = new InternalSignatureAdapter();
      const drawEvidence = await adapter.sign('draw', { signatureDataUrl: VALID_PNG_DATA_URL });
      const tampered: SignatureEvidence = { ...drawEvidence, mode: 'type' } as SignatureEvidence;
      expect(await adapter.verify(tampered)).toBe(false);
    });

    it('returns false for null evidence', async () => {
      const adapter = new InternalSignatureAdapter();
      // Cast through unknown — the public verify() contract accepts null per
      // threat-model mitigation: "null/empty evidence → false".
      expect(await adapter.verify(null as unknown as SignatureEvidence)).toBe(false);
    });
  });

  describe('convenience wrappers', () => {
    it('signWithInternal() delegates to a fresh adapter instance', async () => {
      const evidence = await signWithInternal('draw', { signatureDataUrl: VALID_PNG_DATA_URL });
      expect(evidence.provider).toBe('INTERNAL');
      expect(evidence.mode).toBe('draw');
      expect(evidence.signatureDataUrl).toBe(VALID_PNG_DATA_URL);
    });

    it('verifyInternalSignature() returns true for valid evidence', async () => {
      const evidence = await signWithInternal('type', { typedName: 'John Smith' });
      expect(await verifyInternalSignature(evidence)).toBe(true);
    });

    it('getProvider() returns "INTERNAL"', () => {
      expect(getInternalProvider()).toBe('INTERNAL');
    });
  });
});
