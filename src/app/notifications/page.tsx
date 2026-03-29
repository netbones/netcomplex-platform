'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { t } = useTranslation('common');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const endpoint = filter === 'unread' ? '/api/notifications?unread=true' : '/api/notifications';
    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications(notifications.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.notifications') }]}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-indigo-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg ${filter === 'unread' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No notifications</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
              onClick={() => !notification.read && markRead(notification.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3
                    className={`font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}
                  >
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!notification.read && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
              </div>
              {notification.link && (
                <Link
                  href={notification.link}
                  className="text-indigo-600 text-sm hover:underline mt-2 block"
                >
                  View details
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
