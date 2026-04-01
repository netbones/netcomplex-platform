'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import { DashboardTabs, AddWidgetModal } from '@/components/dashboard/DashboardTabs';
import { AdminWidgetRenderer } from '@/components/admin/AdminWidgetRenderer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface AdminTab {
  id: string;
  label: string;
  icon: string;
  defaultWidgets: string[];
}

const ADMIN_TABS: AdminTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-th-large',
    defaultWidgets: ['admin-stats', 'admin-quick-links', 'admin-activity'],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'fa-users',
    defaultWidgets: ['admin-users', 'admin-stats', 'admin-activity'],
  },
  {
    id: 'content',
    label: 'Content Management',
    icon: 'fa-file-alt',
    defaultWidgets: ['admin-content', 'admin-stats', 'admin-quick-links'],
  },
  {
    id: 'system',
    label: 'System',
    icon: 'fa-cog',
    defaultWidgets: ['admin-system', 'admin-activity', 'admin-quick-links'],
  },
];

const ALL_ADMIN_WIDGETS = [
  { id: 'admin-stats', label: 'System Statistics', icon: 'fa-chart-bar' },
  { id: 'admin-quick-links', label: 'Quick Actions', icon: 'fa-bolt' },
  { id: 'admin-activity', label: 'Recent Activity', icon: 'fa-clock' },
  { id: 'admin-users', label: 'User Overview', icon: 'fa-users' },
  { id: 'admin-content', label: 'Content Overview', icon: 'fa-file-alt' },
  { id: 'admin-system', label: 'System Status', icon: 'fa-cog' },
];

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');

  const [activeTab, setActiveTab] = useState('overview');
  const [activeWidgets, setActiveWidgets] = useState<string[]>(
    ADMIN_TABS.find(tab => tab.id === 'overview')?.defaultWidgets || []
  );
  const [showAddWidget, setShowAddWidget] = useState(false);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const currentTab = ADMIN_TABS.find(tab => tab.id === tabId);
    if (currentTab) {
      setActiveWidgets(currentTab.defaultWidgets);
    }
  };

  const handleRemoveWidget = (widgetId: string) => {
    setActiveWidgets(activeWidgets.filter(id => id !== widgetId));
  };

  const handleAddWidget = (widgetId: string) => {
    if (!activeWidgets.includes(widgetId)) {
      setActiveWidgets([...activeWidgets, widgetId]);
    }
    setShowAddWidget(false);
  };

  const getAvailableWidgets = () => {
    return ALL_ADMIN_WIDGETS.filter(widget => !activeWidgets.includes(widget.id));
  };

  const getWidgetTitle = (widgetId: string) => {
    const widget = ALL_ADMIN_WIDGETS.find(w => w.id === widgetId);
    return widget?.label || widgetId;
  };

  const getWidgetIcon = (widgetId: string) => {
    const widget = ALL_ADMIN_WIDGETS.find(w => w.id === widgetId);
    return widget?.icon || 'fa-widget';
  };

  const getWidgetSize = (widgetId: string) => {
    switch (widgetId) {
      case 'admin-stats':
      case 'admin-activity':
      case 'admin-users':
      case 'admin-content':
      case 'admin-system':
        return 'large';
      case 'admin-quick-links':
        return 'medium';
      default:
        return 'medium';
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin Dashboard' }]} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('dashboard', 'Admin Dashboard')}
          </h1>
          <p className="text-gray-600">Monitor and manage your community platform</p>
        </div>

        {/* Admin Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {ADMIN_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
            <button
              onClick={() => setShowAddWidget(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-600 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-all"
            >
              <i className="fas fa-plus"></i>
              <span>Add Widget</span>
            </button>
          </div>

          {/* Tab Description */}
          <div className="mt-3 text-sm text-gray-600">
            {activeTab === 'overview' && 'System overview and key metrics'}
            {activeTab === 'users' && 'User management and account statistics'}
            {activeTab === 'content' && 'Content creation and management tools'}
            {activeTab === 'system' && 'System maintenance and configuration'}
          </div>
        </div>

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
              <AdminWidgetRenderer widgetId={widgetId} />
            </DraggableWidget>
          ))}
        </div>

        {activeWidgets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-cog text-4xl mb-4"></i>
            <h3 className="text-lg font-medium mb-2">No widgets configured</h3>
            <p>This shouldn't happen - please refresh the page</p>
          </div>
        )}

        {showAddWidget && (
          <AddWidgetModal
            isOpen={showAddWidget}
            onClose={() => setShowAddWidget(false)}
            availableWidgets={getAvailableWidgets()}
            onSelect={handleAddWidget}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
