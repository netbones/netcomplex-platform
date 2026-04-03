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
    label: 'Overview',
    icon: 'fa-th-large',
    defaultWidgets: ['stats', 'quick-actions', 'recent-activity', 'notifications'],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'fa-file-alt',
    defaultWidgets: ['my-content', 'bookshelf', 'media'],
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: 'fa-calendar',
    defaultWidgets: ['events', 'recent-activity', 'notifications', 'messages'],
  },
];

function DashboardContent() {
  const { t } = useTranslation('dashboard');
  const { data: session, isPending } = authClient.useSession();

  const [tabs, setTabs] = useState<DashboardTab[]>(DEFAULT_TABS);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeWidgets, setActiveWidgets] = useState<string[]>(DEFAULT_TABS[0].defaultWidgets);
  const [showAddWidget, setShowAddWidget] = useState(false);

  // Prevent hydration mismatch by rendering loading state until session is loaded
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Use consistent value on both server and client during hydration
  const userName = hasHydrated && !isPending ? session?.user?.name : '';

  // Update active widgets when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const currentTab = tabs.find(tab => tab.id === tabId);
    if (currentTab) {
      setActiveWidgets(currentTab.defaultWidgets);
    }
  };

  const handleAddWidget = (widgetId: string) => {
    if (!activeWidgets.includes(widgetId)) {
      setActiveWidgets([...activeWidgets, widgetId]);
      setTabs(prev =>
        prev.map(tab =>
          tab.id === activeTab ? { ...tab, defaultWidgets: [...tab.defaultWidgets, widgetId] } : tab
        )
      );
    }
    setShowAddWidget(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setActiveWidgets(activeWidgets.filter(id => id !== widgetId));
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTab
          ? { ...tab, defaultWidgets: tab.defaultWidgets.filter(id => id !== widgetId) }
          : tab
      )
    );
  };

  const handleResetLayout = (tabId: string) => {
    const { resetTabLayout } = useWidgetStore.getState();
    resetTabLayout(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveWidgets(tab.defaultWidgets);
    }
  };

  const getAvailableWidgets = () => {
    return getAvailableWidgetsFromConfig(activeWidgets);
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]} />
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-indigo-600 mb-2">
              {userName ? t('welcome', { name: `, ${userName}` }) : t('welcome', { name: '' })}
            </h1>
            <p className="text-gray-600">{t('subtitle', 'Manage your community activities')}</p>
          </div>

          <DashboardTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAddWidget={() => setShowAddWidget(true)}
            onResetLayout={handleResetLayout}
          />

          <div className="relative min-h-screen">
            {activeWidgets.map(widgetId => (
              <DraggableWidget
                key={widgetId}
                id={widgetId}
                title={getWidgetTitle(widgetId)}
                icon={getWidgetIcon(widgetId)}
                removable={true}
                onRemove={() => handleRemoveWidget(widgetId)}
                tabId={activeTab}
              >
                <WidgetRenderer widgetId={widgetId} />
              </DraggableWidget>
            ))}
          </div>

          {activeWidgets.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-inbox text-4xl mb-4"></i>
              <h3 className="text-lg font-medium mb-2">No widgets added</h3>
              <p className="mb-4">Add widgets to customize your dashboard</p>
              <button
                onClick={() => setShowAddWidget(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Add Widget
              </button>
            </div>
          )}

          {showAddWidget && (
            <AddWidgetModal
              isOpen={showAddWidget}
              availableWidgets={getAvailableWidgets().map(w => ({
                id: w.id,
                label: w.label || w.title,
                icon: w.icon,
              }))}
              onSelect={handleAddWidget}
              onClose={() => setShowAddWidget(false)}
            />
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
