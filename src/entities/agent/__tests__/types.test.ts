/**
 * Task 2 — Agent types test (RED phase)
 *
 * Tests the agent entity type layer.
 * Will FAIL because types.ts and scopes.ts don't exist yet.
 */

import { describe, it, expect } from 'vitest';

describe('Agent types', () => {
  it('should export Agent union type', async () => {
    const mod = await import('@entities/agent');
    expect(mod.Agent).toBeDefined();
    // Type narrowing check: Agent union type should include HumanAgent, AIAgent, CronAgent, DelegatedProviderAgent
    expect(mod.HumanAgent).toBeDefined();
    expect(mod.AIAgent).toBeDefined();
    expect(mod.CronAgent).toBeDefined();
    expect(mod.DelegatedProviderAgent).toBeDefined();
  });

  it('should export AgentTokenPayload type', async () => {
    const mod = await import('@entities/agent');
    expect(mod.AgentTokenPayload).toBeDefined();
  });

  it('should export EffectiveScope type', async () => {
    const mod = await import('@entities/agent');
    expect(mod.EffectiveScope).toBeDefined();
  });

  it('should export TokenValidationResult type', async () => {
    const mod = await import('@entities/agent');
    expect(mod.TokenValidationResult).toBeDefined();
  });

  it('should export AgentScope type from scopes', async () => {
    const mod = await import('@entities/agent');
    expect(mod.AgentScope).toBeDefined();
  });
});

describe('Scope registry', () => {
  it('should export AGENT_SCOPES constant', async () => {
    const mod = await import('@entities/agent');
    expect(mod.AGENT_SCOPES).toBeDefined();
    expect(Array.isArray(mod.AGENT_SCOPES)).toBe(true);
    expect(mod.AGENT_SCOPES.length).toBeGreaterThan(0);
  });

  it('should export SCOPE_BUNDLES constant', async () => {
    const mod = await import('@entities/agent');
    expect(mod.SCOPE_BUNDLES).toBeDefined();
    expect(typeof mod.SCOPE_BUNDLES).toBe('object');
  });

  it('should export validateScopes function', async () => {
    const mod = await import('@entities/agent');
    expect(mod.validateScopes).toBeDefined();
    expect(typeof mod.validateScopes).toBe('function');
  });

  it('should include letting-agent bundle in SCOPE_BUNDLES', async () => {
    const mod = await import('@entities/agent');
    expect(mod.SCOPE_BUNDLES['letting-agent']).toBeDefined();
  });

  it('should include maintenance-contractor bundle in SCOPE_BUNDLES', async () => {
    const mod = await import('@entities/agent');
    expect(mod.SCOPE_BUNDLES['maintenance-contractor']).toBeDefined();
  });

  it('should include inspector bundle in SCOPE_BUNDLES', async () => {
    const mod = await import('@entities/agent');
    expect(mod.SCOPE_BUNDLES['inspector']).toBeDefined();
  });

  it('should include property-manager bundle in SCOPE_BUNDLES', async () => {
    const mod = await import('@entities/agent');
    expect(mod.SCOPE_BUNDLES['property-manager']).toBeDefined();
  });
});
