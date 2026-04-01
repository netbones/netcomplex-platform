'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AdminStatsWidget } from './AdminStatsWidget';
import { AdminQuickLinksWidget } from './AdminQuickLinksWidget';
import { AdminActivityWidget } from './AdminActivityWidget';
import { AdminUserWidget } from './AdminUserWidget';
import { AdminContentWidget } from './AdminContentWidget';
import { AdminSystemWidget } from './AdminSystemWidget';

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
