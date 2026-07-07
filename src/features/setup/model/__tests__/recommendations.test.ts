import { describe, it, expect } from 'vitest';
import { getRecommendations, type RecommendationInput } from '../recommendations';
import type { TenantSetup, SetupMission } from '@/entities/setup';
import type { TierLevel } from '@/entities/tenant';

// ── Helpers ───────────────────────────────────────────────────────

function makeSetup(overrides: Partial<TenantSetup> = {}): TenantSetup {
  return {
    id: 'setup-1',
    tenantId: 'tenant-1',
    completionPercent: 0,
    completedSections: [],
    launchedAt: null,
    lastViewedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeMission(missionKey: string, isCompleted: boolean, section = 'launch'): SetupMission {
  return {
    id: `mission-${missionKey}`,
    tenantSetupId: 'setup-1',
    section: section as SetupMission['section'],
    missionKey,
    title: `Mission ${missionKey}`,
    description: null,
    isRequired: true,
    isCompleted,
    completedAt: isCompleted ? '2026-01-01T00:00:00Z' : null,
    sortOrder: 0,
    metadata: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
  };
}

function makeInput(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    setup: makeSetup(),
    tier: 'foundation' as TierLevel,
    missions: {},
    settings: {},
    ...overrides,
  };
}

function missionKeyOf(results: ReturnType<typeof getRecommendations>): string[] {
  return results.map(r => r.missionKey);
}

// ── Tests ─────────────────────────────────────────────────────────

describe('getRecommendations', () => {
  // ── Tier gating ─────────────────────────────────────────────────

  describe('tier gating', () => {
    it('foundation tier: no premium recommendations (maintenance, bookings, dwallet, surveys, competitions, achievements, marketplace)', () => {
      const input = makeInput({
        tier: 'foundation',
        settings: {
          'configure.modules.maintenance.enabled': true,
          'configure.modules.bookings.enabled': true,
          'configure.modules.dwallet.enabled': true,
          'configure.modules.surveys.enabled': true,
          'configure.modules.competitions.enabled': true,
          'configure.modules.achievements.enabled': true,
          'configure.modules.marketplace.enabled': true,
          'populate.stats': { count: 2 },
        },
      });

      const results = getRecommendations(input);

      // Foundation should only get launch-family recommendations
      const keys = missionKeyOf(results);
      for (const key of keys) {
        expect(key).toMatch(/^launch\./);
      }
    });

    it('depth tier: appears when tier is depth', () => {
      const input = makeInput({
        tier: 'depth',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'configure.modules.bookings.enabled': true,
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);

      // Should include bookings recommendation (depth-tier)
      expect(missionKeyOf(results)).toContain('configure.bookings');
    });

    it('core tier: gets maintenance recommendation when enabled', () => {
      const input = makeInput({
        tier: 'core',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'configure.modules.maintenance.enabled': true,
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).toContain('configure.maintenance');
    });

    it('core tier: does NOT see depth-tier recommendation if also core-level rules apply', () => {
      const input = makeInput({
        tier: 'core',
        setup: makeSetup({ completionPercent: 100 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
          'configure.maintenance': makeMission('configure.maintenance', true),
        },
        settings: {
          'configure.modules.maintenance.enabled': true,
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      // At 100% with everything configured, no recommendations
      expect(results).toHaveLength(0);
    });
  });

  // ── Low completion focus ─────────────────────────────────────────

  describe('low completion (<30%)', () => {
    it('empty setup (0%): recommends launch missions only', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 0 }),
        settings: {
          'configure.modules.bookings.enabled': true,
          'populate.stats': { count: 2 },
        },
        tier: 'depth',
      });

      const results = getRecommendations(input);
      const keys = missionKeyOf(results);

      // Only launch missions should appear — even though depth-tier modules are enabled
      expect(keys.every(k => k.startsWith('launch.'))).toBe(true);
      expect(keys).toContain('launch.identity');
      expect(keys).toContain('launch.branding');
    });

    it('25%: recommends launch missions only, not configure/grow', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 25 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
        },
        settings: {
          'configure.modules.surveys.enabled': true,
        },
        tier: 'core',
      });

      const results = getRecommendations(input);
      const keys = missionKeyOf(results);

      // Only remaining launch missions — no surveys recommendation
      for (const key of keys) {
        expect(key.startsWith('launch.')).toBe(true);
      }
      expect(keys).not.toContain('grow.surveys');
    });
  });

  // ── Completed missions ───────────────────────────────────────────

  describe('completed mission filtering', () => {
    it('fully completed launch: no launch recommendations', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 50 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      const keys = missionKeyOf(results);

      for (const key of keys) {
        expect(key.startsWith('launch.')).toBe(false);
      }
    });

    it('100% completion with everything done: no recommendations', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 100 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'populate.stats': { count: 100 },
        },
        tier: 'core',
      });

      const results = getRecommendations(input);
      expect(results).toHaveLength(0);
    });

    it('partially completed: remaining launch missions recommended in priority order', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 40 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
        },
        settings: {
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      const keys = missionKeyOf(results);

      expect(keys).not.toContain('launch.identity');
      expect(keys).not.toContain('launch.branding');
      expect(keys).toContain('launch.domain');
      expect(keys).toContain('launch.timezone');
      expect(keys).toContain('launch.address');
    });
  });

  // ── Population checks ────────────────────────────────────────────

  describe('population-based recommendations', () => {
    it('population < 5: recommends inviting more residents', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 80 }), // above 30% threshold
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'populate.stats': { count: 3 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).toContain('populate.invite-residents');
    });

    it('population = 0: recommends inviting residents', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'populate.stats': { count: 0 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).toContain('populate.invite-residents');
    });

    it('population >= 5: no invite recommendation', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).not.toContain('populate.invite-residents');
    });

    it('missing populate.stats: treats as 0 population', () => {
      const input = makeInput({
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {},
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).toContain('populate.invite-residents');
    });
  });

  // ── Module enabled but not configured ────────────────────────────

  describe('module enabled but not configured', () => {
    it('bookings enabled but not configured: recommends configuration', () => {
      const input = makeInput({
        tier: 'depth',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'configure.modules.bookings.enabled': true,
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).toContain('configure.bookings');
    });

    it('surveys enabled: recommends creating first survey', () => {
      const input = makeInput({
        tier: 'depth',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
          'grow.surveys': makeMission('grow.surveys', false),
        },
        settings: {
          'configure.modules.surveys.enabled': true,
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).toContain('grow.surveys');
    });

    it('dwallet enabled but revenue stream not seeded: recommends setup', () => {
      const input = makeInput({
        tier: 'depth',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'configure.modules.dwallet.enabled': true,
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).toContain('configure.wallet');
    });

    it('dwallet enabled AND revenue stream seeded: no recommendation', () => {
      const input = makeInput({
        tier: 'depth',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          'configure.modules.dwallet.enabled': true,
          'configure.wallet.revenue': { seeded: true },
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).not.toContain('configure.wallet');
    });

    it('module NOT enabled: no configuration recommendation', () => {
      const input = makeInput({
        tier: 'depth',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        },
        settings: {
          // bookings NOT enabled
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).not.toContain('configure.bookings');
    });

    it('bookings enabled AND already configured: no recommendation', () => {
      const input = makeInput({
        tier: 'depth',
        setup: makeSetup({ completionPercent: 80 }),
        missions: {
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
          'configure.bookings': makeMission('configure.bookings', true),
        },
        settings: {
          'configure.modules.bookings.enabled': true,
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      expect(missionKeyOf(results)).not.toContain('configure.bookings');
    });
  });

  // ── Priority ordering ────────────────────────────────────────────

  describe('priority ordering', () => {
    it('results sorted by priority (lowest first)', () => {
      const input = makeInput({
        tier: 'core',
        setup: makeSetup({ completionPercent: 50 }),
        settings: {
          'configure.modules.maintenance.enabled': true,
          'configure.modules.bookings.enabled': true,
          'populate.stats': { count: 3 },
        },
      });

      const results = getRecommendations(input);

      // Verify priorities are non-decreasing
      for (let i = 1; i < results.length; i++) {
        expect(results[i].priority).toBeGreaterThanOrEqual(results[i - 1].priority);
      }
    });
  });

  // ── Output shape ─────────────────────────────────────────────────

  describe('output shape', () => {
    it('each recommendation has all required fields', () => {
      const input = makeInput({
        tier: 'depth',
        settings: {
          'configure.modules.bookings.enabled': true,
          'populate.stats': { count: 3 },
        },
      });

      const results = getRecommendations(input);

      for (const rec of results) {
        expect(rec).toHaveProperty('missionKey');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('estimatedTime');
        expect(rec).toHaveProperty('benefits');
        expect(rec).toHaveProperty('priority');
        expect(typeof rec.missionKey).toBe('string');
        expect(typeof rec.title).toBe('string');
        expect(typeof rec.description).toBe('string');
        expect(typeof rec.estimatedTime).toBe('string');
        expect(Array.isArray(rec.benefits)).toBe(true);
        expect(typeof rec.priority).toBe('number');
        expect(rec.priority).toBeGreaterThanOrEqual(0);
        expect(rec.priority).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('empty missions object: treats all as incomplete', () => {
      const input = makeInput({
        missions: {},
        settings: {
          'populate.stats': { count: 10 },
        },
      });

      const results = getRecommendations(input);
      // Should still get launch recommendations
      expect(missionKeyOf(results)).toContain('launch.identity');
    });

    it('empty settings: safe defaults', () => {
      const input = makeInput({
        settings: {},
      });

      const results = getRecommendations(input);
      // Should not crash, and should at minimum produce launch recommendations
      expect(results.length).toBeGreaterThan(0);
    });

    it('null/undefined completion fields: handles gracefully', () => {
      const input = makeInput({
        setup: makeSetup({
          completionPercent: 0,
          completedSections: [],
          launchedAt: null,
        }),
        settings: {},
      });

      const results = getRecommendations(input);
      expect(results.length).toBeGreaterThan(0);
      // Low completion → only launch missions
      expect(results.every(r => r.missionKey.startsWith('launch.'))).toBe(true);
    });
  });
});
