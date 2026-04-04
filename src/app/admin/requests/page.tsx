'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/Loading';

interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    address?: {
      street: string;
      unit: string | null;
    } | null;
  };
}

const statusOptions = [
  'SUBMITTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
];
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
const categoryOptions = [
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'APPLIANCE',
  'STRUCTURAL',
  'LANDSCAPING',
  'OTHER',
];

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDaysOld(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/maintenance?${params}`);
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRequests]);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, status: newStatus } : r)));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[{ label: 'Admin', href: '/admin' }, { label: 'Maintenance Requests' }]}
        />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Requests</h1>
          <div className="text-sm text-gray-500">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, address, description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="all">All Priorities</option>
                {priorityOptions.map(priority => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  categoryFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categoryOptions.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">No maintenance requests found.</p>
            {(search ||
              statusFilter !== 'all' ||
              priorityFilter !== 'all' ||
              categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-2 text-indigo-600 hover:text-indigo-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => {
              const daysOld = getDaysOld(request.createdAt);
              return (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.category}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[request.priority]}`}
                        >
                          {request.priority}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}
                        >
                          {request.status.replace('_', ' ')}
                        </span>
                        {daysOld > 7 &&
                          request.status !== 'COMPLETED' &&
                          request.status !== 'CANCELLED' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {daysOld} days old
                            </span>
                          )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        <span className="font-medium text-gray-700">
                          {request.user?.name || 'Unknown'}
                        </span>
                        {' • '}
                        {request.user?.address?.street
                          ? `${request.user.address.street}${request.user.address.unit ? `, ${request.user.address.unit}` : ''}`
                          : 'Address on file'}
                        {' • '}
                        {request.user?.email || 'No email'}
                      </p>
                      <p className="text-gray-700 line-clamp-2">{request.description}</p>
                    </div>
                    <div className="text-sm text-gray-500 text-right ml-4">
                      <div>{formatDate(request.createdAt)}</div>
                      {request.images?.length > 0 && (
                        <div className="text-indigo-600">
                          {request.images.length} image{request.images.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Drawer */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSelectedRequest(null)}
            />
            <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Status & Priority */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[selectedRequest.priority]}`}
                    >
                      {selectedRequest.priority}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedRequest.status]}`}
                    >
                      {selectedRequest.status.replace('_', ' ')}
                    </span>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Status
                  </label>
                  <select
                    value={selectedRequest.status}
                    onChange={e => handleStatusChange(selectedRequest.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resident Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                    Resident Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-900">
                      {selectedRequest.user?.name || 'Unknown'}
                    </p>
                    <p className="text-gray-600">{selectedRequest.user?.email || 'No email'}</p>
                    <p className="text-gray-600">
                      {selectedRequest.user?.address?.street
                        ? `${selectedRequest.user.address.street}${selectedRequest.user.address.unit ? `, ${selectedRequest.user.address.unit}` : ''}`
                        : 'Address on file'}
                    </p>
                  </div>
                </div>

                {/* Request Details */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                    Request Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">
                      Category:{' '}
                      <span className="font-medium text-gray-900">{selectedRequest.category}</span>
                    </p>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedRequest.description}
                    </p>
                  </div>
                </div>

                {/* Images */}
                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                      Images ({selectedRequest.images.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedRequest.images.map((img, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                        >
                          <img
                            src={img}
                            alt={`Image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-sm text-gray-500">
                  <p>Created: {formatDateTime(selectedRequest.createdAt)}</p>
                  <p>
                    Updated:{' '}
                    {formatDateTime(selectedRequest.updatedAt || selectedRequest.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
