'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@api/auth-client';
import { useWidgetStore } from '@entities/widget';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DraggableWidget } from '@widgets/dashboard';
import { DashboardTabs, DashboardTab } from '@widgets/dashboard';
import { AddWidgetModal } from '@features/dashboard';
import { WidgetRenderer } from '@widgets/dashboard';
import {
  getWidgetTitle,
  getWidgetIcon,
  getAvailableWidgets as getAvailableWidgetsFromConfig,
  type DashboardWidget,
} from '@entities/widget';

interface Tab {
  id: string;
  label: string;
  icon: string;
  defaultWidgets: string[];
}

const DEFAULT_TABS: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'layout',
    defaultWidgets: ['stats', 'quick-actions', 'recent-activity', 'notifications'],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: 'tool',
    defaultWidgets: ['solo-seat', 'properties'],
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: 'calendar',
    defaultWidgets: ['events', 'notifications'],
  },
  {
    id: 'services',
    label: 'Services',
    icon: 'briefcase',
    defaultWidgets: ['my-services', 'service-inquiries'],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'file-text',
    defaultWidgets: ['my-content', 'media'],
  },
  {
    id: 'premium',
    label: 'Premium',
    icon: 'star',
    defaultWidgets: ['premium-portfolio', 'agent-dashboard'],
  },
];

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const { t } = useTranslation('dashboard');
  const { userWidgets, addWidgetToTab, removeWidgetFromTab, resetLayout } = useWidgetStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableWidgets, setAvailableWidgets] = useState<DashboardWidget[]>([]);

  useEffect(() => {
    const widgets = getAvailableWidgetsFromConfig([]);
    setAvailableWidgets(widgets);
  }, []);

  const handleAddWidget = (widgetId: string) => {
    addWidgetToTab(activeTab, widgetId);
  };

  const handleRemoveWidget = (widgetId: string) => {
    removeWidgetFromTab(activeTab, widgetId);
  };

  const handleResetLayout = () => {
    resetLayout();
  };

  const currentTab = DEFAULT_TABS.find(tab => tab.id === activeTab);
  const tabWidgets = userWidgets[activeTab] || currentTab?.defaultWidgets || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.dashboard') }]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-64 flex-shrink-0">
            <DashboardTabs
              tabs={DEFAULT_TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isEditMode={isEditMode}
              onToggleEditMode={() => setIsEditMode(!isEditMode)}
              onAddWidget={() => setIsAddModalOpen(true)}
              onResetLayout={() => {
                resetLayout();
                setIsEditMode(false);
              }}
            />
          </aside>
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{t('title', 'Dashboard')}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('description', 'Manage your home and community')}
              </p>
            </div>
            {tabWidgets.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="mb-4">{t('empty', 'No widgets added yet')}</p>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {t('addWidget', 'Add widgets')}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 min-h-[400px]">
                {tabWidgets.map((widgetId: string) => (
                  <DraggableWidget
                    key={widgetId}
                    id={widgetId}
                    title={getWidgetTitle(widgetId)}
                    icon={getWidgetIcon(widgetId)}
                    removable={isEditMode}
                    onRemove={() => handleRemoveWidget(widgetId)}
                    tabId={activeTab}
                    isEditMode={isEditMode}
                  >
                    <WidgetRenderer widgetId={widgetId} />
                  </DraggableWidget>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      {isAddModalOpen && (
        <AddWidgetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSelect={handleAddWidget}
          availableWidgets={availableWidgets.map(w => ({
            id: w.id,
            label: w.title,
            icon: w.icon,
          }))}
        />
      )}
    </div>
  );
}

export function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

export default DashboardPage;
