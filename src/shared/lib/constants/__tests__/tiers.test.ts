import { describe, it, expect } from 'vitest';
import { MODULES, TIERS, type ModuleKey, type TierLevel } from '../tiers';

describe('MODULES registry', () => {
  it('every module has a valid tier assignment', () => {
    const validTiers: TierLevel[] = ['core', 'foundation', 'pro-max'];
    for (const mod of Object.values(MODULES)) {
      expect(validTiers).toContain(mod.tier);
    }
  });

  it('every module key in MODULES matches its .key field', () => {
    for (const [key, mod] of Object.entries(MODULES)) {
      expect(mod.key).toBe(key);
    }
  });

  it('every ModuleKey in MODULES appears in at least one tier list', () => {
    const allTierModules = new Set<ModuleKey>();
    for (const tier of Object.values(TIERS)) {
      for (const m of tier.modules) {
        allTierModules.add(m);
      }
    }
    for (const key of Object.keys(MODULES) as ModuleKey[]) {
      expect(allTierModules.has(key)).toBe(true);
    }
  });
});

describe('TIERS module lists', () => {
  const validModuleKeys = new Set<ModuleKey>(Object.keys(MODULES) as ModuleKey[]);

  it('every module in a tier list is a valid ModuleKey', () => {
    for (const tier of Object.values(TIERS)) {
      for (const m of tier.modules) {
        expect(validModuleKeys.has(m)).toBe(true);
      }
    }
  });

  it('core modules are a subset of foundation modules', () => {
    const foundationSet = new Set(TIERS.foundation.modules);
    for (const m of TIERS.core.modules) {
      expect(foundationSet.has(m)).toBe(true);
    }
  });

  it('foundation modules are a subset of pro-max modules', () => {
    const proMaxSet = new Set(TIERS['pro-max'].modules);
    for (const m of TIERS.foundation.modules) {
      expect(proMaxSet.has(m)).toBe(true);
    }
  });

  it('no duplicate modules within any tier', () => {
    for (const tier of Object.values(TIERS)) {
      const seen = new Set<ModuleKey>();
      for (const m of tier.modules) {
        expect(seen.has(m)).toBe(false);
        seen.add(m);
      }
    }
  });
});

describe('Module tier consistency', () => {
  it.each(Object.entries(MODULES))(
    '%s (declared tier=%s) is in the correct tier lists',
    (key, def) => {
      const tier = def.tier as TierLevel;
      const tiers: TierLevel[] = ['core', 'foundation', 'pro-max'];
      const tierIdx = tiers.indexOf(tier);
      const lowerTiers = tiers.slice(0, tierIdx);
      const upperTiers = tiers.slice(tierIdx);

      for (const lt of lowerTiers) {
        expect(TIERS[lt].modules).not.toContain(key as ModuleKey);
      }
      for (const ut of upperTiers) {
        expect(TIERS[ut].modules).toContain(key as ModuleKey);
      }
    }
  );
});

describe('Tier limits', () => {
  it('every tier has defined limits', () => {
    const limitKeys = ['announcements', 'surveys', 'events', 'apiRequestsPerDay'] as const;
    for (const tier of Object.values(TIERS)) {
      for (const key of limitKeys) {
        expect(tier.limits).toHaveProperty(key);
        expect(typeof tier.limits[key]).toBe('number');
      }
    }
  });

  it('limits scale with tier (core < foundation < pro-max)', () => {
    const limitKeys = ['announcements', 'surveys', 'events', 'apiRequestsPerDay'] as const;
    const order: TierLevel[] = ['core', 'foundation', 'pro-max'];
    for (const key of limitKeys) {
      const values = order.map(t => TIERS[t].limits[key]);
      expect(values[1]).toBeGreaterThan(values[0]);
      expect(values[2] === -1 || values[2] > values[1]).toBe(true);
    }
  });
});

describe('User and storage caps', () => {
  it('maxUsers scales with tier or is unlimited (-1)', () => {
    expect(TIERS.core.maxUsers).toBeGreaterThan(0);
    expect(TIERS.core.maxUsers).toBeLessThan(TIERS.foundation.maxUsers);
    expect(
      TIERS['pro-max'].maxUsers === -1 || TIERS['pro-max'].maxUsers > TIERS.foundation.maxUsers
    ).toBe(true);
  });

  it('storageGB scales with tier or is unlimited (-1)', () => {
    expect(TIERS.core.storageGB).toBeGreaterThan(0);
    expect(TIERS.core.storageGB).toBeLessThan(TIERS.foundation.storageGB);
    expect(
      TIERS['pro-max'].storageGB === -1 || TIERS['pro-max'].storageGB > TIERS.foundation.storageGB
    ).toBe(true);
  });
});

describe('hasModuleAccess', () => {
  it('core has access to core modules', () => {
    for (const m of TIERS.core.modules) {
      expect(TIERS.core.modules.includes(m)).toBe(true);
    }
  });

  it('foundation has access to all core and its own modules', () => {
    for (const m of TIERS.core.modules) {
      expect(TIERS.foundation.modules).toContain(m);
    }
    for (const m of TIERS.foundation.modules) {
      expect(TIERS['pro-max'].modules).toContain(m);
    }
  });

  it('pro-max has access to all modules', () => {
    const allModuleKeys = Object.keys(MODULES) as ModuleKey[];
    for (const m of allModuleKeys) {
      expect(TIERS['pro-max'].modules).toContain(m);
    }
  });
});
