import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlatformPageFlags, mapFlagToSettingKey } from './platform-flags';
import { db } from '@api/server';

import { SETTINGS_KEYS } from '../settings';

vi.mock('@api/server', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  settings: {
    tenantId: 'tenantId',
    key: 'key',
    value: 'value',
  },
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('platform-flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlatformPageFlags', () => {
    it('should return default values for empty settings', async () => {
      const flags = await getPlatformPageFlags('tenant-1');
      expect(flags.campaign).toBe(true);
      expect(flags.groups).toBe(true);
      expect(flags.services).toBe(true);
      expect(flags.resources).toBe(true);
      expect(flags.maintenance).toBe(true);
      expect(flags.surveys).toBe(true);
      expect(flags.competitions).toBe(true);
    });

    it('should correctly override defaults with provided settings', async () => {
      const mockWhere = vi.fn().mockResolvedValue([
        { key: SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED, value: 'false' },
        { key: SETTINGS_KEYS.PAGE_GROUPS_ENABLED, value: 'false' },
        { key: SETTINGS_KEYS.PAGE_CONSERVATION_MODE, value: 'external' },
        { key: SETTINGS_KEYS.PAGE_CONSERVATION_URL, value: 'https://example.com' },
      ]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const flags = await getPlatformPageFlags('tenant-1');
      expect(flags.campaign).toBe(false);
      expect(flags.groups).toBe(false);
      expect(flags.conservation).toBe('external');
      expect(flags.conservationExternalUrl).toBe('https://example.com');
      expect(flags.services).toBe(true); // default
    });
  });

  describe('mapFlagToSettingKey', () => {
    it('should correctly map all flag keys to their respective setting keys', () => {
      expect(mapFlagToSettingKey('campaign')).toBe(SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED);
      expect(mapFlagToSettingKey('groups')).toBe(SETTINGS_KEYS.PAGE_GROUPS_ENABLED);
      expect(mapFlagToSettingKey('services')).toBe(SETTINGS_KEYS.PAGE_SERVICES_ENABLED);
      expect(mapFlagToSettingKey('resources')).toBe(SETTINGS_KEYS.PAGE_RESOURCES_ENABLED);
      expect(mapFlagToSettingKey('maintenance')).toBe(SETTINGS_KEYS.PAGE_MAINTENANCE_ENABLED);
      expect(mapFlagToSettingKey('surveys')).toBe(SETTINGS_KEYS.PAGE_SURVEYS_ENABLED);
      expect(mapFlagToSettingKey('competitions')).toBe(SETTINGS_KEYS.PAGE_COMPETITIONS_ENABLED);
    });
  });
});
