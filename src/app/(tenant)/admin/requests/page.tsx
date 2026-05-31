'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs, ErrorBoundary, LoadingSpinner } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('admin-requests-page');

interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  images: string[];
  assignedTo: string | null;
  vendor: string | null;
  scheduledDate: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  resolution: string | null;
  completedAt: string | null;
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

interface BoardMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
  } | null;
}

interface NoteEntry {
  id: string;
  requestId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
  } | null;
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [newNote, setNewNote] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/maintenance?${params}`);
      const json = await res.json();
      setRequests(json.data);
    } catch (error) {
      log.error({}, 'Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, search]);

  const fetchHistory = useCallback(async (requestId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/maintenance/${requestId}/history`);
      const json = await res.json();
      setHistory(json.data);
    } catch (error) {
      log.error({}, 'Failed to fetch history', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchNotes = useCallback(async (requestId: string) => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/maintenance/${requestId}/notes`);
      const json = await res.json();
      setNotes(json.data);
    } catch (error) {
      log.error({}, 'Failed to fetch notes', error);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRequests]);

  useEffect(() => {
    if (selectedRequest) {
      fetchHistory(selectedRequest.id);
      fetchNotes(selectedRequest.id);
    }
  }, [selectedRequest, fetchHistory, fetchNotes]);

  useEffect(() => {
    async function fetchBoardMembers() {
      try {
        const res = await fetch('/api/admin/board-members');
        const json = await res.json();
        setBoardMembers(json.data);
      } catch (error) {
        log.error({}, 'Failed to fetch board members', error);
      }
    }
    fetchBoardMembers();
  }, []);

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
      fetchHistory(requestId);
    } catch (error) {
      log.error({}, 'Failed to update status', error);
    }
  };

  const handlePriorityChange = async (requestId: string, newPriority: string) => {
    try {
      await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, priority: newPriority } : r)));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, priority: newPriority });
      }
      fetchHistory(requestId);
    } catch (error) {
      log.error({}, 'Failed to update priority', error);
    }
  };

  const handleAssigneeChange = async (requestId: string, assignedTo: string) => {
    try {
      await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: assignedTo || null }),
      });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, assignedTo } : r)));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, assignedTo });
      }
      fetchHistory(requestId);
    } catch (error) {
      log.error({}, 'Failed to update assignee', error);
    }
  };

  const handleScheduleChange = async (requestId: string, scheduledDate: string) => {
    try {
      const date = scheduledDate ? new Date(scheduledDate).toISOString() : null;
      await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: date }),
      });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, scheduledDate: date } : r)));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, scheduledDate: date });
      }
      fetchHistory(requestId);
    } catch (error) {
      log.error({}, 'Failed to update schedule', error);
    }
  };

  const handleVendorChange = async (requestId: string, vendor: string) => {
    try {
      await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: vendor || null }),
      });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, vendor } : r)));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, vendor });
      }
      fetchHistory(requestId);
    } catch (error) {
      log.error({}, 'Failed to update vendor', error);
    }
  };

  const handleCostChange = async (
    requestId: string,
    field: 'estimatedCost' | 'actualCost',
    value: string
  ) => {
    try {
      const updates = { [field]: value || null };
      await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, [field]: value } : r)));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, [field]: value });
      }
    } catch (error) {
      log.error({ field }, `Failed to update ${field}`, error);
    }
  };

  const handleAddNote = async (requestId: string) => {
    if (!newNote.trim()) return;
    try {
      await fetch(`/api/maintenance/${requestId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, isInternal: true }),
      });
      setNewNote('');
      fetchNotes(requestId);
    } catch (error) {
      log.error({}, 'Failed to add note', error);
    }
  };

  const handleDeleteNote = async (requestId: string, noteId: string) => {
    try {
      await fetch(`/api/maintenance/${requestId}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });
      fetchNotes(requestId);
    } catch (error) {
      log.error({}, 'Failed to delete note', error);
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={selectedRequest.priority}
                        onChange={e => handlePriorityChange(selectedRequest.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        {priorityOptions.map(p => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/maintenance/${selectedRequest.id}/notify`,
                              {
                                method: 'POST',
                              }
                            );
                            const data = await res.json();
                            if (data.success) {
                              alert(`Notification sent to ${data.recipient}`);
                            } else {
                              alert('Failed to send notification');
                            }
                          } catch (error) {
                            log.error({}, 'Failed to send notification', error);
                            alert('Error sending notification');
                          }
                        }}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        📧 Notify Resident
                      </button>
                    </div>
                  </div>
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

                {/* Assignment & Scheduling */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                    Assignment & Scheduling
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assigned To
                      </label>
                      <select
                        value={selectedRequest.assignedTo || ''}
                        onChange={e => handleAssigneeChange(selectedRequest.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="">Unassigned</option>
                        {boardMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name} ({member.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                      <input
                        type="text"
                        value={selectedRequest.vendor || ''}
                        onChange={e => handleVendorChange(selectedRequest.id, e.target.value)}
                        placeholder="Enter vendor name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scheduled Date
                      </label>
                      <input
                        type="date"
                        value={
                          selectedRequest.scheduledDate
                            ? selectedRequest.scheduledDate.split('T')[0]
                            : ''
                        }
                        onChange={e => handleScheduleChange(selectedRequest.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Cost Tracking */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                    Cost Tracking
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estimated Cost ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={selectedRequest.estimatedCost || ''}
                          onChange={e =>
                            handleCostChange(selectedRequest.id, 'estimatedCost', e.target.value)
                          }
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Cost ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={selectedRequest.actualCost || ''}
                          onChange={e =>
                            handleCostChange(selectedRequest.id, 'actualCost', e.target.value)
                          }
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>
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
                <div className="text-sm text-gray-500 mb-6">
                  <p>Created: {formatDateTime(selectedRequest.createdAt)}</p>
                  <p>
                    Updated:{' '}
                    {formatDateTime(selectedRequest.updatedAt || selectedRequest.createdAt)}
                  </p>
                </div>

                {/* History */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">History</h3>
                  {loadingHistory ? (
                    <p className="text-gray-500 text-sm">Loading history...</p>
                  ) : history.length === 0 ? (
                    <p className="text-gray-500 text-sm">No history yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map(entry => (
                        <div key={entry.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 capitalize">
                              {entry.field}
                            </span>
                            {entry.oldValue && (
                              <>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-600">{entry.newValue}</span>
                              </>
                            )}
                            {!entry.oldValue && (
                              <span className="text-gray-600">set to {entry.newValue}</span>
                            )}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {entry.user?.name || 'Unknown'} • {formatDateTime(entry.createdAt)}
                            {entry.comment && (
                              <p className="text-gray-600 mt-1 italic">"{entry.comment}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Internal Notes */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                    Internal Notes
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddNote(selectedRequest.id)}
                        placeholder="Add internal note..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                      <button
                        onClick={() => handleAddNote(selectedRequest.id)}
                        disabled={!newNote.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    {loadingNotes ? (
                      <p className="text-gray-500 text-sm">Loading notes...</p>
                    ) : notes.length === 0 ? (
                      <p className="text-gray-500 text-sm">No notes yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map(note => (
                          <div key={note.id} className="bg-white rounded-lg p-3 text-sm">
                            <div className="flex justify-between items-start">
                              <p className="text-gray-700">{note.content}</p>
                              <button
                                onClick={() => handleDeleteNote(selectedRequest.id, note.id)}
                                className="text-gray-400 hover:text-red-500 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {note.user?.name || 'Unknown'} • {formatDateTime(note.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
