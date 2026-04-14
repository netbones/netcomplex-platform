'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@api/auth-client';
import { useWidgetStore } from '@/lib/stores/widget-store';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DraggableWidget } from '@widgets/dashboard';
import { DashboardTabs, AddWidgetModal, DashboardTab } from '@widgets/dashboard';
import { WidgetRenderer } from '@widgets/dashboard';
import {
  getWidgetTitle,
  getWidgetIcon,
  getAvailableWidgets as getAvailableWidgetsFromConfig,
} from '@/lib/dashboard-config';

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
    defaultWidgets: ['stats', 'quickActions', 'recentActivity', 'notifications'],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: 'tool',
    defaultWidgets: ['maintenanceRequests', 'maintenanceForm'],
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: 'calendar',
    defaultWidgets: ['bookings', 'bookingCalendar'],
  },
  {
    id: 'services',
    label: 'Services',
    icon: 'briefcase',
    defaultWidgets: ['myServices', 'serviceInquiries'],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'file-text',
    defaultWidgets: ['userContent', 'createContent'],
  },
  {
    id: 'premium',
    label: 'Premium',
    icon: 'star',
    defaultWidgets: ['premiumPortfolio', 'unifiedDashboard'],
  },
];

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const { t } = useTranslation('dashboard');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { userWidgets, setUserWidgets, resetLayout } = useWidgetStore() as any;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableWidgets, setAvailableWidgets] = useState<string[]>([]);

  useEffect(() => {
    const widgets = getAvailableWidgetsFromConfig([]) as unknown as string[];
    setAvailableWidgets(widgets);
  }, []);

  const handleAddWidget = (widgetId: string) => {
    const tabWidgets = userWidgets[activeTab] || [];
    if (!tabWidgets.includes(widgetId)) {
      setUserWidgets({
        ...userWidgets,
        [activeTab]: [...tabWidgets, widgetId],
      });
    }
    setIsAddModalOpen(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    const tabWidgets = userWidgets[activeTab] || [];
    setUserWidgets({
      ...userWidgets,
      [activeTab]: tabWidgets.filter((id: string) => id !== widgetId),
    });
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
              onAddWidget={() => setIsAddModalOpen(true)}
              onResetLayout={handleResetLayout}
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
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {t('addWidget', 'Add widgets')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tabWidgets.map((widgetId: string) => (
                  <DraggableWidget
                    key={widgetId}
                    id={widgetId}
                    title={getWidgetTitle(widgetId)}
                    icon={getWidgetIcon(widgetId)}
                    removable
                    onRemove={() => handleRemoveWidget(widgetId)}
                    tabId={activeTab}
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
          availableWidgets={availableWidgets.map(id => ({
            id,
            label: getWidgetTitle(id),
            icon: getWidgetIcon(id),
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
