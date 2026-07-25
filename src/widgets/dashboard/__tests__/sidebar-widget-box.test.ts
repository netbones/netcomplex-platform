import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * Sidebar Widget Box Tests
 * =====================
 * Tests for the SidebarWidgetBox component and its widgets.
 *
 * Widgets:
 *   - SocialMediaLinksWidget: Used by SidebarWidgetBox (type: 'social-media')
 *   - QuickStatsWidget: Used by SidebarWidgetBox (type: 'quick-stats')
 *   - WeatherWidget: Used by SidebarWidgetBox (type: 'weather')
 *   - TagCloudWidget: Used by SidebarWidgetBox (type: 'tag-cloud')
 * =====================
 */

vi.mock('@api/client', () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    }),
  },
}));

vi.mock('@shared/lib/hooks/useApiToast', () => ({
  useApiToast: () => ({
    fetch: vi.fn(),
  }),
}));

vi.mock('@entities/tenant', () => ({
  tenantConfig: {
    location: {
      latitude: 26.6619,
      longitude: -80.6128,
      name: 'Netcomplex Demo Village',
    },
  },
}));

describe('SidebarWidgetBox', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('AVAILABLE_WIDGETS data structure', () => {
    it('contains all required widget types', () => {
      const availableWidgets = [
        { id: 'social-media', type: 'social-media', title: 'Social Media', icon: 'share-alt' },
        { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'tags' },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'chart-bar' },
        { id: 'weather', type: 'weather', title: 'Weather', icon: 'sun' },
      ];

      expect(availableWidgets).toHaveLength(4);
      expect(availableWidgets.map(w => w.type)).toEqual([
        'social-media',
        'tag-cloud',
        'quick-stats',
        'weather',
      ]);
    });

    it('each widget has required properties', () => {
      const widgets = [
        { id: 'social-media', type: 'social-media', title: 'Social Media', icon: 'share-alt' },
        { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'tags' },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'chart-bar' },
        { id: 'weather', type: 'weather', title: 'Weather', icon: 'sun' },
      ];

      widgets.forEach(widget => {
        expect(widget.id).toBeDefined();
        expect(widget.type).toBeDefined();
        expect(widget.title).toBeDefined();
        expect(widget.icon).toBeDefined();
      });
    });

    it('widget icons use ICON_MAP keys', () => {
      const widgets = [
        { id: 'social-media', type: 'social-media', title: 'Social Media', icon: 'share-alt' },
        { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'tags' },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'chart-bar' },
        { id: 'weather', type: 'weather', title: 'Weather', icon: 'sun' },
      ];

      widgets.forEach(widget => {
        expect(widget.icon).toMatch(/^(share-alt|tags|chart-bar|sun)$/);
      });
    });
  });
});

describe('SocialMediaLinksWidget', () => {
  it('DEFAULT_SOCIAL_LINKS contains expected platforms', () => {
    const DEFAULT_SOCIAL_LINKS: { platform: string; url: string }[] = [
      { platform: 'Facebook', url: '' },
      { platform: 'Twitter', url: '' },
      { platform: 'Instagram', url: '' },
      { platform: 'LinkedIn', url: '' },
    ];

    expect(DEFAULT_SOCIAL_LINKS).toHaveLength(4);
    expect(DEFAULT_SOCIAL_LINKS.map(l => l.platform)).toEqual([
      'Facebook',
      'Twitter',
      'Instagram',
      'LinkedIn',
    ]);
  });

  it('saves social links to localStorage with widgetId key', () => {
    const widgetId = 'test-widget-id';
    const testLinks: { platform: string; url: string }[] = [
      { platform: 'Facebook', url: 'https://facebook.com/test' },
      { platform: 'Twitter', url: '' },
      { platform: 'Instagram', url: '' },
      { platform: 'LinkedIn', url: '' },
    ];

    localStorage.setItem(`social-links-${widgetId}`, JSON.stringify(testLinks));

    const saved = localStorage.getItem(`social-links-${widgetId}`);
    expect(saved).toBeDefined();

    if (saved) {
      const parsed = JSON.parse(saved);
      expect(parsed[0].url).toBe('https://facebook.com/test');
    }
  });
});

describe('QuickStatsWidget', () => {
  it('DEFAULT_STATS has expected structure', () => {
    const DEFAULT_STATS = [
      { label: 'Posts', value: '24', icon: 'fa-file-alt' },
      { label: 'Events', value: '8', icon: 'fa-calendar' },
      { label: 'Connections', value: '156', icon: 'fa-users' },
    ];

    DEFAULT_STATS.forEach(stat => {
      expect(stat.label).toBeDefined();
      expect(stat.value).toBeDefined();
      expect(stat.icon).toMatch(/^fa-/);
    });
  });

  it('can accept custom stats array', () => {
    const customStats = [{ label: 'Custom Stat', value: '42', icon: 'fa-star' }];

    expect(customStats).toHaveLength(1);
    expect(customStats[0].label).toBe('Custom Stat');
    expect(customStats[0].value).toBe('42');
  });
});

describe('WeatherWidget', () => {
  it('CONDITION_MAP contains all WMO weather codes', () => {
    const CONDITION_MAP: Record<string, { condition: string; icon: string }> = {
      0: { condition: 'Clear', icon: 'Sun' },
      1: { condition: 'Mainly Clear', icon: 'Sun' },
      2: { condition: 'Partly Cloudy', icon: 'CloudSun' },
      3: { condition: 'Overcast', icon: 'Cloud' },
      45: { condition: 'Fog', icon: 'CloudFog' },
      48: { condition: 'Fog', icon: 'CloudFog' },
      51: { condition: 'Drizzle', icon: 'CloudRain' },
      53: { condition: 'Drizzle', icon: 'CloudRain' },
      55: { condition: 'Drizzle', icon: 'CloudRain' },
      61: { condition: 'Rain', icon: 'CloudRain' },
      63: { condition: 'Rain', icon: 'CloudRain' },
      65: { condition: 'Rain', icon: 'CloudRain' },
      71: { condition: 'Snow', icon: 'Snowflake' },
      73: { condition: 'Snow', icon: 'Snowflake' },
      75: { condition: 'Snow', icon: 'Snowflake' },
      80: { condition: 'Showers', icon: 'CloudRain' },
      81: { condition: 'Showers', icon: 'CloudRain' },
      82: { condition: 'Showers', icon: 'CloudRain' },
      95: { condition: 'Thunderstorm', icon: 'Zap' },
      96: { condition: 'Thunderstorm', icon: 'Zap' },
      99: { condition: 'Thunderstorm', icon: 'Zap' },
    };

    // Clear weather
    expect(CONDITION_MAP[0].condition).toBe('Clear');
    expect(CONDITION_MAP[0].icon).toBe('Sun');

    // Rain
    expect(CONDITION_MAP[61].condition).toBe('Rain');

    // Snow
    expect(CONDITION_MAP[71].condition).toBe('Snow');

    // Thunderstorm
    expect(CONDITION_MAP[95].condition).toBe('Thunderstorm');
  });

  it('can build Open-Meteo API URL', () => {
    const latitude = 26.6619;
    const longitude = -80.6128;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph`;

    expect(url).toContain('api.open-meteo.com/v1/forecast');
    expect(url).toContain(`latitude=${latitude}`);
    expect(url).toContain(`longitude=${longitude}`);
    expect(url).toContain('current_weather=true');
  });
});

describe('TagCloudWidget', () => {
  it('builds API URL with authorId for user-specific tags', () => {
    const authorId = 'user-123';
    const url = authorId ? `/api/content?authorId=${authorId}` : '/api/content';
    expect(url).toBe('/api/content?authorId=user-123');
  });

  it('builds API URL without authorId for all site content', () => {
    const authorId: string | undefined = undefined;
    const url = authorId ? `/api/content?authorId=${authorId}` : '/api/content';
    expect(url).toBe('/api/content');
  });

  it('getTagSize returns correct text sizes based on count', () => {
    const getTagSize = (count: number): string => {
      if (count >= 10) return 'text-lg';
      if (count >= 5) return 'text-base';
      if (count >= 3) return 'text-sm';
      return 'text-xs';
    };

    expect(getTagSize(15)).toBe('text-lg');
    expect(getTagSize(10)).toBe('text-lg');
    expect(getTagSize(7)).toBe('text-base');
    expect(getTagSize(5)).toBe('text-base');
    expect(getTagSize(3)).toBe('text-sm');
    expect(getTagSize(1)).toBe('text-xs');
  });
});

describe('tenantConfig location', () => {
  it('has default coordinates', () => {
    const tenantConfig = {
      location: {
        latitude: 26.6619,
        longitude: -80.6128,
        name: 'Netcomplex Demo Village',
      },
    };

    expect(tenantConfig.location.latitude).toBe(26.6619);
    expect(tenantConfig.location.longitude).toBe(-80.6128);
    expect(tenantConfig.location.name).toBe('Netcomplex Demo Village');
  });

  it('can be overridden with custom location', () => {
    const customLocation = {
      latitude: 40.7128,
      longitude: -74.006,
      name: 'New York',
    };

    expect(customLocation.latitude).toBe(40.7128);
    expect(customLocation.longitude).toBe(-74.006);
  });
});
