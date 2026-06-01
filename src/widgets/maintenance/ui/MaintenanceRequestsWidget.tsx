'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Wrench } from 'lucide-react';
import { ErrorBoundary, LoadingSpinner } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('MaintenanceRequestsWidget');

interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

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
        // scope=mine forces user-scoped view even for admins — this widget is rendered
        // on the user-facing services space, so it should always show the user's own requests
        const res = await fetch('/api/maintenance?scope=mine');
        const body = await res.json();
        const data = body?.data ?? body;
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
          <div className="text-center py-8">
            <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No maintenance requests yet</p>
            <Link
              href="/dashboard/services/maintenance?action=new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Submit a Request
            </Link>
          </div>
        ) : (
          <>
            {requests.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">{request.category}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${statusColors[request.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {request.status?.replace('_', ' ') ?? request.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            <Link
              href="/dashboard/services/maintenance"
              className="block text-center text-sm text-indigo-600 hover:text-indigo-800 py-2 border-t border-gray-100 mt-2"
            >
              View All Requests →
            </Link>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
