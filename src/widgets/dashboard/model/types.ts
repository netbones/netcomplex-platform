import type { LucideIcon } from 'lucide-react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { SpaceId } from './spaces';

/**
 * Widget manifest - complete metadata for widget registration
 * Extends existing WidgetRegistryEntry with NetComplex alignment
 */
export interface WidgetManifest {
  // Identity
  /** Unique widget identifier */
  id: string;
  /** Semantic version (REQUIRED for NetComplex) */
  version: string;
  /** Display name */
  name: string;
  /** Description for admin UI */
  description?: string;
  /** Widget author - 'internal', 'netcomplex-premium', or custom string */
  author: 'internal' | 'netcomplex-premium' | string;

  // Display
  /** Lucide icon component (REQUIRED for NetComplex) */
  icon: LucideIcon;
  /** Category for organizing widgets */
  category: 'core' | 'content' | 'communication' | 'premium' | 'utility';

  // Component loading
  /** Lazy-loaded React component */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: LazyExoticComponent<any>;
  /** Optional loader function for code splitting */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader?: () => Promise<any>;

  // Access control
  /** Feature flag required to render */
  featureFlag?: string;
  /** Whether this is a premium/paid widget */
  premium?: boolean;
  /** Required permissions for this widget */
  permissions?: ('resident' | 'board' | 'admin' | 'agent')[];

  // Layout constraints (GRID UNITS)
  /** Default widget size in grid units */
  defaultSize: { width: number; height: number };
  /** Minimum widget size */
  minSize?: { width: number; height: number };
  /** Maximum widget size */
  maxSize?: { width: number; height: number };
  /** CSS class for drag handle */
  dragHandleClassName?: string;
  /** Lock aspect ratio during resize */
  lockAspectRatio?: boolean;

  // Config (future)
  /** JSON Schema for widget configuration */
  configSchema?: Record<string, unknown>;
  /** Config migration functions */
  migrations?: Record<string, (oldConfig: unknown) => unknown>;

  // Space assignments (Focus Spaces architecture — Phase 30-B)
  /** Which spaces this widget belongs to. Defaults to ['home'] if unspecified. */
  spaces: SpaceId[];
}

// Re-export existing types for backward compatibility
export type { WidgetComponent } from './registry';

// Additional export for backward compatibility
export type { WidgetRegistryEntry } from './registry';
