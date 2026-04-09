'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('dashboard-original');

interface ContentItem {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  published: boolean;
  publishedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    name: string;
  };
}
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { authClient } from '@/lib/auth-client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { sanitizeHtml } from '@/lib/utils';
import { Bookshelf } from '@/components/ui/Bookshelf';
import { MediaLibrary } from '@/components/ui/MediaLibrary';
import { Pagination } from '@/components/ui/Pagination';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import { DashboardTabs, AddWidgetModal, DashboardTab } from '@/components/dashboard/DashboardTabs';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  href?: string;
}

function StatCard({ title, value, icon, href }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  icon: string;
}

const ALL_WIDGETS: DashboardWidget[] = [
  { id: 'stats', type: 'stats', title: 'Statistics', icon: 'fa-chart-bar' },
  { id: 'quick-actions', type: 'quick-actions', title: 'Quick Actions', icon: 'fa-bolt' },
  { id: 'recent-activity', type: 'recent-activity', title: 'Recent Activity', icon: 'fa-clock' },
  { id: 'notifications', type: 'notifications', title: 'Notifications', icon: 'fa-bell' },
  { id: 'events', type: 'events', title: 'Community Events', icon: 'fa-calendar' },
  { id: 'bookshelf', type: 'bookshelf', title: 'My Bookshelf', icon: 'fa-book' },
  { id: 'media', type: 'media', title: 'Media Library', icon: 'fa-photo-video' },
  { id: 'my-content', type: 'my-content', title: 'My Content', icon: 'fa-file-alt' },
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
    defaultWidgets: ['events', 'recent-activity', 'notifications'],
  },
];

function DashboardContent() {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();
  const [stats, setStats] = useState({ requests: 0, bookings: 0, messages: 0, notifications: 0 });
  const [loading, setLoading] = useState(true);
  const [tabs, setTabs] = useState<DashboardTab[]>(DEFAULT_TABS);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeWidgets, setActiveWidgets] = useState<string[]>(DEFAULT_TABS[0].defaultWidgets);
  const [showAddWidget, setShowAddWidget] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchStats() {
      try {
        const [reqRes, bookRes, msgRes, notifRes] = await Promise.all([
          fetch('/api/maintenance'),
          fetch('/api/bookings'),
          fetch('/api/conversations'),
          fetch('/api/notifications'),
        ]);
        const [requests, bookings, conversations, notifications] = await Promise.all([
          reqRes.json(),
          bookRes.json(),
          msgRes.json(),
          notifRes.json(),
        ]);
        setStats({
          requests: Array.isArray(requests) ? requests.length : 0,
          bookings: Array.isArray(bookings) ? bookings.length : 0,
          messages: Array.isArray(conversations) ? conversations.length : 0,
          notifications: Array.isArray(notifications) ? notifications.length : 0,
        });
      } catch (error) {
        log.error({}, 'Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (currentTab) {
      setActiveWidgets(currentTab.defaultWidgets);
    }
  }, [activeTab, tabs]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActiveWidgets(items => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleAddWidget(widgetId: string) {
    if (!activeWidgets.includes(widgetId)) {
      setActiveWidgets([...activeWidgets, widgetId]);
      setTabs(prev =>
        prev.map(tab =>
          tab.id === activeTab ? { ...tab, defaultWidgets: [...tab.defaultWidgets, widgetId] } : tab
        )
      );
    }
  }

  function handleRemoveWidget(widgetId: string) {
    setActiveWidgets(activeWidgets.filter(id => id !== widgetId));
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTab
          ? { ...tab, defaultWidgets: tab.defaultWidgets.filter(id => id !== widgetId) }
          : tab
      )
    );
  }

  function getAvailableWidgets() {
    return ALL_WIDGETS.filter(w => !activeWidgets.includes(w.id));
  }

  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'stats':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title={t('myRequests')}
              value={loading ? '...' : stats.requests}
              icon="🔧"
              href="/maintenance"
            />
            <StatCard
              title={t('myBookings')}
              value={loading ? '...' : stats.bookings}
              icon="📅"
              href="/bookings"
            />
            <StatCard
              title={t('messages')}
              value={loading ? '...' : stats.messages}
              icon="💬"
              href="/messages"
            />
            <StatCard
              title={t('notifications')}
              value={loading ? '...' : stats.notifications}
              icon="🔔"
            />
          </div>
        );
      case 'quick-actions':
        return (
          <div className="space-y-3">
            <Link
              href="/maintenance"
              className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
            >
              {t('submitRequest')}
            </Link>
            <Link
              href="/bookings"
              className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
            >
              {t('bookFacility')}
            </Link>
            <Link
              href="/admin/content/new"
              className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
            >
              {t('createContent', 'Create Content')}
            </Link>
            <Link
              href={`/resident/${session?.user?.id}`}
              className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
            >
              {t('viewProfile', 'View My Profile')}
            </Link>
          </div>
        );
      case 'recent-activity':
        return (
          <div className="text-center py-8 text-gray-500">
            <p>{t('noActivity')}</p>
            <p className="text-sm">{t('activityWillAppear')}</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No new notifications</p>
          </div>
        );
      case 'events':
        return (
          <div className="text-center py-8 text-gray-500">
            <p>{t('noEvents')}</p>
            <Link href="/resources" className="text-indigo-600 hover:underline">
              {t('viewAllEvents')}
            </Link>
          </div>
        );
      case 'bookshelf':
        return session?.user?.id ? <Bookshelf userId={session.user.id} editable={true} /> : null;
      case 'media':
        return <MediaLibrary />;
      case 'my-content':
        return <UserContentList />;
      default:
        return null;
    }
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
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ label: tCommon('nav.home'), href: '/' }, { label: tCommon('nav.dashboard') }]}
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">
            {t('welcome', { name: session?.user?.name ? `, ${session.user.name}` : '' })}
          </h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        <DashboardTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddWidget={() => setShowAddWidget(true)}
        />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {renderWidgetContent(widgetId)}
                </DraggableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {activeWidgets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No widgets in this tab</p>
            <button
              onClick={() => setShowAddWidget(true)}
              className="text-indigo-600 hover:underline"
            >
              Add a widget
            </button>
          </div>
        )}
      </div>

      <AddWidgetModal
        isOpen={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        availableWidgets={getAvailableWidgets().map(w => ({
          id: w.id,
          label: w.title,
          icon: w.icon,
        }))}
        onSelect={handleAddWidget}
      />
    </main>
  );
}

function UserContentList() {
  const { data: session } = authClient.useSession();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!session?.user?.id) return;

    fetch(`/api/content?authorId=${session.user.id}`)
      .then(res => res.json())
      .then(data => {
        setContent(Array.isArray(data) ? data : []);
      })
      .catch(() => setContent([]))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded"></div>;
  }

  if (content.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">
        No content yet.{' '}
        <Link href="/admin/content/new" className="text-indigo-600 hover:underline">
          Create your first post!
        </Link>
      </p>
    );
  }

  const totalPages = Math.ceil(content.length / itemsPerPage);
  const paginatedContent = content.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-2">
      {paginatedContent.map(item => (
        <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{item.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    item.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {item.published ? 'Published' : 'Draft'}
                </span>
                <span className="text-xs text-gray-500">{item.category}</span>
                {item.publishedAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Link
                href={`/admin/content/${item.id}`}
                className="p-2 text-gray-500 hover:text-indigo-600"
                title="Edit"
                onClick={e => e.stopPropagation()}
              >
                <i className="fas fa-edit"></i>
              </Link>
              <i
                className={`fas fa-chevron-down transition-transform ${
                  expandedId === item.id ? 'rotate-180' : ''
                }`}
              ></i>
            </div>
          </div>
          {expandedId === item.id && (
            <div className="p-4 border-t border-gray-200 bg-white">
              {item.excerpt && <p className="text-gray-600 text-sm mb-3">{item.excerpt}</p>}
              <div
                className="prose prose-sm max-w-none text-gray-700 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content || '') }}
              />
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Link
                  href={`/admin/content/${item.id}`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Continue reading →
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-4"
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}
