'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useApiToast } from '@/hooks/useApiToast';

interface SidebarWidget {
  id: string;
  type: string;
  title: string;
  isVisible: boolean;
  isPublic: boolean;
}

// Individual widget components
function SocialMediaLinksWidget({ widgetId }: { widgetId: string }) {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [socialLinks, setSocialLinks] = useState([
    { platform: 'Facebook', url: '', icon: 'fab fa-facebook' },
    { platform: 'Twitter', url: '', icon: 'fab fa-twitter' },
    { platform: 'Instagram', url: '', icon: 'fab fa-instagram' },
    { platform: 'LinkedIn', url: '', icon: 'fab fa-linkedin' },
  ]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // In real implementation, fetch user's social media links
    // For now, load from localStorage or API
    const saved = localStorage.getItem(`social-links-${widgetId}`);
    if (saved) {
      setSocialLinks(JSON.parse(saved));
    }
  }, [widgetId]);

  const updateLink = (platform: string, url: string) => {
    const updated = socialLinks.map(link => (link.platform === platform ? { ...link, url } : link));
    setSocialLinks(updated);
    localStorage.setItem(`social-links-${widgetId}`, JSON.stringify(updated));
  };

  const visibleLinks = socialLinks.filter(link => link.url.trim());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">{t('socialMedia', 'Social Media')}</h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          <i className={`fas fa-${isEditing ? 'check' : 'edit'}`}></i>
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {socialLinks.map(link => (
            <div key={link.platform} className="flex items-center gap-2">
              <i className={`${link.icon} text-gray-500 w-4`}></i>
              <input
                type="url"
                placeholder={`${link.platform} URL`}
                value={link.url}
                onChange={e => updateLink(link.platform, e.target.value)}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {visibleLinks.length === 0 ? (
            <p className="text-xs text-gray-500 italic">
              {t('noSocialLinks', 'No social links added')}
            </p>
          ) : (
            visibleLinks.map(link => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <i className={link.icon}></i>
                <span>{link.platform}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TagCloudWidget({ widgetId }: { widgetId: string }) {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [tags, setTags] = useState<{ name: string; size: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserTags();
    }
  }, [session?.user?.id]);

  const fetchUserTags = async () => {
    try {
      // Fetch user's content and extract tags
      const response = await fetch('/api/content?authorId=' + session?.user?.id);
      if (response.ok) {
        const content = await response.json();
        const tagCounts: { [key: string]: number } = {};

        // Count tag occurrences across all user content
        content.forEach((item: any) => {
          if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });

        // Convert to tag objects with size classes based on frequency
        const tagArray = Object.entries(tagCounts)
          .map(([name, count]) => ({
            name,
            count,
            size: getTagSize(count),
          }))
          .sort((a, b) => b.count - a.count) // Sort by frequency
          .slice(0, 10); // Limit to top 10 tags

        setTags(tagArray);
      }
    } catch (error) {
      toast.error('Failed to fetch user tags');
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const getTagSize = (count: number): string => {
    if (count >= 10) return 'text-lg';
    if (count >= 5) return 'text-base';
    if (count >= 3) return 'text-sm';
    return 'text-xs';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">{t('tagCloud', 'Tag Cloud')}</h4>
        <div className="animate-pulse flex flex-wrap gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-12"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">{t('tagCloud', 'Tag Cloud')}</h4>
      {tags.length === 0 ? (
        <p className="text-xs text-gray-500 italic">{t('noTags', 'No tags found')}</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span
              key={tag.name}
              className={`${tag.size} text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors`}
              title={`${tag.count} items`}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickStatsWidget() {
  const { t } = useTranslation('dashboard');

  // Mock stats - in real implementation, this would come from user data
  const stats = [
    { label: 'Posts', value: '24', icon: 'fas fa-file-alt' },
    { label: 'Events', value: '8', icon: 'fas fa-calendar' },
    { label: 'Connections', value: '156', icon: 'fas fa-users' },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">{t('quickStats', 'Quick Stats')}</h4>
      <div className="space-y-2">
        {stats.map(stat => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className={`${stat.icon} text-indigo-600 text-xs`}></i>
              <span className="text-xs text-gray-600">{stat.label}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherWidget() {
  const { t } = useTranslation('dashboard');

  // Mock weather data - in real implementation, this would come from a weather API
  const weather = {
    temperature: 72,
    condition: 'Sunny',
    location: 'Soralia Village',
    icon: 'fas fa-sun',
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">{t('weather', 'Weather')}</h4>
      <div className="flex items-center gap-2">
        <i className={`${weather.icon} text-yellow-500 text-lg`}></i>
        <div>
          <div className="text-sm font-medium text-gray-900">{weather.temperature}°F</div>
          <div className="text-xs text-gray-600">{weather.condition}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500">{weather.location}</div>
    </div>
  );
}

function renderWidget(type: string, widgetId: string) {
  switch (type) {
    case 'social-media':
      return <SocialMediaLinksWidget widgetId={widgetId} />;
    case 'tag-cloud':
      return <TagCloudWidget widgetId={widgetId} />;
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
  const [availableWidgets] = useState([
    { id: 'social-media', type: 'social-media', title: 'Social Media', icon: 'fab fa-share-alt' },
    { id: 'tag-cloud', type: 'tag-cloud', title: 'Tag Cloud', icon: 'fas fa-tags' },
    { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', icon: 'fas fa-chart-bar' },
    { id: 'weather', type: 'weather', title: 'Weather', icon: 'fas fa-sun' },
  ]);
  const [isAddingWidget, setIsAddingWidget] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserWidgets();
    }
  }, [session?.user?.id]);

  const loadUserWidgets = async () => {
    try {
      // In real implementation, fetch from API
      // For now, load default widgets
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
      toast.error('Failed to load sidebar widgets');
    }
  };

  const addWidget = (widgetType: string) => {
    const availableWidget = availableWidgets.find(w => w.type === widgetType);
    if (!availableWidget || widgets.length >= maxWidgets) return;

    const newWidget: SidebarWidget = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      title: availableWidget.title,
      isVisible: true,
      isPublic: false, // Default to private
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
              {availableWidgets
                .filter(aw => !widgets.some(w => w.type === aw.type))
                .map(widget => (
                  <button
                    key={widget.id}
                    onClick={() => addWidget(widget.type)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-indigo-50 text-left"
                  >
                    <i className={`${widget.icon} text-indigo-600 w-4`}></i>
                    <span className="text-sm">{widget.title}</span>
                  </button>
                ))}
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
                {renderWidget(widget.type, widget.id)}
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
