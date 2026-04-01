'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DashboardStats } from './DashboardStats';
import { QuickActionsWidget } from './QuickActionsWidget';
import { RecentActivityWidget } from './RecentActivityWidget';
import { EventsWidget } from './EventsWidget';
import { NotificationsWidget } from './NotificationsWidget';
import { MessagesWidget } from './MessagesWidget';
import { UserContentWidget } from './UserContentWidget';
import { HouseholdsWidget } from './HouseholdsWidget';
import { AgentDashboardWidget } from './AgentDashboardWidget';
import { SoloSeatWidget } from './SoloSeatWidget';

interface WidgetRendererProps {
  widgetId: string;
}

export function WidgetRenderer({ widgetId }: WidgetRendererProps): ReactNode {
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
