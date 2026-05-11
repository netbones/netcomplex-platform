'use client';

import { ReactNode, Suspense, lazy } from 'react';
import { useTenant } from '@entities/tenant';
import type { Tenant } from '@entities/tenant';
import { isFeatureEnabled } from '@entities/tenant/api/features/registry';
import { ErrorBoundary } from '@shared/ui';
import { registry } from '../model/registry';
import type { WidgetManifest } from '../model/types';

interface WidgetRendererProps {
  widgetId: string;
  /** Optional fallback UI while widget loads */
  fallback?: ReactNode;
}

/**
 * Get widget manifest from registry
 */
function getWidgetManifest(widgetId: string): WidgetManifest | undefined {
  return registry.resolve(widgetId);
}

/**
 * Check if a widget should be rendered based on tenant feature access.
 * Uses manifest featureFlag only - no dual-source lookup
 */
function canRenderWidget(widgetId: string, tenant: Tenant | null): boolean {
  // If no tenant context, show all widgets (e.g., public pages)
  if (!tenant) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[WidgetRenderer] No tenant context, showing all widgets');
    }
    return true;
  }

  // Get feature flag from manifest only (no dual-source lookup)
  const manifest = getWidgetManifest(widgetId);
  if (manifest?.featureFlag) {
    return isFeatureEnabled(tenant, manifest.featureFlag);
  }

  // No feature flag means widget is always visible
  return true;
}

/**
 * Error fallback when widget fails to load
 */
function WidgetErrorFallback({ widgetId }: { widgetId: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[100px] text-gray-500">
      <div className="text-center">
        <p className="text-sm font-medium">Widget failed to load</p>
        <p className="text-xs text-gray-400 mt-1">{widgetId}</p>
      </div>
    </div>
  );
}

/**
 * Loading fallback for lazy-loaded widgets
 */
function WidgetLoadingFallback({ widgetId }: { widgetId: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[100px]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
        <div className="h-3 w-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

/**
 * Unknown widget fallback when widget ID is not in registry
 */
function UnknownWidget({ widgetId }: { widgetId: string }) {
  return (
    <ErrorBoundary>
      <div className="flex items-center justify-center h-full min-h-[100px] text-gray-500">
        <div className="text-center">
          <p className="text-sm font-medium">Widget not found</p>
          <p className="text-xs text-gray-400 mt-1">{widgetId}</p>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export function WidgetRenderer({ widgetId, fallback }: WidgetRendererProps): ReactNode {
  const tenant = useTenant();

  // Check feature access before rendering
  if (!canRenderWidget(widgetId, tenant)) {
    return null;
  }

  // Get manifest from registry
  const manifest = getWidgetManifest(widgetId);

  if (!manifest) {
    return <UnknownWidget widgetId={widgetId} />;
  }

  // Render widget with Suspense and ErrorBoundary for lazy loading
  const loadingFallback = fallback ?? <WidgetLoadingFallback widgetId={widgetId} />;

  return (
    <ErrorBoundary fallback={<WidgetErrorFallback widgetId={widgetId} />}>
      <Suspense fallback={loadingFallback}>
        <manifest.component />
      </Suspense>
    </ErrorBoundary>
  );
}
