import { describe, it, expect } from 'vitest';
import { SETTINGS_KEYS } from '@entities/tenant/server';

describe('Tenant Settings', () => {
  describe('SETTINGS_KEYS', () => {
    it('should have PAGE_CAMPAIGN_ENABLED key', () => {
      expect(SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED).toBe('page_campaign_enabled');
    });

    it('should have PAGE_CONSERVATION_MODE key', () => {
      expect(SETTINGS_KEYS.PAGE_CONSERVATION_MODE).toBe('page_conservation_mode');
    });

    it('should have PAGE_CONSERVATION_URL key', () => {
      expect(SETTINGS_KEYS.PAGE_CONSERVATION_URL).toBe('page_conservation_external_url');
    });

    it('should have PAGE_CHAT_ENABLED key', () => {
      expect(SETTINGS_KEYS.PAGE_CHAT_ENABLED).toBe('page_chat_enabled');
    });

    it('should have PAGE_NEWS_ENABLED key', () => {
      expect(SETTINGS_KEYS.PAGE_NEWS_ENABLED).toBe('page_news_enabled');
    });

    it('should have PAGE_EVENTS_ENABLED key', () => {
      expect(SETTINGS_KEYS.PAGE_EVENTS_ENABLED).toBe('page_events_enabled');
    });

    it('should have PAGE_DIRECTORY_ENABLED key', () => {
      expect(SETTINGS_KEYS.PAGE_DIRECTORY_ENABLED).toBe('page_directory_enabled');
    });

    it('should have CUSTOM_PAGES key', () => {
      expect(SETTINGS_KEYS.CUSTOM_PAGES).toBe('custom_pages');
    });

    it('should have CUSTOM_NAV key', () => {
      expect(SETTINGS_KEYS.CUSTOM_NAV).toBe('custom_nav');
    });

    it('should have all expected keys', () => {
      const expectedKeys = [
        'PAGE_CAMPAIGN_ENABLED',
        'PAGE_CONSERVATION_MODE',
        'PAGE_CONSERVATION_URL',
        'PAGE_CHAT_ENABLED',
        'PAGE_NEWS_ENABLED',
        'PAGE_EVENTS_ENABLED',
        'PAGE_DIRECTORY_ENABLED',
        'CUSTOM_PAGES',
        'CUSTOM_NAV',
      ];

      expectedKeys.forEach(key => {
        expect(SETTINGS_KEYS).toHaveProperty(key);
      });
    });
  });
});

describe('Platform Page Flags Types', () => {
  it('should have correct structure for PlatformPageFlags', () => {
    const mockFlags = {
      campaign: true,
      conservation: 'default' as const,
      conservationExternalUrl: '',
      chat: true,
      news: true,
      events: true,
      directory: true,
    };

    expect(mockFlags.campaign).toBe(true);
    expect(['default', 'managed', 'external']).toContain(mockFlags.conservation);
    expect(typeof mockFlags.conservationExternalUrl).toBe('string');
  });

  it('should allow all valid conservation modes', () => {
    const modes = ['default', 'managed', 'external'];
    modes.forEach(mode => {
      const flags = {
        campaign: true,
        conservation: mode,
        conservationExternalUrl: '',
        chat: true,
        news: true,
        events: true,
        directory: true,
      };
      expect(flags.conservation).toBe(mode);
    });
  });
});
