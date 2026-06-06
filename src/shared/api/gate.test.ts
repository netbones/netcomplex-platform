/**
 * Tests for the server feature gate system.
 *
 * Two test sections:
 *  1. Mapping completeness — static checks on the 3 mapping tables
 *     (catches drift if a FeatureKey is added without updating all tables)
 *  2. Gate function behaviour — dynamic checks on canAccess(), resolveGateContext(),
 *     and GATE_REASON_TO_ERROR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  FeatureKey,
  FEATURE_TO_MODULE,
  FEATURE_TO_FLAG,
  FEATURE_TO_REGISTRY,
  GateContext,
  GateReason,
  canAccess,
  resolveGateContext,
  GATE_REASON_TO_ERROR,
} from './gate';
import { MODULES, ModuleKey } from '@shared/lib';
import { PlatformPageFlags } from '@entities/tenant';

// ============================================
// MOCKS
// ============================================

vi.mock('@api/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  tenants: {
    id: 'id',
    tier: 'tier',
  },
}));

vi.mock('@entities/tenant-module-enabled', () => ({
  isModuleEnabled: vi.fn(),
}));

vi.mock('@entities/tenant', async () => {
  const actual = await vi.importActual('@entities/tenant');
  return {
    ...actual,
    getPlatformPageFlags: vi.fn(),
  };
});

vi.mock('@api/auth-utils', () => ({
  getSessionAndRole: vi.fn(),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ============================================
// SECTION 1: MAPPING COMPLETENESS (static)
// ============================================

describe('Mapping completeness', () => {
  // All 14 FeatureKey values (mirroring the type).
  // If a new key is added, the test will fail until all 3 tables include it.
  const ALL_FEATURE_KEYS: FeatureKey[] = [
    'maintenance',
    'bookings',
    'events',
    'surveys',
    'competitions',
    'groups',
    'chat',
    'news',
    'directory',
    'resources',
    'conservation',
    'services',
    'dashboard',
    'messages',
  ];

  describe('FEATURE_TO_MODULE', () => {
    it('should have an entry for every FeatureKey', () => {
      for (const key of ALL_FEATURE_KEYS) {
        expect(FEATURE_TO_MODULE).toHaveProperty(key);
      }
    });

    it('should only reference valid ModuleKey values or null', () => {
      const validModuleKeys = new Set<string>(Object.keys(MODULES));
      for (const [feature, moduleKey] of Object.entries(FEATURE_TO_MODULE)) {
        if (moduleKey !== null) {
          expect(validModuleKeys.has(moduleKey as string)).toBe(true);
        }
      }
    });

    it('should have exactly 14 entries (one per FeatureKey)', () => {
      expect(Object.keys(FEATURE_TO_MODULE)).toHaveLength(14);
    });
  });

  describe('FEATURE_TO_FLAG', () => {
    it('should have an entry for every FeatureKey', () => {
      for (const key of ALL_FEATURE_KEYS) {
        expect(FEATURE_TO_FLAG).toHaveProperty(key);
      }
    });

    it('should only reference valid PlatformPageFlags keys or null', () => {
      // Sample PlatformPageFlags to derive valid keys.
      const sampleFlags: PlatformPageFlags = {
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
        bookings: true,
        messages: true,
        headerEngagementFocus: 'conservation',
      };
      const validFlagKeys = new Set(Object.keys(sampleFlags));
      for (const [feature, flagKey] of Object.entries(FEATURE_TO_FLAG)) {
        if (flagKey !== null) {
          expect(validFlagKeys.has(flagKey as string)).toBe(true);
        }
      }
    });

    it('should have exactly 14 entries (one per FeatureKey)', () => {
      expect(Object.keys(FEATURE_TO_FLAG)).toHaveLength(14);
    });
  });

  describe('FEATURE_TO_REGISTRY', () => {
    it('should have an entry for every FeatureKey', () => {
      for (const key of ALL_FEATURE_KEYS) {
        expect(FEATURE_TO_REGISTRY).toHaveProperty(key);
      }
    });

    it('registry keys should match page.<feature> or feature.<feature> or widget.<feature> format or be null', () => {
      for (const [feature, registryKey] of Object.entries(FEATURE_TO_REGISTRY)) {
        if (registryKey !== null) {
          expect(typeof registryKey).toBe('string');
          expect(registryKey as string).toMatch(/^(page|feature|widget)\./);
        }
      }
    });

    it('should have exactly 14 entries (one per FeatureKey)', () => {
      expect(Object.keys(FEATURE_TO_REGISTRY)).toHaveLength(14);
    });
  });

  describe('Cross-table consistency', () => {
    it('all 3 mapping tables have the same set of FeatureKey keys', () => {
      const moduleKeys = Object.keys(FEATURE_TO_MODULE).sort();
      const flagKeys = Object.keys(FEATURE_TO_FLAG).sort();
      const registryKeys = Object.keys(FEATURE_TO_REGISTRY).sort();
      expect(flagKeys).toEqual(moduleKeys);
      expect(registryKeys).toEqual(moduleKeys);
    });
  });
});

// ============================================
// SECTION 2: GATE FUNCTION BEHAVIOUR (dynamic)
// ============================================

/**
 * Default mock flags — all enabled.
 * Used by canAccess() tests that need Layer 3 to pass.
 */
const ALL_FLAGS_ENABLED: PlatformPageFlags = {
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
  bookings: true,
  messages: true,
  headerEngagementFocus: 'conservation',
};

describe('canAccess()', () => {
  // baseCtx: PREMIUM tier (depth) — passes tier checks for any foundation/depth module.
  // 'bookings' is a depth module — it passes tier check with PREMIUM.
  const baseCtx: GateContext = {
    tenantId: 'tenant-1',
    role: 'RESIDENT',
    tier: 'PREMIUM',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow when all 5 layers pass (bookings — depth module)', async () => {
    const { isModuleEnabled } = await import(
      '@entities/tenant-module-enabled'
    );
    const { getPlatformPageFlags } = await import(
      '@entities/tenant'
    );

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue(ALL_FLAGS_ENABLED);

    const result = await canAccess(baseCtx, 'bookings');
    expect(result).toEqual({ allowed: true, reason: 'allowed' });
  });

  it('should deny with reason="tier" when tenant tier is too low for the module', async () => {
    // STANDARD = foundation (1); maintenance requires core (3).
    const lowTierCtx = { ...baseCtx, tier: 'STANDARD' as const };

    const result = await canAccess(lowTierCtx, 'maintenance');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('tier');
  });

  it('should deny with reason="module" when isModuleEnabled returns false', async () => {
    const { isModuleEnabled } = await import(
      '@entities/tenant-module-enabled'
    );
    vi.mocked(isModuleEnabled).mockResolvedValue(false);

    // 'bookings' = depth module — passes tier with PREMIUM; fails at module layer.
    const result = await canAccess(baseCtx, 'bookings');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('module');
  });

  it('should deny with reason="flag" when page flag is false', async () => {
    const { isModuleEnabled } = await import(
      '@entities/tenant-module-enabled'
    );
    const { getPlatformPageFlags } = await import(
      '@entities/tenant'
    );

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue({
      ...ALL_FLAGS_ENABLED,
      bookings: false, // ← denied here
    });

    const result = await canAccess(baseCtx, 'bookings');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('flag');
  });

  it('should skip flag check when skipFlag=true', async () => {
    const { isModuleEnabled } = await import(
      '@entities/tenant-module-enabled'
    );
    const { getPlatformPageFlags } = await import(
      '@entities/tenant'
    );

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue({
      ...ALL_FLAGS_ENABLED,
      bookings: false, // ← would normally deny
    });

    const result = await canAccess(baseCtx, 'bookings', { skipFlag: true });
    expect(result.allowed).toBe(true);
  });

  it('should short-circuit on first failing layer (tier before module)', async () => {
    const { isModuleEnabled } = await import(
      '@entities/tenant-module-enabled'
    );
    const lowTierCtx = { ...baseCtx, tier: 'STANDARD' as const };

    const result = await canAccess(lowTierCtx, 'maintenance');
    expect(result.reason).toBe('tier');

    // isModuleEnabled should NOT be called (tier check failed first)
    expect(isModuleEnabled).not.toHaveBeenCalled();
  });

  it('should handle features with null module mapping (e.g., competitions)', async () => {
    const { getPlatformPageFlags } = await import(
      '@entities/tenant'
    );

    vi.mocked(getPlatformPageFlags).mockResolvedValue(ALL_FLAGS_ENABLED);

    // 'competitions' has moduleKey=null and registryKey=null; only layers 0 and 3 are checked.
    const result = await canAccess(baseCtx, 'competitions');
    expect(result.allowed).toBe(true);
  });

  it('should allow when tri-state flag is non-boolean (e.g. conservation: "managed")', async () => {
    const { isModuleEnabled } = await import(
      '@entities/tenant-module-enabled'
    );
    const { getPlatformPageFlags } = await import(
      '@entities/tenant'
    );

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue({
      ...ALL_FLAGS_ENABLED,
      conservation: 'managed', // non-boolean — gate treats as enabled
    });

    // 'conservation' = foundation module — passes tier with PREMIUM.
    const result = await canAccess(baseCtx, 'conservation');
    expect(result.allowed).toBe(true);
  });
});

describe('GATE_REASON_TO_ERROR', () => {
  it('should have an entry for every GateReason', () => {
    const expectedReasons: GateReason[] = [
      'role',
      'tier',
      'module',
      'flag',
      'feature',
      'allowed',
    ];
    for (const reason of expectedReasons) {
      expect(GATE_REASON_TO_ERROR).toHaveProperty(reason);
    }
  });

  it('should return OK for allowed', () => {
    expect(GATE_REASON_TO_ERROR.allowed).toBe('OK');
  });

  it('should return canonical error codes for denial reasons', () => {
    expect(GATE_REASON_TO_ERROR.role).toBe('INSUFFICIENT_ROLE');
    expect(GATE_REASON_TO_ERROR.tier).toBe('TIER_REQUIRED');
    expect(GATE_REASON_TO_ERROR.module).toBe('MODULE_DISABLED');
    expect(GATE_REASON_TO_ERROR.flag).toBe('PAGE_DISABLED');
    expect(GATE_REASON_TO_ERROR.feature).toBe('FEATURE_UNAVAILABLE');
  });
});

describe('resolveGateContext()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return GateContext with tenant tier and role from session', async () => {
    const { db } = await import('@api/db');
    const { getSessionAndRole } = await import('@api/auth-utils');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'tenant-1', tier: 'PREMIUM' }]),
        }),
      }),
    } as any);

    vi.mocked(getSessionAndRole).mockResolvedValue({
      session: { user: { id: 'user-1', email: 'admin@example.com', name: 'Admin' } },
      userId: 'user-1',
      role: 'ADMIN',
      suspension: null,
    });

    const ctx = await resolveGateContext('tenant-1');
    expect(ctx.tenantId).toBe('tenant-1');
    expect(ctx.tier).toBe('PREMIUM');
    expect(ctx.role).toBe('ADMIN');
  });

  it('should default role to RESIDENT when session is null', async () => {
    const { db } = await import('@api/db');
    const { getSessionAndRole } = await import('@api/auth-utils');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'tenant-1', tier: 'STANDARD' }]),
        }),
      }),
    } as any);

    vi.mocked(getSessionAndRole).mockResolvedValue(null);

    const ctx = await resolveGateContext('tenant-1');
    expect(ctx.role).toBe('RESIDENT');
  });

  it('should throw if tenant not found', async () => {
    const { db } = await import('@api/db');
    const { getSessionAndRole } = await import('@api/auth-utils');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    vi.mocked(getSessionAndRole).mockResolvedValue({
      session: { user: { id: 'user-1', email: 'r@example.com', name: 'R' } },
      userId: 'user-1',
      role: 'RESIDENT',
      suspension: null,
    });

    await expect(resolveGateContext('missing')).rejects.toThrow();
  });
});
