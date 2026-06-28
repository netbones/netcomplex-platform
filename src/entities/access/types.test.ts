/**
 * Type-level tests for access types — Phase 111-03.
 *
 * These tests ensure the updated AccessResolution.agent shape (with tokenId/delegationId)
 * and the AccessInput.caller union are correctly exported.
 */

import { describe, it, expectTypeOf } from 'vitest';
import type { AccessInput, AccessResolution } from './types';

describe('AccessInput', () => {
  it('accepts caller as user with optional token', () => {
    const input: AccessInput = { caller: 'user' };
    expectTypeOf(input.caller).toEqualTypeOf<'user' | 'agent' | undefined>();
  });

  it('accepts caller as agent with token', () => {
    const input: AccessInput = { caller: 'agent', token: 'abc.def.ghi' };
    expectTypeOf(input.token).toEqualTypeOf<string | undefined>();
  });

  it('accepts empty input (default human caller)', () => {
    const input: AccessInput = {};
    expectTypeOf(input.caller).toEqualTypeOf<'user' | 'agent' | undefined>();
  });
});

describe('AccessResolution.agent', () => {
  it('agent field includes tokenId when valid', () => {
    const resolution: AccessResolution = {
      spaces: ['home'],
      pages: ['dashboard'],
      features: [],
      agent: {
        scope: ['home', 'services'],
        expiresAt: '2027-01-01T00:00:00.000Z',
        tokenId: 'tok_abc123',
        delegationId: null,
      },
      resolvedAt: new Date().toISOString(),
    };
    expectTypeOf(resolution.agent!.tokenId).toEqualTypeOf<string | undefined>();
  });

  it('agent field includes delegationId when from a delegation', () => {
    const resolution: AccessResolution = {
      spaces: ['services'],
      pages: ['maintenance'],
      features: [],
      agent: {
        scope: ['services', 'maintenance'],
        expiresAt: '2027-01-01T00:00:00.000Z',
        tokenId: 'tok_def456',
        delegationId: 'del_xyz789',
      },
      resolvedAt: new Date().toISOString(),
    };
    expectTypeOf(resolution.agent!.delegationId).toEqualTypeOf<string | null | undefined>();
  });

  it('agent is null when not an agent caller', () => {
    const resolution: AccessResolution = {
      spaces: ['home'],
      pages: [],
      features: [],
      agent: null,
      resolvedAt: new Date().toISOString(),
    };
    expectTypeOf(resolution.agent).toEqualTypeOf<{
      scope: string[];
      expiresAt: string | null;
      tokenId?: string;
      delegationId?: string | null;
    } | null>();
  });
});
