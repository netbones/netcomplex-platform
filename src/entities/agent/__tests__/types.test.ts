/**
 * Task 2 — Agent types test
 *
 * Tests the agent entity type layer.
 * TypeScript types (Agent, AgentTokenPayload, etc.) are type-level only;
 * verified by compilation. Runtime values (constants, functions) are
 * tested via vitest assertions.
 */

import { describe, it, expect } from 'vitest';
import { AGENT_SCOPES, SCOPE_BUNDLES, validateScopes } from '@entities/agent';

describe('Scope registry', () => {
  it('should export AGENT_SCOPES constant', () => {
    expect(AGENT_SCOPES).toBeDefined();
    expect(Array.isArray(AGENT_SCOPES)).toBe(true);
    expect(AGENT_SCOPES.length).toBeGreaterThan(0);
    // Verify canonical scopes exist
    expect(AGENT_SCOPES).toContain('maintenance:read');
    expect(AGENT_SCOPES).toContain('tenancy:read');
    expect(AGENT_SCOPES).toContain('financials:read');
  });

  it('should export SCOPE_BUNDLES with all expected bundles', () => {
    expect(SCOPE_BUNDLES).toBeDefined();
    expect(SCOPE_BUNDLES['letting-agent']).toBeDefined();
    expect(SCOPE_BUNDLES['maintenance-contractor']).toBeDefined();
    expect(SCOPE_BUNDLES['inspector']).toBeDefined();
    expect(SCOPE_BUNDLES['property-manager']).toBeDefined();
  });

  it('should have tenancy scopes in letting-agent bundle', () => {
    const bundle = SCOPE_BUNDLES['letting-agent'];
    expect(bundle).toContain('tenancy:read');
    expect(bundle).toContain('tenancy:manage');
    expect(bundle).toContain('tenancy:invite');
  });

  it('should have maintenance scopes in maintenance-contractor bundle', () => {
    const bundle = SCOPE_BUNDLES['maintenance-contractor'];
    expect(bundle).toContain('maintenance:read');
    expect(bundle).toContain('maintenance:coordinate');
  });

  it('should have inspection scopes in inspector bundle', () => {
    const bundle = SCOPE_BUNDLES['inspector'];
    expect(bundle).toContain('inspection:schedule');
    expect(bundle).toContain('inspection:record');
    expect(bundle).toContain('inspection:view');
  });
});

describe('validateScopes', () => {
  it('should return empty array for valid scopes', () => {
    const invalid = validateScopes(['maintenance:read', 'tenancy:read']);
    expect(invalid).toEqual([]);
  });

  it('should return invalid scopes for unknown entries', () => {
    const invalid = validateScopes(['invalid:scope', 'maintenance:read']);
    expect(invalid).toContain('invalid:scope');
    expect(invalid).not.toContain('maintenance:read');
  });

  it('should return all entries for completely invalid input', () => {
    const invalid = validateScopes(['bad:one', 'bad:two']);
    expect(invalid).toEqual(['bad:one', 'bad:two']);
  });
});

// Type-level tests (verified by TypeScript compilation, not runtime)
describe('Type exports (compilation-level)', () => {
  it('should have agent module resolvable', () => {
    // The mere fact this file compiles proves @entities/agent resolves.
    // Specific types (Agent, AgentTokenPayload, etc.) are verified by
    // TypeScript type-check via `pnpm tsc --noEmit`.
    expect(true).toBe(true);
  });
});
