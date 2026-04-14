'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { useWidgetStore } from '@/lib/stores/widget-store';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import { DashboardTabs, AddWidgetModal, DashboardTab } from '@/components/dashboard/DashboardTabs';
import { WidgetRenderer } from '@/components/dashboard/WidgetRenderer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  getWidgetTitle,
  getWidgetIcon,
  getAvailableWidgets as getAvailableWidgetsFromConfig,
} from '@/lib/dashboard-config';

const DEFAULT_TABS: DashboardTab[] = [
  {
    id: 'overview',
    title: 'Overview',
    widgetIds: ['stats', 'quickActions', 'recentActivity', 'notifications'],
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    widgetIds: ['maintenanceRequests', 'maintenanceForm'],
  },
  {
    id: 'bookings',
    title: 'Bookings',
    widgetIds: ['bookings', 'bookingCalendar'],
  },
  {
    id: 'services',
    title: 'Services',
    widgetIds: ['myServices', 'serviceInquiries'],
  },
  {
    id: 'content',
    title: 'Content',
    widgetIds: ['userContent', 'createContent'],
  },
  {
    id: 'premium',
    title: 'Premium',
    widgetIds: ['premiumPortfolio', 'unifiedDashboard'],
  },
];

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const { t } = useTranslation('dashboard');
  const { userWidgets, setUserWidgets, resetLayout } = useWidgetStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableWidgets, setAvailableWidgets] = useState<string[]>([]);

  useEffect(() => {
    const widgets = getAvailableWidgetsFromConfig();
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
      [activeTab]: tabWidgets.filter(id => id !== widgetId),
    });
  };

  const handleResetLayout = () => {
    resetLayout();
  };

  const currentTab = DEFAULT_TABS.find(tab => tab.id === activeTab);
  const tabWidgets = userWidgets[activeTab] || currentTab?.widgetIds || [];

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
                {tabWidgets.map(widgetId => (
                  <DraggableWidget
                    key={widgetId}
                    widgetId={widgetId}
                    onRemove={() => handleRemoveWidget(widgetId)}
                  >
                    <WidgetRenderer widgetId={widgetId} />
                  </DraggableWidget>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWidget={handleAddWidget}
        activeTabWidgets={tabWidgets}
        availableWidgets={availableWidgets}
      />
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
