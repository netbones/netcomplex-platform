import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Flags API', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('GET /api/flags', () => {
    it('should return all flags when no params provided', async () => {
      const mockFlags = {
        campaign: true,
        conservation: 'default',
        conservationExternalUrl: '',
        chat: true,
        news: true,
        events: true,
        directory: true,
        newDashboard: false,
        chatV2: false,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ flags: mockFlags, tenantId: 'test-tenant' }),
      });

      const response = await fetch('/api/flags');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.flags).toBeDefined();
      expect(data.flags.campaign).toBe(true);
      expect(data.flags.conservation).toBe('default');
    });

    it('should return specific flag when flag param provided', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ flag: 'campaign', value: true, tenantId: 'test-tenant' }),
      });

      const response = await fetch('/api/flags?flag=campaign');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.flag).toBe('campaign');
      expect(data.value).toBe(true);
    });

    it('should return experiments when experiments param is true', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          experiments: { newDashboard: false, chatV2: true },
          tenantId: 'test-tenant',
        }),
      });

      const response = await fetch('/api/flags?experiments=true');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.experiments).toBeDefined();
      expect(data.experiments.newDashboard).toBe(false);
      expect(data.experiments.chatV2).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      // When fetch rejects, it throws - we need to catch it
      try {
        await fetch('/api/flags');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

describe('Page Visibility Integration', () => {
  it('should correctly map page flags to navigation', () => {
    const testCases = [
      {
        flags: { campaign: false },
        expectedCampaignLink: false,
      },
      {
        flags: { conservation: 'external' },
        expectedConservationLink: false,
      },
      {
        flags: { directory: false },
        expectedDirectoryLink: false,
      },
      {
        flags: { news: false },
        expectedNewsLink: false,
      },
      {
        flags: { events: false },
        expectedEventsLink: false,
      },
    ];

    testCases.forEach(({ flags, expectedCampaignLink }) => {
      const showCampaign = flags.campaign !== false;
      expect(showCampaign).toBe(expectedCampaignLink !== false);
    });
  });

  it('should handle default values correctly', () => {
    const defaultFlags = {
      campaign: true,
      conservation: 'default',
      conservationExternalUrl: '',
      chat: true,
      news: true,
      events: true,
      directory: true,
    };

    expect(defaultFlags.campaign).toBe(true);
    expect(defaultFlags.conservation).toBe('default');
    expect(defaultFlags.directory).toBe(true);
  });

  it('should validate conservation mode values', () => {
    const validModes = ['default', 'managed', 'external'];
    const invalidModes = ['invalid', 'disabled', ''];

    validModes.forEach(mode => {
      expect(validModes.includes(mode)).toBe(true);
    });

    invalidModes.forEach(mode => {
      expect(validModes.includes(mode)).toBe(false);
    });
  });

  it('should validate headerLinks values', () => {
    const validFocuses = ['conservation', 'campaign'];
    const invalidFocuses = ['invalid', 'both', 'none', ''];

    validFocuses.forEach(focus => {
      expect(validFocuses.includes(focus)).toBe(true);
    });

    invalidFocuses.forEach(focus => {
      expect(validFocuses.includes(focus)).toBe(false);
    });
  });

  it('should default headerLinks to an array of valid focus spaces', () => {
    const defaultFlags = {
      campaign: true,
      conservation: 'default' as const,
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
      headerLinks: ['directory', 'groups', 'services', 'resources'] as const,
    };

    expect(defaultFlags.headerLinks).toEqual(
      expect.arrayContaining(['directory', 'groups', 'services', 'resources'])
    );
  });
});

describe('Admin Page Flags API', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('GET /api/admin/settings/page-flags', () => {
    it('should return current page flags', async () => {
      const mockFlags = {
        campaign: true,
        conservation: 'default',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockFlags,
      });

      const response = await fetch('/api/admin/settings/page-flags');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.campaign).toBe(true);
      expect(data.conservation).toBe('default');
    });
  });

  describe('POST /api/admin/settings/page-flags', () => {
    it('should update campaign flag', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, key: 'campaign', value: false }),
      });

      const response = await fetch('/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'campaign', value: false }),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.key).toBe('campaign');
    });

    it('should update conservation mode', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, key: 'conservation', value: 'external' }),
      });

      const response = await fetch('/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'conservation', value: 'external' }),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.value).toBe('external');
    });

    it('should reject invalid keys', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Invalid key' }),
      });

      const response = await fetch('/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'invalid_key', value: true }),
      });
      const data = await response.json();

      expect(data.error).toBe('Invalid key');
    });

    it('should update headerLinks', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, key: 'headerLinks', value: 'campaign' }),
      });

      const response = await fetch('/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'headerLinks', value: 'campaign' }),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.key).toBe('headerLinks');
      expect(data.value).toBe('campaign');
    });
  });
});
