'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import { DashboardTabs, AddWidgetModal, DashboardTab } from '@/components/dashboard/DashboardTabs';
import { WidgetRenderer } from '@/components/dashboard/WidgetRenderer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  icon: string;
  label: string; // Required label for compatibility with DashboardTab
}

const ALL_WIDGETS: DashboardWidget[] = [
  { id: 'stats', type: 'stats', title: 'Statistics', icon: 'fa-chart-bar', label: 'Statistics' },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    icon: 'fa-bolt',
    label: 'Quick Actions',
  },
  {
    id: 'recent-activity',
    type: 'recent-activity',
    title: 'Recent Activity',
    icon: 'fa-clock',
    label: 'Recent Activity',
  },
  {
    id: 'notifications',
    type: 'notifications',
    title: 'Notifications',
    icon: 'fa-bell',
    label: 'Notifications',
  },
  {
    id: 'events',
    type: 'events',
    title: 'Community Events',
    icon: 'fa-calendar',
    label: 'Community Events',
  },
  { id: 'messages', type: 'messages', title: 'Messages', icon: 'fa-envelope', label: 'Messages' },
  {
    id: 'my-content',
    type: 'my-content',
    title: 'My Content',
    icon: 'fa-file-alt',
    label: 'My Content',
  },
];

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
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();

  const [tabs, setTabs] = useState<DashboardTab[]>(DEFAULT_TABS);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeWidgets, setActiveWidgets] = useState<string[]>(DEFAULT_TABS[0].defaultWidgets);
  const [showAddWidget, setShowAddWidget] = useState(false);

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

  const getAvailableWidgets = () => {
    return ALL_WIDGETS.filter(w => !activeWidgets.includes(w.id));
  };

  const getWidgetTitle = (widgetId: string) => {
    const widget = ALL_WIDGETS.find(w => w.id === widgetId);
    return widget?.title || widgetId;
  };

  const getWidgetIcon = (widgetId: string) => {
    const widget = ALL_WIDGETS.find(w => w.id === widgetId);
    return widget?.icon || 'fa-widget';
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: tCommon('nav.home'), href: '/' }, { label: tCommon('nav.dashboard') }]}
          />
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-indigo-600 mb-2">
              {t('welcome', { name: session?.user?.name ? `, ${session.user.name}` : '' })}
            </h1>
            <p className="text-gray-600">{t('subtitle', 'Manage your community activities')}</p>
          </div>

          <DashboardTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAddWidget={() => setShowAddWidget(true)}
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
