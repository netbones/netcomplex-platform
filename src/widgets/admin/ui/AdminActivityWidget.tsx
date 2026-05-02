'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@shared/ui';

interface ActivityItem {
  id: string;
  type: 'user' | 'request' | 'content' | 'group';
  action: string;
  target: string;
  timestamp: string;
  icon: string;
  color: string;
}

export function AdminActivityWidget() {
  const { t } = useTranslation('admin');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching recent admin activities
    // In a real implementation, this would fetch from an audit log API
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'user',
        action: 'created',
        target: 'New resident account',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
        icon: 'fa-user-plus',
        color: 'text-green-600',
      },
      {
        id: '2',
        type: 'request',
        action: 'approved',
        target: 'Maintenance request #1234',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        icon: 'fa-check-circle',
        color: 'text-blue-600',
      },
      {
        id: '3',
        type: 'content',
        action: 'published',
        target: 'Community newsletter',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        icon: 'fa-newspaper',
        color: 'text-purple-600',
      },
      {
        id: '4',
        type: 'group',
        action: 'created',
        target: 'Gardening interest group',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        icon: 'fa-users',
        color: 'text-orange-600',
      },
    ];

    // Simulate API delay
    setTimeout(() => {
      setActivities(mockActivities);
      setLoading(false);
    }, 500);
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-inbox text-3xl mb-3"></i>
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ${activity.color}`}
                >
                  <i className={`fas ${activity.icon} text-sm`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium capitalize">{activity.action}</span>{' '}
                    {activity.target}
                  </p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            View all activity →
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
