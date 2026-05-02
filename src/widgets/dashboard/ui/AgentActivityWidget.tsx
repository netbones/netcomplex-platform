'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AgentActivity {
  id: string;
  type: string;
  description: string;
  propertyId: string;
  propertyUnit: string;
  performedAt: string;
  agentName: string;
}

export function AgentActivityWidget() {
  const { t } = useTranslation('dashboard');
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgentActivity() {
      try {
        const res = await fetch('/api/agents/activity');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setActivities(data.activities || []);
      } catch (err) {
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    }
    fetchAgentActivity();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lease_review':
        return 'fa-file-signature';
      case 'maintenance':
        return 'fa-wrench';
      case 'communication':
        return 'fa-comments';
      case 'inspection':
        return 'fa-search';
      default:
        return 'fa-tasks';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lease_review':
        return 'bg-blue-100 text-blue-600';
      case 'maintenance':
        return 'bg-amber-100 text-amber-600';
      case 'communication':
        return 'bg-green-100 text-green-600';
      case 'inspection':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
        <div className="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
        <div className="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
          <i className="fas fa-exclamation-circle text-red-400"></i>
        </div>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-clock text-gray-400"></i>
        </div>
        <p className="text-gray-500 text-sm">{t('noAgentActivity', 'No recent activity')}</p>
        <p className="text-gray-400 text-xs mt-1">Your agent&apos;s activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map(activity => (
        <div
          key={activity.id}
          className="p-3 rounded-lg bg-slate-50 border border-transparent hover:border-indigo-200 transition"
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}
            >
              <i className={`fas ${getActivityIcon(activity.type)} text-xs`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Unit {activity.propertyUnit} • {activity.agentName}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(activity.performedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
