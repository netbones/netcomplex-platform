/**
 * Tests for resolvePageAccess — 5-layer access resolution pipeline.
 *
 * Phase 110-01: Entity layer for page navigation access control.
 */

import { describe, it, expect } from 'vitest';
import { resolvePageAccess } from './resolver';
import type { AccessContext, AccessInput } from './types';
import type { PlatformPageFlags } from '@shared/lib';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** All-flags-on default for testing Layer 3 (feature flags). */
const ALL_FLAGS_ON: PlatformPageFlags = {
  campaign: true,
  conservation: 'default',
  conservationExternalUrl: '',
  chat: true,
  news: true,
  events: true,
  directory: true,
  groups: true,
  services: true,
  resources: true,
  maintenance: true,
  surveys: true,
  competitions: true,
  dashboard: true,
  disputes: true,
  dWallet: false,
  providers: true,
  bookings: true,
  messages: true,
  headerLinks: [],
};

/** Base context for a RESIDENT with all flags on, not suspended, no provider. */
function residentCtx(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userEmail: 'resident@village.test',
    role: 'RESIDENT',
    providerRecordExists: false,
    isSuspended: false,
    flags: ALL_FLAGS_ON,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — 6 cases from PLAN.md
// ---------------------------------------------------------------------------

describe('resolvePageAccess', () => {
  // ──── Test 1: RESIDENT, no provider, not suspended, all flags on ────

  it('returns home/messages/services/community spaces (not admin, not providers) for RESIDENT with all flags', () => {
    const ctx = residentCtx();
    const result = resolvePageAccess(ctx);

    // Spaces
    expect(result.spaces).toContain('home');
    expect(result.spaces).toContain('messages');
    expect(result.spaces).toContain('services');
    expect(result.spaces).toContain('community');
    expect(result.spaces).not.toContain('admin');
    expect(result.spaces).not.toContain('providers');

    // Pages — all boolean flags that are true should appear
    expect(result.pages).toContain('news');
    expect(result.pages).toContain('events');
    expect(result.pages).toContain('directory');
    expect(result.pages).toContain('groups');
    expect(result.pages).toContain('resources');
    expect(result.pages).toContain('maintenance');
    expect(result.pages).toContain('surveys');
    expect(result.pages).toContain('competitions');
    expect(result.pages).toContain('dashboard');
    expect(result.pages).toContain('disputes');
    expect(result.pages).toContain('bookings');
    expect(result.pages).toContain('messages');

    // Agent must be null for human callers
    expect(result.agent).toBeNull();

    // resolvedAt must be a valid ISO timestamp
    expect(result.resolvedAt).toBeDefined();
    expect(new Date(result.resolvedAt).toISOString()).toBe(result.resolvedAt);
  });

  // ──── Test 2: PROVIDER role + provider record ────

  it('includes providers + messages spaces for PROVIDER with a provider record', () => {
    const ctx = residentCtx({
      userId: 'provider-1',
      userEmail: 'provider@village.test',
      role: 'PROVIDER',
      providerRecordExists: true,
    });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).toContain('providers');
    expect(result.spaces).toContain('messages');
    expect(result.spaces).not.toContain('admin');
    // PROVIDER role does not get home or optional spaces
    expect(result.spaces).toEqual(expect.arrayContaining(['messages', 'providers']));
    expect(result.spaces.length).toBe(2);
    expect(result.agent).toBeNull();
  });

  // ──── Test 3: PROVIDER role, NO provider record ────

  it('returns only messages for PROVIDER without a provider record (D-04 gate)', () => {
    const ctx = residentCtx({
      userId: 'no-record-provider',
      role: 'PROVIDER',
      providerRecordExists: false,
    });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).toEqual(['messages']);
    expect(result.spaces).not.toContain('providers');
    expect(result.agent).toBeNull();
  });

  // ──── Test 4: ADMIN role ────

  it('includes admin space for ADMIN role', () => {
    const ctx = residentCtx({ role: 'ADMIN', userEmail: 'admin@village.test' });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).toContain('admin');
    expect(result.agent).toBeNull();
  });

  // Also test BOARD (an ADMIN_ROLES member)
  it('includes admin space for BOARD role', () => {
    const ctx = residentCtx({ role: 'BOARD', userEmail: 'board@village.test' });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).toContain('admin');
    expect(result.agent).toBeNull();
  });

  // ──── Test 5: Suspended user ────

  it('overrides to messages-only for suspended users (Layer 2)', () => {
    const ctx = residentCtx({ isSuspended: true });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).toEqual(['messages']);
    expect(result.pages).toEqual([]);
    expect(result.features).toEqual([]);
    expect(result.agent).toBeNull();
  });

  // ──── Test 6: Agent caller with token ────

  it('returns agent stub when caller is agent with token present', () => {
    const ctx = residentCtx();
    const input: AccessInput = { caller: 'agent', token: 'test-token-123' };
    const result = resolvePageAccess(ctx, input);

    expect(result.agent).toEqual({ scope: [], expiresAt: null });
  });

  it('returns agent null when caller is agent without token', () => {
    const ctx = residentCtx();
    const input: AccessInput = { caller: 'agent' };
    const result = resolvePageAccess(ctx, input);

    expect(result.agent).toBeNull();
  });

  it('returns agent null for default (no caller specified)', () => {
    const ctx = residentCtx();
    const result = resolvePageAccess(ctx);

    expect(result.agent).toBeNull();
  });

  // ──── Edge case: Unauthenticated / unknown role ────

  it('returns only core spaces for unauthenticated/unknown role', () => {
    const ctx = residentCtx({
      role: 'ASSOCIATE' as never, // valid role but minimal permissions
      userId: 'associate-1',
    });
    const result = resolvePageAccess(ctx);

    // Core spaces only (home, messages)
    expect(result.spaces).toContain('home');
    expect(result.spaces).toContain('messages');
    expect(result.spaces).not.toContain('admin');
  });

  // ──── Layer 3: Feature flags ────

  it('hides services space when flags.services is false', () => {
    const ctx = residentCtx({
      flags: { ...ALL_FLAGS_ON, services: false },
    });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).not.toContain('services');
    expect(result.spaces).toContain('home');
    expect(result.spaces).toContain('messages');
  });

  it('hides community space when all community flags are false', () => {
    const ctx = residentCtx({
      flags: {
        ...ALL_FLAGS_ON,
        events: false,
        groups: false,
        surveys: false,
        competitions: false,
        news: false,
      },
    });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).not.toContain('community');
    expect(result.spaces).toContain('home');
    expect(result.spaces).toContain('messages');
  });

  it('shows community space when at least one community flag is on', () => {
    const ctx = residentCtx({
      flags: {
        ...ALL_FLAGS_ON,
        events: false,
        groups: false,
        surveys: false,
        competitions: false,
        news: true, // one community flag on
      },
    });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).toContain('community');
  });

  // ──── Layer 1: Provider record gate applies regardless of role ────

  it('does NOT include providers for ADMIN without a provider record', () => {
    const ctx = residentCtx({
      role: 'ADMIN',
      userEmail: 'admin@village.test',
      providerRecordExists: false,
    });
    const result = resolvePageAccess(ctx);

    expect(result.spaces).not.toContain('providers');
  });
});
