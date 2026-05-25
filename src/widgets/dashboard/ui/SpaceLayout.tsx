'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWidgetStore, getSpaceDefaultLayout } from '@entities/widget';
import { ErrorBoundary, usePageLoading } from '@shared/ui';
import { DraggableWidget, WidgetCard, WidgetRenderer } from '@widgets/dashboard';
import { registry } from '@widgets/dashboard';
import { getWidgetTitle, getWidgetIcon } from '@entities/widget';
import { authClient } from '@api/auth-client';
import { AddWidgetModal } from '@features/dashboard';
import type { SpaceId } from '../model/spaces';
import { SPACES, getWidgetsForSpace } from '../model/spaces';

interface SpaceLayoutProps {
  /** Current space ID (from URL) */
  spaceId: SpaceId;
}

/**
 * SpaceLayout — renders the widget grid for a Focus Space.
 *
 * Replaces the old tab-based widget grid from DashboardPage.
 * Uses space-keyed widget store instead of tab-keyed.
 * AddWidgetModal is filtered to only show widgets assigned to this space.
 */
export function SpaceLayout({ spaceId }: SpaceLayoutProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    userWidgets,
    addWidgetToTab,
    removeWidgetFromTab,
    resetToRoleDefaults,
    isHydratedFromDb,
    setUserWidgets,
  } = useWidgetStore();

  const { data: session } = authClient.useSession();
  const role = session?.user?.role || 'RESIDENT';
  const userId = session?.user?.id;

  const spaceDef = SPACES[spaceId];
  const Icon = spaceDef.icon;

  const { isReady, LoadingComponent } = usePageLoading([
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: spaceDef.labelKey, href: `/dashboard/${spaceId}` },
  ]);

  // Seed default widgets when store is empty after DB hydration
  useEffect(() => {
    if (isHydratedFromDb && Object.keys(userWidgets).length === 0) {
      const defaults = getSpaceDefaultLayout(role);
      setUserWidgets(defaults.userWidgets);
    }
  }, [isHydratedFromDb, userWidgets, role, setUserWidgets]);

  // Available widgets filtered to this space (using manifest spaces field)
  const spaceFilteredWidgets = useMemo(() => {
    const allWidgets = registry.list();
    return allWidgets
      .filter(w => w.spaces.includes(spaceId))
      .map(w => ({
        id: w.id,
        title: w.name,
        icon: w.icon ? (typeof w.icon === 'string' ? w.icon : 'fa-widget') : 'fa-widget',
      }));
  }, [spaceId]);

  // Widgets currently on this space
  const spaceDefaults = getSpaceDefaultLayout(role);
  const currentWidgets = userWidgets[spaceId] || spaceDefaults.userWidgets[spaceId] || [];

  const handleRemoveWidget = (widgetId: string) => removeWidgetFromTab(widgetId, spaceId);
  const handleAddWidget = (widgetId: string) => addWidgetToTab(widgetId, spaceId);

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Space header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{spaceDef.labelKey}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {currentWidgets.length} widget{currentWidgets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                isEditMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
            {isEditMode && (
              <>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                >
                  + Add Widget
                </button>
                <button
                  onClick={() => {
                    if (userId) {
                      resetToRoleDefaults(role, userId);
                      setIsEditMode(false);
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Widget grid */}
        {currentWidgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="mb-4 text-gray-500">No widgets in this space yet</p>
            <button
              onClick={() => {
                setIsEditMode(true);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              Add widgets
            </button>
          </div>
        ) : (
          <>
            {/* Mobile: Simple stacked cards (hidden on md+) */}
            <div className="block md:hidden">
              {currentWidgets.map((widgetId: string) => (
                <WidgetCard
                  key={widgetId}
                  id={widgetId}
                  title={getWidgetTitle(widgetId)}
                  icon={getWidgetIcon(widgetId)}
                  tabId={spaceId}
                  isEditMode={isEditMode}
                  onRemove={() => handleRemoveWidget(widgetId)}
                />
              ))}
            </div>

            {/* Desktop: Draggable widgets (hidden on small screens) */}
            <div className="hidden md:flex flex-wrap gap-4 min-h-[400px]">
              {currentWidgets.map((widgetId: string) => (
                <DraggableWidget
                  key={widgetId}
                  id={widgetId}
                  title={getWidgetTitle(widgetId)}
                  icon={getWidgetIcon(widgetId)}
                  removable={isEditMode}
                  onRemove={() => handleRemoveWidget(widgetId)}
                  tabId={spaceId}
                  isEditMode={isEditMode}
                >
                  <WidgetRenderer widgetId={widgetId} />
                </DraggableWidget>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Widget Modal — filtered to current space */}
      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSelect={handleAddWidget}
        availableWidgets={spaceFilteredWidgets.map(w => ({
          id: w.id,
          label: w.title,
          icon: w.icon,
        }))}
      />
    </div>
  );
}

/**
 * Wrapper with ErrorBoundary for safe rendering in space pages.
 */
export function SpaceLayoutWithErrorBoundary({ spaceId }: SpaceLayoutProps) {
  return (
    <ErrorBoundary>
      <SpaceLayout spaceId={spaceId} />
    </ErrorBoundary>
  );
}
