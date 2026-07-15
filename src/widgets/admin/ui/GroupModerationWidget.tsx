'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@shared/ui';

import { UserCheck } from 'lucide-react';
interface MembershipRequest {
  id: string;
  userId: string;
  groupId: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
  group: {
    name: string;
    accessType: string;
  } | null;
}

export function GroupModerationWidget() {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/membership-requests?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      // Silently fail - ErrorBoundary will catch render errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionInProgress(id);
    try {
      const res = await fetch(`/api/groups/membership-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        // Remove from list (optimistic update)
        setRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch {
      // Refetch on error to restore consistent state
      fetchRequests();
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          <UserCheck className="mr-2 text-indigo-600" />
          Group Membership Requests
        </h3>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'PENDING' | 'ALL')}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="PENDING">Pending</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="text-gray-500 text-sm">No pending membership requests</p>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <div key={request.id} className="border rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {request.user?.name || 'Unknown User'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {request.user?.email} &middot; {request.group?.name || 'Unknown Group'}
                  </p>
                  {request.message && (
                    <p className="text-sm text-gray-600 mt-1 italic">
                      &ldquo;{request.message}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(request.id, 'approve')}
                    disabled={actionInProgress === request.id}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === request.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleAction(request.id, 'reject')}
                    disabled={actionInProgress === request.id}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === request.id ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupModerationWidgetWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <GroupModerationWidget />
    </ErrorBoundary>
  );
}
