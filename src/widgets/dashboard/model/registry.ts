import type { ComponentType } from 'react';
import type { WidgetManifest } from './types';

/**
 * Widget component type - for backward compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetComponent = ComponentType<any>;

/**
 * Widget registry entry for admin UI
 */
export interface WidgetRegistryEntry {
  id: string;
  name: string;
  description?: string;
  featureFlag?: string;
  premium?: boolean;
  category?: 'core' | 'content' | 'communication' | 'premium' | 'utility';
}

/**
 * WidgetRegistry - Class-based registry with manifest support
 * Replaces plain object registry with Map for O(1) lookups
 */
class WidgetRegistry {
  private manifests = new Map<string, WidgetManifest>();

  /**
   * Register a widget with its manifest
   */
  register(manifest: WidgetManifest): void {
    if (this.manifests.has(manifest.id)) {
      console.warn(`[WidgetRegistry] Overwriting widget: ${manifest.id}`);
    }
    this.manifests.set(manifest.id, manifest);
  }

  /**
   * Resolve a widget manifest by ID
   */
  resolve(id: string): WidgetManifest | undefined {
    return this.manifests.get(id);
  }

  /**
   * List all registered widget manifests
   */
  list(): WidgetManifest[] {
    return [...this.manifests.values()];
  }

  /**
   * List widgets by category
   */
  listByCategory(category: string): WidgetManifest[] {
    return this.list().filter(m => m.category === category);
  }

  /**
   * List premium widgets only
   */
  listPremium(): WidgetManifest[] {
    return this.list().filter(m => m.premium);
  }

  /**
   * Filter widgets by feature flags and user role
   */
  listForContext(enabledFeatures: string[], userRole: string): WidgetManifest[] {
    return this.list().filter(m => {
      if (m.featureFlag && !enabledFeatures.includes(m.featureFlag)) return false;
      if (
        m.permissions &&
        !m.permissions.includes(userRole as 'resident' | 'board' | 'admin' | 'agent')
      )
        return false;
      return true;
    });
  }
}

// Create singleton instance
export const registry = new WidgetRegistry();

// Import widgets to auto-register them
// This import must come after registry is defined
import './widgets';

// ═══════════════════════════════════════════════════════════════
// BACKWARD-COMPATIBLE EXPORTS - preserve existing API
// ═══════════════════════════════════════════════════════════════

/**
 * Get widget component by ID
 * @param widgetId - The widget identifier
 * @returns The widget component or undefined if not found
 */
export function getWidgetComponent(widgetId: string): WidgetComponent | undefined {
  return registry.resolve(widgetId)?.component as WidgetComponent | undefined;
}

/**
 * Get widget metadata by ID
 * @param widgetId - The widget identifier
 * @returns The widget metadata or undefined if not found
 */
export function getWidgetMetadata(widgetId: string): WidgetRegistryEntry | undefined {
  const m = registry.resolve(widgetId);
  if (!m) return undefined;
  // Map to existing shape for admin UI
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    featureFlag: m.featureFlag,
    premium: m.premium,
    category: m.category,
  };
}

/**
 * Check if a widget exists in the registry
 * @param widgetId - The widget identifier
 * @returns true if widget exists
 */
export function hasWidget(widgetId: string): boolean {
  return registry.resolve(widgetId) !== undefined;
}

/**
 * Get all registered widget metadata (for admin UI)
 */
export function getAllWidgets(): WidgetRegistryEntry[] {
  return registry.list().map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    featureFlag: m.featureFlag,
    premium: m.premium,
    category: m.category,
  }));
}

/**
 * Get widgets by category
 * @param category - The category to filter by
 * @returns Array of widget metadata in the category
 */
export function getWidgetsByCategory(category: string): WidgetRegistryEntry[] {
  return registry.listByCategory(category).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    featureFlag: m.featureFlag,
    premium: m.premium,
    category: m.category,
  }));
}

/**
 * Get premium widgets
 * @returns Array of premium widget metadata
 */
export function getPremiumWidgets(): WidgetRegistryEntry[] {
  return registry.listPremium().map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    featureFlag: m.featureFlag,
    premium: m.premium,
    category: m.category,
  }));
}

// Export the class for direct usage if needed
export { WidgetRegistry };

// Export registry instance
export { registry as widgetRegistry };

/**
 * BACKWARD-COMPATIBLE: Export WIDGET_REGISTRY as object for tests
 * Maps widget IDs to component and metadata
 */
export const WIDGET_REGISTRY: Record<
  string,
  { component: WidgetComponent; metadata: WidgetRegistryEntry }
> = (() => {
  const entries: Record<string, { component: WidgetComponent; metadata: WidgetRegistryEntry }> = {};
  for (const manifest of registry.list()) {
    entries[manifest.id] = {
      component: manifest.component as WidgetComponent,
      metadata: {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        featureFlag: manifest.featureFlag,
        premium: manifest.premium,
        category: manifest.category,
      },
    };
  }
  return entries;
})();
