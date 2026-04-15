'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@shared/ui';
import { AdminStatsWidget } from './AdminStatsWidget';
import { AdminQuickLinksWidget } from './AdminQuickLinksWidget';
import { AdminActivityWidget } from './AdminActivityWidget';
import { AdminUserWidget } from './AdminUserWidget';
import { AdminContentWidget } from './AdminContentWidget';
import { AdminSystemWidget } from './AdminSystemWidget';
import { ModerationQueueWidget } from './ModerationQueueWidget';
import { MarketplaceAnalyticsWidget } from './MarketplaceAnalyticsWidget';
import { ServiceQualityWidget } from './ServiceQualityWidget';
import { MaintenanceRequestsWidget, MaintenanceAnalyticsWidget } from '@widgets/maintenance';
import { PageSettingsWidget } from './PageSettingsWidget';

interface WidgetRendererProps {
  widgetId: string;
}

export function AdminWidgetRenderer({ widgetId }: WidgetRendererProps): ReactNode {
  switch (widgetId) {
    case 'admin-stats':
      return <AdminStatsWidget />;
    case 'admin-quick-links':
      return <AdminQuickLinksWidget />;
    case 'admin-activity':
      return <AdminActivityWidget />;
    case 'admin-users':
      return <AdminUserWidget />;
    case 'admin-content':
      return <AdminContentWidget />;
    case 'admin-system':
      return <AdminSystemWidget />;
    case 'moderation-queue':
      return <ModerationQueueWidget />;
    case 'marketplace-analytics':
      return <MarketplaceAnalyticsWidget />;
    case 'service-quality':
      return <ServiceQualityWidget />;
    case 'maintenance-requests':
      return <MaintenanceRequestsWidget />;
    case 'maintenance-analytics':
      return <MaintenanceAnalyticsWidget />;
    case 'page-settings':
      return <PageSettingsWidget />;
    default:
      return (
        <ErrorBoundary>
          <div className="text-center py-4 text-gray-500">
            <p>Admin widget "{widgetId}" not implemented</p>
          </div>
        </ErrorBoundary>
      );
  }
}
