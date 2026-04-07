import { describe, it, expect } from 'vitest';
import {
  WIDGET_REGISTRY,
  getWidgetComponent,
  getWidgetMetadata,
  hasWidget,
  getAllWidgets,
  getWidgetsByCategory,
  getPremiumWidgets,
} from '@/components/registry';

describe('Widget Registry', () => {
  describe('WIDGET_REGISTRY', () => {
    it('should contain 18 registered widgets', () => {
      expect(Object.keys(WIDGET_REGISTRY)).toHaveLength(18);
    });

    it('should have all required widget IDs', () => {
      const expectedWidgets = [
        'stats',
        'quick-actions',
        'recent-activity',
        'notifications',
        'messages',
        'events',
        'my-content',
        'bookshelf',
        'media',
        'my-album',
        'sidebar-widgets',
        'premium-portfolio',
        'households',
        'agent-dashboard',
        'solo-seat',
        'my-services',
        'service-inquiries',
        'community-graph-widget',
      ];
      const actualWidgets = Object.keys(WIDGET_REGISTRY);
      expectedWidgets.forEach(widget => {
        expect(actualWidgets).toContain(widget);
      });
    });
  });

  describe('getWidgetComponent', () => {
    it('should return component for valid widget ID', () => {
      const component = getWidgetComponent('stats');
      expect(component).toBeDefined();
      expect(typeof component).toBe('function');
    });

    it('should return undefined for invalid widget ID', () => {
      const component = getWidgetComponent('invalid-widget');
      expect(component).toBeUndefined();
    });

    it('should return components for all registered widgets', () => {
      Object.keys(WIDGET_REGISTRY).forEach(widgetId => {
        const component = getWidgetComponent(widgetId);
        expect(component).toBeDefined();
      });
    });
  });

  describe('getWidgetMetadata', () => {
    it('should return metadata for valid widget ID', () => {
      const metadata = getWidgetMetadata('stats');
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('stats');
      expect(metadata?.name).toBe('Dashboard Stats');
      expect(metadata?.category).toBe('core');
    });

    it('should return undefined for invalid widget ID', () => {
      const metadata = getWidgetMetadata('invalid-widget');
      expect(metadata).toBeUndefined();
    });

    it('should include description in metadata', () => {
      const metadata = getWidgetMetadata('stats');
      expect(metadata?.description).toBeDefined();
    });
  });

  describe('hasWidget', () => {
    it('should return true for registered widget', () => {
      expect(hasWidget('stats')).toBe(true);
      expect(hasWidget('messages')).toBe(true);
      expect(hasWidget('community-graph-widget')).toBe(true);
    });

    it('should return false for unregistered widget', () => {
      expect(hasWidget('invalid-widget')).toBe(false);
      expect(hasWidget('')).toBe(false);
    });
  });

  describe('getAllWidgets', () => {
    it('should return all widget metadata', () => {
      const allWidgets = getAllWidgets();
      expect(allWidgets).toHaveLength(18);
    });

    it('should include metadata for each widget', () => {
      const allWidgets = getAllWidgets();
      allWidgets.forEach(widget => {
        expect(widget.id).toBeDefined();
        expect(widget.name).toBeDefined();
        expect(widget.category).toBeDefined();
      });
    });
  });

  describe('getWidgetsByCategory', () => {
    it('should return core widgets', () => {
      const coreWidgets = getWidgetsByCategory('core');
      expect(coreWidgets.length).toBeGreaterThan(0);
      coreWidgets.forEach(widget => {
        expect(widget.category).toBe('core');
      });
    });

    it('should return content widgets', () => {
      const contentWidgets = getWidgetsByCategory('content');
      expect(contentWidgets.length).toBeGreaterThan(0);
      contentWidgets.forEach(widget => {
        expect(widget.category).toBe('content');
      });
    });

    it('should return premium widgets', () => {
      const premiumWidgets = getWidgetsByCategory('premium');
      expect(premiumWidgets.length).toBeGreaterThan(0);
      premiumWidgets.forEach(widget => {
        expect(widget.category).toBe('premium');
      });
    });

    it('should return empty array for non-existent category', () => {
      const widgets = getWidgetsByCategory('non-existent');
      expect(widgets).toHaveLength(0);
    });
  });

  describe('getPremiumWidgets', () => {
    it('should return premium widgets', () => {
      const premiumWidgets = getPremiumWidgets();
      expect(premiumWidgets.length).toBeGreaterThan(0);
      premiumWidgets.forEach(widget => {
        expect(widget.premium).toBe(true);
      });
    });

    it('should include premium-portfolio', () => {
      const premiumWidgets = getPremiumWidgets();
      const portfolioWidget = premiumWidgets.find(w => w.id === 'premium-portfolio');
      expect(portfolioWidget).toBeDefined();
      expect(portfolioWidget?.premium).toBe(true);
    });
  });

  describe('Widget metadata validation', () => {
    it('should have correct premium flag for premium widgets', () => {
      const premiumWidgets = ['premium-portfolio', 'agent-dashboard', 'community-graph-widget'];
      premiumWidgets.forEach(widgetId => {
        const metadata = getWidgetMetadata(widgetId);
        expect(metadata?.premium).toBe(true);
      });
    });

    it('should have featureFlag for widgets that require it', () => {
      const widgetsWithFeatureFlag = getAllWidgets().filter(w => w.featureFlag);
      expect(widgetsWithFeatureFlag.length).toBeGreaterThan(0);
    });

    it('should have unique IDs for all widgets', () => {
      const allWidgets = getAllWidgets();
      const ids = allWidgets.map(w => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
