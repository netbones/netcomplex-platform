'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/shared/api/http-client';
import type { MaintenanceCategory } from '@entities/maintenance';
import type {
  MaintenanceRequest,
  BoardMember,
  HistoryEntry,
  NoteEntry,
  MaintenanceTeam,
  ServiceProvider,
} from '@widgets/admin';
import { RequestFilters, RequestCards, RequestDetail } from '@widgets/admin';

const log = createComponentLogger('admin-requests-page');

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

  const [teams, setTeams] = useState<MaintenanceTeam[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryLabel, setEditCategoryLabel] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');
  const [handoffMode, setHandoffMode] = useState(false);
  const [handoffProviderId, setHandoffProviderId] = useState('');
  const [handoffReason, setHandoffReason] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search) params.set('search', search);
      const { data } = await apiGet<MaintenanceRequest[]>(`/api/maintenance?${params}`);
      setRequests(data);
    } catch (error) {
      log.error({}, 'Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, search]);

  const fetchHistory = useCallback(async (requestId: string) => {
    setLoadingHistory(true);
    try {
      const { data } = await apiGet<HistoryEntry[]>(`/api/maintenance/${requestId}/history`);
      setHistory(data);
    } catch (error) {
      log.error({}, 'Failed to fetch history', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchNotes = useCallback(async (requestId: string) => {
    setLoadingNotes(true);
    try {
      const { data } = await apiGet<NoteEntry[]>(`/api/maintenance/${requestId}/notes`);
      setNotes(data);
    } catch (error) {
      log.error({}, 'Failed to fetch notes', error);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await apiGet<MaintenanceTeam[]>('/api/maintenance/teams');
      setTeams(data || []);
    } catch (error) {
      log.error({}, 'Failed to fetch teams', error);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const { data } = await apiGet<ServiceProvider[]>('/api/maintenance/providers');
      setProviders(data || []);
    } catch (error) {
      log.error({}, 'Failed to fetch providers', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await apiGet<MaintenanceCategory[]>('/api/maintenance/categories');
      setCategories(data || []);
    } catch (error) {
      log.error({}, 'Failed to fetch categories', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchRequests(), 300);
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
        const { data } = await apiGet<BoardMember[]>('/api/admin/board-members');
        setBoardMembers(data);
      } catch (error) {
        log.error({}, 'Failed to fetch board members', error);
      }
    }
    fetchBoardMembers();
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchProviders();
    fetchCategories();
  }, [fetchTeams, fetchProviders, fetchCategories]);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      await apiPatch(`/api/maintenance/${requestId}`, { status: newStatus });
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
      await apiPatch(`/api/maintenance/${requestId}`, { priority: newPriority });
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
      await apiPatch(`/api/maintenance/${requestId}`, { assignedTo: assignedTo || null });
      setRequests(requests.map(r => (r.id === requestId ? { ...r, assignedTo } : r)));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, assignedTo });
      }
      fetchHistory(requestId);
    } catch (error) {
      log.error({}, 'Failed to update assignee', error);
    }
  };

  const handleAssignment = async (requestId: string, teamId?: string, providerId?: string) => {
    try {
      await apiPost(`/api/maintenance/${requestId}/assign`, {
        teamId: teamId || null,
        providerId: providerId || null,
      });
      fetchRequests();
      if (selectedRequest?.id === requestId) {
        fetchHistory(requestId);
        const team = teamId ? teams.find(t => t.id === teamId) : null;
        const provider = providerId ? providers.find(p => p.id === providerId) : null;
        setSelectedRequest({
          ...selectedRequest,
          assignedTeamId: teamId || null,
          assignedProviderId: providerId || null,
          assignedTeam: team ? { id: team.id, name: team.name, trade: team.trade } : null,
          assignedProvider: provider
            ? { id: provider.id, companyName: provider.companyName, trade: provider.trade }
            : null,
          status: selectedRequest.status === 'SUBMITTED' ? 'ASSIGNED' : selectedRequest.status,
        });
      }
    } catch (error) {
      log.error({}, 'Failed to assign', error);
    }
  };

  const handleHandoff = async (requestId: string) => {
    if (!handoffProviderId) return;
    try {
      await apiPost(`/api/maintenance/${requestId}/assign`, {
        teamId: null,
        providerId: handoffProviderId,
        reason: handoffReason,
      });
      setHandoffMode(false);
      setHandoffProviderId('');
      setHandoffReason('');
      fetchRequests();
      if (selectedRequest?.id === requestId) {
        fetchHistory(requestId);
        const provider = providers.find(p => p.id === handoffProviderId);
        setSelectedRequest({
          ...selectedRequest,
          assignedTeamId: null,
          assignedProviderId: handoffProviderId,
          assignedTeam: null,
          assignedProvider: provider
            ? { id: provider.id, companyName: provider.companyName, trade: provider.trade }
            : null,
        });
      }
    } catch (error) {
      log.error({}, 'Failed to hand off to provider', error);
    }
  };

  const handleScheduleChange = async (requestId: string, scheduledDate: string) => {
    try {
      const date = scheduledDate ? new Date(scheduledDate).toISOString() : null;
      await apiPatch(`/api/maintenance/${requestId}`, { scheduledDate: date });
      setRequests(
        requests.map(r => (r.id === requestId ? { ...r, scheduledDate: date as string | null } : r))
      );
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, scheduledDate: date as string | null });
      }
      fetchHistory(requestId);
    } catch (error) {
      log.error({}, 'Failed to update schedule', error);
    }
  };

  const handleVendorChange = async (requestId: string, vendor: string) => {
    try {
      await apiPatch(`/api/maintenance/${requestId}`, { vendor: vendor || null });
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
      await apiPatch(`/api/maintenance/${requestId}`, updates);
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
      await apiPost(`/api/maintenance/${requestId}/notes`, { content: newNote, isInternal: true });
      setNewNote('');
      fetchNotes(requestId);
    } catch (error) {
      log.error({}, 'Failed to add note', error);
    }
  };

  const handleDeleteNote = async (requestId: string, noteId: string) => {
    try {
      await apiDelete(`/api/maintenance/${requestId}/notes?noteId=${noteId}`);
      fetchNotes(requestId);
    } catch (error) {
      log.error({}, 'Failed to delete note', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryValue.trim() || !newCategoryLabel.trim()) return;
    try {
      await apiPost('/api/maintenance/categories', {
        value: newCategoryValue.toUpperCase().replace(/\s+/g, '_'),
        label: newCategoryLabel,
        description: newCategoryDesc || null,
      });
      setNewCategoryValue('');
      setNewCategoryLabel('');
      setNewCategoryDesc('');
      fetchCategories();
    } catch (error) {
      log.error({}, 'Failed to add category', error);
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    try {
      await apiPatch(`/api/maintenance/categories/${categoryId}`, {
        label: editCategoryLabel,
        description: editCategoryDesc || null,
      });
      setEditingCategory(null);
      setEditCategoryLabel('');
      setEditCategoryDesc('');
      fetchCategories();
    } catch (error) {
      log.error({}, 'Failed to edit category', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await apiDelete(`/api/maintenance/categories/${categoryId}`);
      fetchCategories();
    } catch (error) {
      log.error({}, 'Failed to delete category', error);
    }
  };

  const categoryFilterOptions =
    categories.length > 0
      ? categories.filter(c => c.isActive).map(c => ({ value: c.value, label: c.label }))
      : [
          { value: 'PLUMBING', label: 'Plumbing' },
          { value: 'ELECTRICAL', label: 'Electrical' },
          { value: 'HVAC', label: 'HVAC' },
          { value: 'APPLIANCE', label: 'Appliance' },
          { value: 'STRUCTURAL', label: 'Structural' },
          { value: 'LANDSCAPING', label: 'Landscaping' },
          { value: 'OTHER', label: 'Other' },
        ];

  const handleNotifyResident = async () => {
    if (!selectedRequest) return;
    try {
      const { data } = await apiPost<{ success: boolean; recipient: string }>(
        `/api/maintenance/${selectedRequest.id}/notify`
      );
      if (data.success) {
        alert(`Notification sent to ${data.recipient}`);
      } else {
        alert('Failed to send notification');
      }
    } catch (error) {
      log.error({}, 'Failed to send notification', error);
      alert('Error sending notification');
    }
  };

  const handleStartEditCategory = (id: string, label: string, desc: string) => {
    setEditingCategory(id);
    setEditCategoryLabel(label);
    setEditCategoryDesc(desc);
  };

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <Breadcrumbs
          items={[{ label: 'Admin', href: '/admin' }, { label: 'Maintenance Requests' }]}
        />

        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Image src="/platform/maintenance.svg" alt="" width={40} height={40} />
            Maintenance Requests
          </h1>
          <div className="text-sm text-gray-500">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </div>
        </div>

        <RequestFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          categoryFilterOptions={categoryFilterOptions}
          showCategoryManager={showCategoryManager}
          onToggleCategoryManager={() => setShowCategoryManager(!showCategoryManager)}
          categories={categories}
          editingCategory={editingCategory}
          editCategoryLabel={editCategoryLabel}
          editCategoryDesc={editCategoryDesc}
          newCategoryValue={newCategoryValue}
          newCategoryLabel={newCategoryLabel}
          newCategoryDesc={newCategoryDesc}
          onStartEditCategory={handleStartEditCategory}
          onCancelEditCategory={() => setEditingCategory(null)}
          onEditLabelChange={setEditCategoryLabel}
          onEditDescChange={setEditCategoryDesc}
          onSaveEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onNewValueChange={setNewCategoryValue}
          onNewLabelChange={setNewCategoryLabel}
          onNewDescChange={setNewCategoryDesc}
          onAddCategory={handleAddCategory}
        />

        <RequestCards
          loading={loading}
          requests={requests}
          search={search}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          categoryFilter={categoryFilter}
          onSelect={request => {
            setSelectedRequest(request);
            setHandoffMode(false);
            setHandoffProviderId('');
            setHandoffReason('');
          }}
          onClearFilters={() => {
            setSearch('');
            setStatusFilter('all');
            setPriorityFilter('all');
            setCategoryFilter('all');
          }}
        />

        {selectedRequest && (
          <RequestDetail
            selectedRequest={selectedRequest}
            history={history}
            notes={notes}
            loadingHistory={loadingHistory}
            loadingNotes={loadingNotes}
            boardMembers={boardMembers}
            teams={teams}
            providers={providers}
            handoffMode={handoffMode}
            handoffProviderId={handoffProviderId}
            handoffReason={handoffReason}
            newNote={newNote}
            onClose={() => setSelectedRequest(null)}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onAssigneeChange={handleAssigneeChange}
            onAssignment={handleAssignment}
            onScheduleChange={handleScheduleChange}
            onVendorChange={handleVendorChange}
            onCostChange={handleCostChange}
            onHandoff={handleHandoff}
            onSetHandoffMode={setHandoffMode}
            onSetHandoffProviderId={setHandoffProviderId}
            onSetHandoffReason={setHandoffReason}
            onNotifyResident={handleNotifyResident}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onNewNoteChange={setNewNote}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
