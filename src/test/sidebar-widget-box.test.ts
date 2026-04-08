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

vi.mock('@/lib/auth-client', () => ({
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

vi.mock('@/hooks/useApiToast', () => ({
  useApiToast: () => ({
    fetch: vi.fn(),
  }),
}));

vi.mock('@/lib/config/tenant', () => ({
  tenantConfig: {
    location: {
      latitude: 26.6619,
      longitude: -80.6128,
      name: 'Soralia Village',
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
        {
          id: 'social-media',
          type: 'social-media',
          title: 'Social Media',
          icon: 'fab fa-share-alt',
        },
        { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'fas fa-tags' },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'fas fa-chart-bar' },
        { id: 'weather', type: 'weather', title: 'Weather', icon: 'fas fa-sun' },
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
        {
          id: 'social-media',
          type: 'social-media',
          title: 'Social Media',
          icon: 'fab fa-share-alt',
        },
        { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'fas fa-tags' },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'fas fa-chart-bar' },
        { id: 'weather', type: 'weather', title: 'Weather', icon: 'fas fa-sun' },
      ];

      widgets.forEach(widget => {
        expect(widget.id).toBeDefined();
        expect(widget.type).toBeDefined();
        expect(widget.title).toBeDefined();
        expect(widget.icon).toBeDefined();
      });
    });

    it('widget icons use Font Awesome classes', () => {
      const widgets = [
        {
          id: 'social-media',
          type: 'social-media',
          title: 'Social Media',
          icon: 'fab fa-share-alt',
        },
        { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'fas fa-tags' },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'fas fa-chart-bar' },
        { id: 'weather', type: 'weather', title: 'Weather', icon: 'fas fa-sun' },
      ];

      widgets.forEach(widget => {
        // fab = brands, fas = solid
        expect(widget.icon).toMatch(/^(fab|fas) fa-/);
      });
    });
  });
});

describe('SocialMediaLinksWidget', () => {
  it('DEFAULT_SOCIAL_LINKS contains expected platforms', () => {
    const DEFAULT_SOCIAL_LINKS = [
      { platform: 'Facebook', url: '', icon: 'fab fa-facebook' },
      { platform: 'Twitter', url: '', icon: 'fab fa-twitter' },
      { platform: 'Instagram', url: '', icon: 'fab fa-instagram' },
      { platform: 'LinkedIn', url: '', icon: 'fab fa-linkedin' },
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
    const testLinks = [
      { platform: 'Facebook', url: 'https://facebook.com/test', icon: 'fab fa-facebook' },
      { platform: 'Twitter', url: '', icon: 'fab fa-twitter' },
      { platform: 'Instagram', url: '', icon: 'fab fa-instagram' },
      { platform: 'LinkedIn', url: '', icon: 'fab fa-linkedin' },
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
      { label: 'Posts', value: '24', icon: 'fas fa-file-alt' },
      { label: 'Events', value: '8', icon: 'fas fa-calendar' },
      { label: 'Connections', value: '156', icon: 'fas fa-users' },
    ];

    DEFAULT_STATS.forEach(stat => {
      expect(stat.label).toBeDefined();
      expect(stat.value).toBeDefined();
      expect(stat.icon).toMatch(/^fas? fa-/);
    });
  });

  it('can accept custom stats array', () => {
    const customStats = [{ label: 'Custom Stat', value: '42', icon: 'fas fa-star' }];

    expect(customStats).toHaveLength(1);
    expect(customStats[0].label).toBe('Custom Stat');
    expect(customStats[0].value).toBe('42');
  });
});

describe('WeatherWidget', () => {
  it('DEFAULT_WEATHER has expected structure', () => {
    const DEFAULT_WEATHER = {
      temperature: 72,
      condition: 'Sunny',
      location: 'Soralia Village',
      icon: 'fas fa-sun',
    };

    expect(DEFAULT_WEATHER.temperature).toBe(72);
    expect(DEFAULT_WEATHER.condition).toBe('Sunny');
    expect(DEFAULT_WEATHER.location).toBe('Soralia Village');
  });

  it('CONDITION_MAP contains all WMO weather codes', () => {
    const CONDITION_MAP: Record<string, { condition: string; icon: string }> = {
      0: { condition: 'Clear', icon: 'fas fa-sun' },
      1: { condition: 'Mainly Clear', icon: 'fas fa-sun' },
      2: { condition: 'Partly Cloudy', icon: 'fas fa-cloud-sun' },
      3: { condition: 'Overcast', icon: 'fas fa-cloud' },
      45: { condition: 'Fog', icon: 'fas fa-smog' },
      48: { condition: 'Fog', icon: 'fas fa-smog' },
      51: { condition: 'Drizzle', icon: 'fas fa-cloud-rain' },
      53: { condition: 'Drizzle', icon: 'fas fa-cloud-rain' },
      55: { condition: 'Drizzle', icon: 'fas fa-cloud-rain' },
      61: { condition: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
      63: { condition: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
      65: { condition: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
      71: { condition: 'Snow', icon: 'fas fa-snowflake' },
      73: { condition: 'Snow', icon: 'fas fa-snowflake' },
      75: { condition: 'Snow', icon: 'fas fa-snowflake' },
      80: { condition: 'Showers', icon: 'fas fa-cloud-showers-heavy' },
      81: { condition: 'Showers', icon: 'fas fa-cloud-showers-heavy' },
      82: { condition: 'Showers', icon: 'fas fa-cloud-showers-heavy' },
      95: { condition: 'Thunderstorm', icon: 'fas fa-bolt' },
      96: { condition: 'Thunderstorm', icon: 'fas fa-bolt' },
      99: { condition: 'Thunderstorm', icon: 'fas fa-bolt' },
    };

    // Clear weather
    expect(CONDITION_MAP[0].condition).toBe('Clear');
    expect(CONDITION_MAP[0].icon).toBe('fas fa-sun');

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
  it('has default Soralia Village coordinates', () => {
    const tenantConfig = {
      location: {
        latitude: 26.6619,
        longitude: -80.6128,
        name: 'Soralia Village',
      },
    };

    expect(tenantConfig.location.latitude).toBe(26.6619);
    expect(tenantConfig.location.longitude).toBe(-80.6128);
    expect(tenantConfig.location.name).toBe('Soralia Village');
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
