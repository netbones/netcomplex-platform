'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@shared/ui';
import { AdminStatsWidget } from './AdminStatsWidget';
import { AdminQuickLinksWidget } from './AdminQuickLinksWidget';
import { AdminActivityWidget } from './AdminActivityWidget';
import { AdminUserWidget } from './AdminUserWidget';
import { AdminContentWidget } from './AdminContentWidget';
import { AdminSystemWidget } from './AdminSystemWidget';
import { MarketplaceAnalyticsWidget, ServiceQualityWidget } from '@widgets/service';
import { MaintenanceRequestsWidget, MaintenanceAnalyticsWidget } from '@widgets/maintenance';
import { PageSettingsWidget } from './PageSettingsWidget';
import { EventsWidget as AdminEventsWidget } from './EventsWidget';
import { CompetitionList } from './CompetitionList';
import { ResourceList } from './ResourceList';
import { SurveysWidget } from './SurveysWidget';
import { AdminAnnouncementsWidget } from './AdminAnnouncementsWidget';
import { GroupModerationWidgetWithErrorBoundary } from './GroupModerationWidget';
import { AdminJoinRequestsWidget } from './AdminJoinRequestsWidget';
import { EducationList } from './EducationList';

interface WidgetRendererProps {
  widgetId: string;
}

function AdminWidgetErrorFallback({ widgetId }: { widgetId: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[100px] text-gray-500">
      <div className="text-center">
        <p className="text-sm font-medium">Widget failed to load</p>
        <p className="text-xs text-gray-400 mt-1">{widgetId}</p>
      </div>
    </div>
  );
}

function WidgetWithBoundary({ widgetId, children }: { widgetId: string; children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<AdminWidgetErrorFallback widgetId={widgetId} />}>
      {children}
    </ErrorBoundary>
  );
}

export function AdminWidgetRenderer({ widgetId }: WidgetRendererProps): ReactNode {
  switch (widgetId) {
    case 'admin-stats':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminStatsWidget />
        </WidgetWithBoundary>
      );
    case 'admin-quick-links':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminQuickLinksWidget />
        </WidgetWithBoundary>
      );
    case 'admin-activity':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminActivityWidget />
        </WidgetWithBoundary>
      );
    case 'admin-users':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminUserWidget />
        </WidgetWithBoundary>
      );
    case 'admin-content':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminContentWidget />
        </WidgetWithBoundary>
      );
    case 'admin-system':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminSystemWidget />
        </WidgetWithBoundary>
      );
    case 'marketplace-analytics':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <MarketplaceAnalyticsWidget />
        </WidgetWithBoundary>
      );
    case 'service-quality':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <ServiceQualityWidget />
        </WidgetWithBoundary>
      );
    case 'maintenance-requests':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <MaintenanceRequestsWidget />
        </WidgetWithBoundary>
      );
    case 'maintenance-analytics':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <MaintenanceAnalyticsWidget />
        </WidgetWithBoundary>
      );
    case 'page-settings':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <PageSettingsWidget />
        </WidgetWithBoundary>
      );
    case 'admin-events':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminEventsWidget />
        </WidgetWithBoundary>
      );
    case 'admin-competitions':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <CompetitionList />
        </WidgetWithBoundary>
      );
    case 'admin-resources':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <ResourceList />
        </WidgetWithBoundary>
      );
    case 'admin-surveys':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <SurveysWidget />
        </WidgetWithBoundary>
      );
    case 'admin-announcements':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminAnnouncementsWidget />
        </WidgetWithBoundary>
      );
    case 'group-moderation':
      return <GroupModerationWidgetWithErrorBoundary />;
    case 'admin-join-requests':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <AdminJoinRequestsWidget />
        </WidgetWithBoundary>
      );
    case 'admin-education':
      return (
        <WidgetWithBoundary widgetId={widgetId}>
          <EducationList />
        </WidgetWithBoundary>
      );
    default:
      return (
        <ErrorBoundary>
          <div className="text-center py-4 text-gray-500">
            <p>Admin widget &quot;{widgetId}&quot; not implemented</p>
          </div>
        </ErrorBoundary>
      );
  }
}
