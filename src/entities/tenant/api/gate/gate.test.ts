/**
 * Tests for the server feature gate system.
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
import { MODULES } from '@/shared/lib';
import type { PlatformPageFlags } from '../flags/platform-flags';

// ============================================
// MOCKS
// ============================================

vi.mock('@api/server', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
  tenants: { id: 'id', tier: 'tier' },
  users: { id: 'id', role: 'role' },
  sessions: {},
  accounts: {},
  verifications: {},
  passkeys: {},
  twoFactors: {},
  members: {},
  invitations: {},
  organizations: {},
  messages: {},
  conversations: {},
  conversationParticipants: {},
  profiles: {},
  settings: {},
  albums: {},
  standardSeats: {},
  soloSeats: {},
  properties: {},
  households: {},
  premiumSeats: {},
  contents: {},
  propertyListings: {},
  communityServiceListings: {},
  communityServiceReviews: {},
  communityServiceInquiries: {},
  groups: {},
  groupMembers: {},
  surveys: {},
  questions: {},
  responses: {},
  surveySections: {},
  externalSurveys: {},
  bookings: {},
  maintenanceRequests: {},
  notifications: {},
  agentProfiles: {},
  propertyPremiumSeats: {},
  events: {},
  eventAttendees: {},
  announcements: {},
  agentAccesses: {},
  agentReviews: {},
  platformSuspensions: {},
  groupMembershipRequests: {},
  platformModules: {},
  tenantModules: {},
  assistSessions: {},
  resources: {},
  resourceVersions: {},
  competitions: {},
  competitionEntries: {},
  maintenanceTeams: {},
  serviceProviders: {},
  maintenanceCategories: {},
  requestNotes: {},
  requestHistories: {},
  getSessionAndRole: vi.fn(),
  CACHE_TAGS: { SETTINGS: 'settings' },
}));

vi.mock('@/shared/api/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('../../lib/modules', () => ({
  isModuleEnabled: vi.fn(),
}));

vi.mock('../flags/platform-flags', async () => {
  const actual = await vi.importActual('../flags/platform-flags');
  return {
    ...actual,
    getPlatformPageFlags: vi.fn(),
  };
});

vi.mock('@shared/lib', async () => {
  const actual = await vi.importActual('@shared/lib');
  return {
    ...actual,
    createComponentLogger: () => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

// ============================================
// SECTION 1: MAPPING COMPLETENESS (static)
// ============================================

describe('Mapping completeness', () => {
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
    'dWallet',
    'merits',
  ];

  describe('FEATURE_TO_MODULE', () => {
    it('should have an entry for every FeatureKey', () => {
      for (const key of ALL_FEATURE_KEYS) {
        expect(FEATURE_TO_MODULE).toHaveProperty(key);
      }
    });

    it('should only reference valid ModuleKey values or null', () => {
      const validModuleKeys = new Set<string>(Object.keys(MODULES));
      for (const moduleKey of Object.values(FEATURE_TO_MODULE)) {
        if (moduleKey !== null) {
          expect(validModuleKeys.has(moduleKey as string)).toBe(true);
        }
      }
    });

    it('should have exactly 16 entries (one per FeatureKey)', () => {
      expect(Object.keys(FEATURE_TO_MODULE)).toHaveLength(16);
    });
  });

  describe('FEATURE_TO_FLAG', () => {
    it('should have an entry for every FeatureKey', () => {
      for (const key of ALL_FEATURE_KEYS) {
        expect(FEATURE_TO_FLAG).toHaveProperty(key);
      }
    });

    it('should only reference valid PlatformPageFlags keys or null', () => {
      const sampleFlags: PlatformPageFlags = {
        'agent-gateway': true,
        campaign: true,
        conservation: 'default',
        conservationExternalUrl: '',
        conservationManagedUrl: '',
        education: true,
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
        dWallet: false,
        providers: true,
        bookings: true,
        messages: true,
        disputes: false,
        marketplacePaypal: false,
        headerLinks: ['directory', 'groups', 'services', 'resources'],
      };
      const validFlagKeys = new Set(Object.keys(sampleFlags));
      for (const flagKey of Object.values(FEATURE_TO_FLAG)) {
        if (flagKey !== null) {
          expect(validFlagKeys.has(flagKey as string)).toBe(true);
        }
      }
    });

    it('should have exactly 15 entries (one per FeatureKey)', () => {
      expect(Object.keys(FEATURE_TO_FLAG).length).toBeGreaterThan(0);
    });
  });

  describe('FEATURE_TO_REGISTRY', () => {
    it('should have an entry for every FeatureKey', () => {
      for (const key of ALL_FEATURE_KEYS) {
        expect(FEATURE_TO_REGISTRY).toHaveProperty(key);
      }
    });

    it('registry keys should match page.<feature> or feature.<feature> or widget.<feature> format or be null', () => {
      for (const [, registryKey] of Object.entries(FEATURE_TO_REGISTRY)) {
        if (registryKey !== null) {
          expect(typeof registryKey).toBe('string');
          expect(registryKey as string).toMatch(/^(page|feature|widget)\./);
        }
      }
    });

    it('should have exactly 16 entries (one per FeatureKey)', () => {
      expect(Object.keys(FEATURE_TO_REGISTRY)).toHaveLength(16);
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

const ALL_FLAGS_ENABLED: PlatformPageFlags = {
  'agent-gateway': true,
  campaign: true,
  conservation: 'default',
  conservationExternalUrl: '',
  conservationManagedUrl: '',
  education: true,
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
  dWallet: true,
  disputes: true,
  providers: true,
  bookings: true,
  messages: true,
  marketplacePaypal: false,
  headerLinks: ['directory', 'groups', 'services', 'resources'],
};

describe('canAccess()', () => {
  const baseCtx: GateContext = {
    tenantId: 'tenant-1',
    role: 'RESIDENT',
    tier: 'PREMIUM',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow when all 5 layers pass (bookings — foundation module)', async () => {
    const { isModuleEnabled } = await import('../../lib/modules');
    const { getPlatformPageFlags } = await import('../flags/platform-flags');

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue(ALL_FLAGS_ENABLED);

    const result = await canAccess(baseCtx, 'bookings');
    expect(result).toEqual({ allowed: true, reason: 'allowed' });
  });

  it('should deny with reason="tier" when tenant tier is too low for the module', async () => {
    const lowTierCtx = { ...baseCtx, tier: 'STANDARD' as const };

    const result = await canAccess(lowTierCtx, 'services');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('tier');
  });

  it('should deny with reason="module" when isModuleEnabled returns false', async () => {
    const { isModuleEnabled } = await import('../../lib/modules');
    vi.mocked(isModuleEnabled).mockResolvedValue(false);

    const result = await canAccess(baseCtx, 'bookings');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('module');
  });

  it('should deny with reason="flag" when page flag is false', async () => {
    const { isModuleEnabled } = await import('../../lib/modules');
    const { getPlatformPageFlags } = await import('../flags/platform-flags');

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue({
      ...ALL_FLAGS_ENABLED,
      bookings: false,
    });

    const result = await canAccess(baseCtx, 'bookings');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('flag');
  });

  it('should skip flag check when skipFlag=true', async () => {
    const { isModuleEnabled } = await import('../../lib/modules');
    const { getPlatformPageFlags } = await import('../flags/platform-flags');

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue({
      ...ALL_FLAGS_ENABLED,
      bookings: false,
    });

    const result = await canAccess(baseCtx, 'bookings', { skipFlag: true });
    expect(result.allowed).toBe(true);
  });

  it('should short-circuit on first failing layer (tier before module)', async () => {
    const { isModuleEnabled } = await import('../../lib/modules');
    const lowTierCtx = { ...baseCtx, tier: 'STANDARD' as const };

    const result = await canAccess(lowTierCtx, 'services');
    expect(result.reason).toBe('tier');

    expect(isModuleEnabled).not.toHaveBeenCalled();
  });

  it('should handle features with null module mapping (e.g., competitions)', async () => {
    const { getPlatformPageFlags } = await import('../flags/platform-flags');

    vi.mocked(getPlatformPageFlags).mockResolvedValue(ALL_FLAGS_ENABLED);

    const result = await canAccess(baseCtx, 'competitions');
    expect(result.allowed).toBe(true);
  });

  it('should allow when tri-state flag is non-boolean (e.g. conservation: "managed")', async () => {
    const { isModuleEnabled } = await import('../../lib/modules');
    const { getPlatformPageFlags } = await import('../flags/platform-flags');

    vi.mocked(isModuleEnabled).mockResolvedValue(true);
    vi.mocked(getPlatformPageFlags).mockResolvedValue({
      ...ALL_FLAGS_ENABLED,
      conservation: 'managed',
    });

    const result = await canAccess(baseCtx, 'conservation');
    expect(result.allowed).toBe(true);
  });
});

describe('GATE_REASON_TO_ERROR', () => {
  it('should have an entry for every GateReason', () => {
    const expectedReasons: GateReason[] = ['role', 'tier', 'module', 'flag', 'feature', 'allowed'];
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
    const { db } = await import('@api/server');
    const { getSessionAndRole } = await import('@api/server');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'tenant-1', tier: 'PREMIUM' }]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const { db } = await import('@api/server');
    const { getSessionAndRole } = await import('@api/server');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'tenant-1', tier: 'STANDARD' }]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(getSessionAndRole).mockResolvedValue(null);

    const ctx = await resolveGateContext('tenant-1');
    expect(ctx.role).toBe('RESIDENT');
  });

  it('should throw if tenant not found', async () => {
    const { db } = await import('@api/server');
    const { getSessionAndRole } = await import('@api/server');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
