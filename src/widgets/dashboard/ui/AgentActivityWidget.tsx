'use client';

import { useTranslation } from 'react-i18next';

import { AlertCircle, Clock } from 'lucide-react';
import { trpc } from '@api/client';

export function AgentActivityWidget() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, error } = trpc.agents.getActivity.useQuery(undefined, {
    staleTime: 60_000,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities: any[] = (data?.data as any)?.activities ?? [];

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

  if (isLoading) {
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
          <AlertCircle className="text-red-400" />
        </div>
        <p className="text-red-500 text-sm">{error?.message ?? 'Failed to load activity'}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <Clock className="text-gray-400" />
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
