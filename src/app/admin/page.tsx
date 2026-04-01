'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import { AdminWidgetRenderer } from '@/components/admin/AdminWidgetRenderer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface AdminWidget {
  id: string;
  title: string;
  icon: string;
  size?: 'small' | 'medium' | 'large';
}

const ADMIN_WIDGETS: AdminWidget[] = [
  { id: 'admin-stats', title: 'System Statistics', icon: 'fa-chart-bar', size: 'large' },
  { id: 'admin-quick-links', title: 'Quick Actions', icon: 'fa-bolt', size: 'medium' },
  { id: 'admin-activity', title: 'Recent Activity', icon: 'fa-clock', size: 'large' },
];

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');

  const [activeWidgets, setActiveWidgets] = useState<string[]>([
    'admin-stats',
    'admin-quick-links',
    'admin-activity',
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActiveWidgets(items => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getWidgetTitle = (widgetId: string) => {
    const widget = ADMIN_WIDGETS.find(w => w.id === widgetId);
    return widget?.title || widgetId;
  };

  const getWidgetIcon = (widgetId: string) => {
    const widget = ADMIN_WIDGETS.find(w => w.id === widgetId);
    return widget?.icon || 'fa-widget';
  };

  const getWidgetSize = (widgetId: string) => {
    const widget = ADMIN_WIDGETS.find(w => w.id === widgetId);
    return widget?.size || 'medium';
  };

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[{ label: tCommon('nav.home'), href: '/' }, { label: 'Admin Dashboard' }]}
        />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('dashboard', 'Admin Dashboard')}
          </h1>
          <p className="text-gray-600">Monitor and manage your community platform</p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
            <div className="space-y-6">
              {activeWidgets.map(widgetId => {
                const size = getWidgetSize(widgetId);
                const gridCols = size === 'large' ? 'col-span-1 lg:col-span-2' : 'col-span-1';

                return (
                  <div key={widgetId} className={`${gridCols}`}>
                    <DraggableWidget
                      id={widgetId}
                      title={getWidgetTitle(widgetId)}
                      icon={getWidgetIcon(widgetId)}
                      removable={false} // Admin widgets are always visible
                    >
                      <AdminWidgetRenderer widgetId={widgetId} />
                    </DraggableWidget>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {activeWidgets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-cog text-4xl mb-4"></i>
            <h3 className="text-lg font-medium mb-2">No widgets configured</h3>
            <p>This shouldn't happen - please refresh the page</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
