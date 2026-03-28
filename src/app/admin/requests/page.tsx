'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    street: string;
    unit: string;
  };
}

const statusOptions = ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const priorityColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchRequests() {
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('status', filter);

        const res = await fetch(`/api/maintenance?${params}`);
        const data = await res.json();
        setRequests(data);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, [filter]);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, status: newStatus } : r)));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[{ label: 'Admin', href: '/admin' }, { label: 'Maintenance Requests' }]}
      />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Maintenance Requests</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All
          </button>
          {statusOptions.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg ${filter === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No maintenance requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{request.category}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[request.priority]}`}
                    >
                      {request.priority}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {request.user.name} • {request.user.street}
                    {request.user.unit && `, ${request.user.unit}`} • {request.user.email}
                  </p>
                </div>
                <select
                  value={request.status}
                  onChange={e => handleStatusChange(request.id, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-gray-700 mb-4">{request.description}</p>

              <div className="text-sm text-gray-500">
                Submitted: {new Date(request.createdAt).toLocaleDateString()} at{' '}
                {new Date(request.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
