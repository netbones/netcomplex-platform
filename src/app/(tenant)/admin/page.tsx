'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DraggableWidget } from '@widgets/dashboard';
import { DashboardTabs } from '@widgets/dashboard';
import { AddWidgetModal } from '@features/dashboard';
import { AdminWidgetRenderer } from '@/widgets/admin/ui/AdminWidgetRenderer';
import {
  ADMIN_TABS,
  getWidgetTitle,
  getWidgetIcon,
  getAvailableAdminWidgets,
} from '@/entities/admin/model/admin-config';

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin');

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
    return getAvailableAdminWidgets(activeWidgets);
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
            {activeTab === 'maintenance' && 'Maintenance requests, scheduling, and analytics'}
            {activeTab === 'users' && 'User management and account statistics'}
            {activeTab === 'content' && 'Content creation and management tools'}
            {activeTab === 'events' && 'Upcoming events and event management'}
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
