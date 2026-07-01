/**
 * Task 3 — Agent token utility tests (RED phase)
 *
 * Tests signAgentToken, hashToken, validateToken, parseAgentToken,
 * verifyAndDecodeToken, and the CredentialVerifier abstraction.
 * Will FAIL because agent-token.ts doesn't exist yet.
 */

import { describe, it, expect } from 'vitest';

describe('signAgentToken', () => {
  it('should be importable', async () => {
    const mod = await import('@shared/lib/agent-token');
    expect(mod.signAgentToken).toBeDefined();
    expect(typeof mod.signAgentToken).toBe('function');
  });
});

describe('hashToken', () => {
  it('should be importable', async () => {
    const mod = await import('@shared/lib/agent-token');
    expect(mod.hashToken).toBeDefined();
    expect(typeof mod.hashToken).toBe('function');
  });
});

describe('parseAgentToken', () => {
  it('should be importable', async () => {
    const mod = await import('@shared/lib/agent-token');
    expect(mod.parseAgentToken).toBeDefined();
    expect(typeof mod.parseAgentToken).toBe('function');
  });
});

describe('validateToken', () => {
  it('should be importable', async () => {
    const mod = await import('@shared/lib/agent-token');
    expect(mod.validateToken).toBeDefined();
    expect(typeof mod.validateToken).toBe('function');
  });
});

describe('verifyAndDecodeToken', () => {
  it('should be importable', async () => {
    const mod = await import('@shared/lib/agent-token');
    expect(mod.verifyAndDecodeToken).toBeDefined();
    expect(typeof mod.verifyAndDecodeToken).toBe('function');
  });
});

describe('hashToken behavior', () => {
  it('should produce consistent sha256 of raw token string', async () => {
    const { hashToken } = await import('@shared/lib/agent-token');
    const token = 'test-raw-token-value';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toBeTypeOf('string');
    expect(hash1.length).toBe(64); // sha256 hex = 64 chars
  });
});

describe('parseAgentToken behavior', () => {
  it('should parse X-Agent-Token header with Bearer prefix', async () => {
    const { parseAgentToken } = await import('@shared/lib/agent-token');
    const req = new Request('http://localhost/test', {
      headers: { 'x-agent-token': 'Bearer my-token-123' },
    });
    expect(parseAgentToken(req)).toBe('my-token-123');
  });

  it('should parse X-Agent-Token header without Bearer prefix', async () => {
    const { parseAgentToken } = await import('@shared/lib/agent-token');
    const req = new Request('http://localhost/test', {
      headers: { 'x-agent-token': 'raw-token-value' },
    });
    expect(parseAgentToken(req)).toBe('raw-token-value');
  });

  it('should return null when header is missing', async () => {
    const { parseAgentToken } = await import('@shared/lib/agent-token');
    const req = new Request('http://localhost/test');
    expect(parseAgentToken(req)).toBeNull();
  });
});
