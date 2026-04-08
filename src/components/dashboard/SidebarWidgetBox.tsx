'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/*
 * ==========================================
 * SIDEBAR WIDGETS - Used by SidebarWidgetBox
 * ==========================================
 * These widgets are imported and rendered by SidebarWidgetBox.
 * If you need to modify which widgets are available
 * in the sidebar, edit AVAILABLE_WIDGETS and renderWidget below.
 *
 * Widgets:
 *   - SocialMediaLinksWidget: User's social media links (requires widgetId)
 *   - TagCloudWidget: Content tags - fetches by authorId when provided
 *   - QuickStatsWidget: Quick stats display (no props required)
 *   - WeatherWidget: Weather display (no props required)
 * ==========================================
 */
import { SocialMediaLinksWidget } from './SocialMediaLinksWidget';
import { TagCloudWidget } from './TagCloudWidget';
import { QuickStatsWidget } from './QuickStatsWidget';
import { WeatherWidget } from './WeatherWidget';

interface SidebarWidget {
  id: string;
  type: string;
  title: string;
  isVisible: boolean;
  isPublic: boolean;
}

interface AvailableWidget {
  id: string;
  type: string;
  title: string;
  icon: string;
}

const AVAILABLE_WIDGETS: AvailableWidget[] = [
  { id: 'social-media', type: 'social-media', title: 'Social Media', icon: 'fab fa-share-alt' },
  { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'fas fa-tags' },
  { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'fas fa-chart-bar' },
  { id: 'weather', type: 'weather', title: 'Weather', icon: 'fas fa-sun' },
];

/*
 * SIDEBAR WIDGETS - These are the only widgets SidebarWidgetBox renders.
 * See import section above for full documentation.
 */
function renderWidget(type: string, widgetId: string, authorId: string) {
  switch (type) {
    case 'social-media':
      return <SocialMediaLinksWidget widgetId={widgetId} />;
    case 'tag-cloud':
      // TagCloudWidget: If authorId provided, filters by author; otherwise shows all site content
      return <TagCloudWidget widgetId={widgetId} authorId={authorId} />;
    case 'quick-stats':
      return <QuickStatsWidget />;
    case 'weather':
      return <WeatherWidget />;
    default:
      return <div className="text-xs text-gray-500">Widget not found</div>;
  }
}

interface SidebarWidgetBoxProps {
  maxWidgets?: number;
}

export function SidebarWidgetBox({ maxWidgets = 6 }: SidebarWidgetBoxProps) {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [widgets, setWidgets] = useState<SidebarWidget[]>([]);
  const [isAddingWidget, setIsAddingWidget] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserWidgets();
    }
  }, [session?.user?.id]);

  const loadUserWidgets = async () => {
    try {
      const defaultWidgets: SidebarWidget[] = [
        {
          id: 'social-media',
          type: 'social-media',
          title: 'Social Media',
          isVisible: true,
          isPublic: false,
        },
        { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', isVisible: true, isPublic: true },
      ];
      setWidgets(defaultWidgets);
    } catch (error) {
      console.error('Failed to load sidebar widgets');
    }
  };

  const addWidget = (widgetType: string) => {
    const availableWidget = AVAILABLE_WIDGETS.find(w => w.type === widgetType);
    if (!availableWidget || widgets.length >= maxWidgets) return;

    const newWidget: SidebarWidget = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      title: availableWidget.title,
      isVisible: true,
      isPublic: false,
    };

    setWidgets([...widgets, newWidget]);
    setIsAddingWidget(false);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(widgets.map(w => (w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w)));
  };

  const togglePublicDisplay = (widgetId: string) => {
    setWidgets(widgets.map(w => (w.id === widgetId ? { ...w, isPublic: !w.isPublic } : w)));
  };

  if (!session?.user?.id) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('sidebarWidgets', 'Sidebar Widgets')}
          </h3>
          {widgets.length < maxWidgets && (
            <button
              onClick={() => setIsAddingWidget(!isAddingWidget)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              <i className="fas fa-plus mr-1"></i>
              {t('addWidget', 'Add')}
            </button>
          )}
        </div>

        {isAddingWidget && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('availableWidgets', 'Available Widgets')}
            </h4>
            <div className="space-y-1">
              {AVAILABLE_WIDGETS.filter(aw => !widgets.some(w => w.type === aw.type)).map(
                widget => (
                  <button
                    key={widget.id}
                    onClick={() => addWidget(widget.type)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-indigo-50 text-left"
                  >
                    <i className={`${widget.icon} text-indigo-600 w-4`}></i>
                    <span className="text-sm">{widget.title}</span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {widgets
            .filter(widget => widget.isVisible)
            .map(widget => (
              <div key={widget.id} className="relative group border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={widget.isPublic}
                      onChange={() => togglePublicDisplay(widget.id)}
                      className="w-3 h-3 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                      title={t('publicDisplay', 'Show on public profile')}
                    />
                    <span className="text-xs text-gray-500">{t('public', 'Public')}</span>
                  </div>
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 text-xs"
                    title={t('removeWidget', 'Remove Widget')}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                {renderWidget(widget.type, widget.id, session?.user?.id || '')}
              </div>
            ))}
        </div>

        {widgets.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <i className="fas fa-inbox text-2xl mb-2"></i>
            <p className="text-sm">{t('noSidebarWidgets', 'No sidebar widgets yet')}</p>
            <button
              onClick={() => setIsAddingWidget(true)}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              {t('addFirstWidget', 'Add your first widget')}
            </button>
          </div>
        )}

        {widgets.filter(w => !w.isVisible).length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('hiddenWidgets', 'Hidden Widgets')}
            </h4>
            <div className="space-y-1">
              {widgets
                .filter(w => !w.isVisible)
                .map(widget => (
                  <button
                    key={widget.id}
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-left text-sm text-gray-600"
                  >
                    <i className="fas fa-eye-slash w-4"></i>
                    <span>{widget.title}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
