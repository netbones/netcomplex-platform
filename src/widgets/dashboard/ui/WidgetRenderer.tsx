'use client';

import { ReactNode } from 'react';
import { useTenant } from '@api/tenant';
import type { Tenant } from '@api/tenant';
import { isFeatureEnabled } from '@api/features/registry';
import { WIDGET_FEATURE_MAP } from '@/lib/dashboard-config';
import { ErrorBoundary } from '@shared/ui';
import { getWidgetComponent, getWidgetMetadata, hasWidget } from '../model/registry';

interface WidgetRendererProps {
  widgetId: string;
}

/**
 * Check if a widget should be rendered based on tenant feature access.
 * - Returns true if no tenant context is available (e.g., public pages)
 * - Returns true for utility widgets with no feature mapping
 * - Returns true if tenant has access to the widget's feature
 */
function canRenderWidget(widgetId: string, tenant: Tenant | null): boolean {
  // If no tenant context, show all widgets (e.g., public pages)
  if (!tenant) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[WidgetRenderer] No tenant context, showing all widgets');
    }
    return true;
  }

  // Get feature flag from registry metadata first
  const metadata = getWidgetMetadata(widgetId);
  if (metadata?.featureFlag) {
    return isFeatureEnabled(tenant, metadata.featureFlag);
  }

  // Fallback to dashboard-config mapping
  const featureKey = WIDGET_FEATURE_MAP[widgetId];
  if (!featureKey) {
    return true;
  }

  // Check if tenant has access to the feature
  return isFeatureEnabled(tenant, featureKey);
}

/**
 * Error fallback when widget fails to render
 */
function WidgetErrorFallback({ widgetId }: { widgetId: string }) {
  return (
    <div className="text-center py-4 text-gray-500">
      <p>Widget "{widgetId}" failed to load</p>
    </div>
  );
}

/**
 * Unknown widget fallback when widget ID is not in registry
 */
function UnknownWidget({ widgetId }: { widgetId: string }) {
  return (
    <ErrorBoundary>
      <div className="text-center py-4 text-gray-500">
        <p>Widget "{widgetId}" not found</p>
      </div>
    </ErrorBoundary>
  );
}

export function WidgetRenderer({ widgetId }: WidgetRendererProps): ReactNode {
  const tenant = useTenant();

  // Check feature access before rendering
  if (!canRenderWidget(widgetId, tenant)) {
    return null;
  }

  // Check if widget exists in registry
  if (!hasWidget(widgetId)) {
    return <UnknownWidget widgetId={widgetId} />;
  }

  // Get component from registry
  const WidgetComponent = getWidgetComponent(widgetId);

  if (!WidgetComponent) {
    return <UnknownWidget widgetId={widgetId} />;
  }

  // Render widget with error boundary
  return (
    <ErrorBoundary fallback={<WidgetErrorFallback widgetId={widgetId} />}>
      <WidgetComponent />
    </ErrorBoundary>
  );
}
