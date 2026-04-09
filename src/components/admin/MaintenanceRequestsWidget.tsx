'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/Loading';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('MaintenanceRequestsWidget');

interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    address?: { street: string; unit: string | null } | null;
  };
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  PENDING_PARTS: 'bg-orange-100 text-orange-800',
  SCHEDULED: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export function MaintenanceRequestsWidget() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch(
          '/api/maintenance?status=SUBMITTED&priority=EMERGENCY&priority=HIGH'
        );
        const data = await res.json();
        setRequests(data.slice(0, 5));
      } catch (error) {
        log.error({}, 'Failed to fetch requests', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-3">
        {requests.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No urgent requests</p>
        ) : (
          requests.map(request => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 truncate">{request.category}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${priorityColors[request.priority]}`}
                  >
                    {request.priority}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${statusColors[request.status]}`}
                  >
                    {request.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {request.user?.name} • {request.user?.address?.street || 'Address on file'}
                </p>
              </div>
              <Link
                href="/admin/requests"
                className="ml-2 text-indigo-600 hover:text-indigo-800 text-sm"
              >
                View →
              </Link>
            </div>
          ))
        )}
        <Link
          href="/admin/requests"
          className="block text-center text-sm text-indigo-600 hover:text-indigo-800 py-2 border-t border-gray-100 mt-2"
        >
          View All Requests →
        </Link>
      </div>
    </ErrorBoundary>
  );
}
