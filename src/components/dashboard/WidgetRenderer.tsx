'use client';

import { ReactNode } from 'react';
import { useTenant } from '@/lib/tenant/context';
import { isFeatureEnabled } from '@/lib/features/registry';
import { WIDGET_FEATURE_MAP } from '@/lib/dashboard-config';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DashboardStats } from './DashboardStats';
import { QuickActionsWidget } from './QuickActionsWidget';
import { RecentActivityWidget } from './RecentActivityWidget';
import { EventsWidget } from './EventsWidget';
import { NotificationsWidget } from './NotificationsWidget';
import { MessagesWidget } from './MessagesWidget';
import { UserContentWidget } from './UserContentWidget';
import { BookshelfWidget } from './BookshelfWidget';
import { MediaWidget } from './MediaWidget';
import { MyAlbumWidget } from './MyAlbumWidget';
import { SidebarWidgetBox } from './SidebarWidgetBox';
import { PremiumPortfolioWidget } from './PremiumPortfolioWidget';
import { HouseholdsWidget } from './HouseholdsWidget';
import { AgentDashboardWidget } from './AgentDashboardWidget';
import { SoloSeatWidget } from './SoloSeatWidget';
import { MyServicesWidget } from './MyServicesWidget';
import { ServiceInquiriesWidget } from './ServiceInquiriesWidget';
import { CommunityGraphWidget } from './CommunityGraphWidget';

interface WidgetRendererProps {
  widgetId: string;
}

/**
 * Check if a widget should be rendered based on tenant feature access.
 * - Returns true if no tenant context is available (e.g., public pages)
 * - Returns true for utility widgets with no feature mapping
 * - Returns true if tenant has access to the widget's feature
 */
function canRenderWidget(
  widgetId: string,
  tenant: { subscriptionTier: string; featureFlags?: Record<string, boolean> } | null
): boolean {
  // If no tenant context, show all widgets (e.g., public pages)
  if (!tenant) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[WidgetRenderer] No tenant context, showing all widgets');
    }
    return true;
  }

  // Utility widgets available to all tenants (no feature restriction)
  const featureKey = WIDGET_FEATURE_MAP[widgetId];
  if (!featureKey) {
    return true;
  }

  // Check if tenant has access to the feature
  return isFeatureEnabled(tenant, featureKey);
}

export function WidgetRenderer({ widgetId }: WidgetRendererProps): ReactNode {
  const tenant = useTenant();

  // Check feature access before rendering
  if (!canRenderWidget(widgetId, tenant)) {
    return null;
  }

  switch (widgetId) {
    case 'stats':
      return <DashboardStats />;
    case 'quick-actions':
      return <QuickActionsWidget />;
    case 'recent-activity':
      return <RecentActivityWidget />;
    case 'notifications':
      return <NotificationsWidget />;
    case 'events':
      return <EventsWidget />;
    case 'messages':
      return <MessagesWidget />;
    case 'my-content':
      return <UserContentWidget />;
    case 'bookshelf':
      return <BookshelfWidget />;
    case 'media':
      return <MediaWidget />;
    case 'my-album':
      return <MyAlbumWidget />;
    case 'sidebar-widgets':
      return <SidebarWidgetBox />;
    case 'premium-portfolio':
      return <PremiumPortfolioWidget />;
    case 'my-services':
      return <MyServicesWidget />;
    case 'service-inquiries':
      return <ServiceInquiriesWidget />;
    case 'community-graph-widget':
      return <CommunityGraphWidget />;
    default:
      return (
        <ErrorBoundary>
          <div className="text-center py-4 text-gray-500">
            <p>Widget "{widgetId}" not implemented</p>
          </div>
        </ErrorBoundary>
      );
  }
}
