'use client';

import { useEffect, useState } from 'react';
import type {
  MaintenanceRequest,
  BoardMember,
  HistoryEntry,
  NoteEntry,
  MaintenanceTeam,
  ServiceProvider,
} from './types';

export type { MaintenanceTeam, ServiceProvider } from './types';

import {
  formatDate,
  formatDateTime,
  friendlyStatus,
  getStatusTimeline,
  priorityColors,
  statusColors,
  statusDotColors,
  workflowTransitions,
  priorityOptions,
} from './constants';

interface RequestDetailProps {
  selectedRequest: MaintenanceRequest;
  history: HistoryEntry[];
  notes: NoteEntry[];
  loadingHistory: boolean;
  loadingNotes: boolean;
  boardMembers: BoardMember[];
  teams: MaintenanceTeam[];
  providers: ServiceProvider[];
  handoffMode: boolean;
  handoffProviderId: string;
  handoffReason: string;
  newNote: string;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onPriorityChange: (id: string, priority: string) => Promise<void>;
  onAssigneeChange: (id: string, assignee: string) => Promise<void>;
  onAssignment: (id: string, teamId?: string, providerId?: string) => Promise<void>;
  onScheduleChange: (id: string, date: string) => Promise<void>;
  onVendorChange: (id: string, vendor: string) => Promise<void>;
  onCostChange: (id: string, field: 'estimatedCost' | 'actualCost', value: string) => Promise<void>;
  onHandoff: (id: string) => void;
  onSetHandoffMode: (v: boolean) => void;
  onSetHandoffProviderId: (v: string) => void;
  onSetHandoffReason: (v: string) => void;
  onNotifyResident: () => void;
  onAddNote: (id: string) => void;
  onDeleteNote: (requestId: string, noteId: string) => void;
  onNewNoteChange: (v: string) => void;
}

export function RequestDetail({
  selectedRequest,
  history,
  notes,
  loadingHistory,
  loadingNotes,
  boardMembers,
  teams,
  providers,
  handoffMode,
  handoffProviderId,
  handoffReason,
  newNote,
  onClose,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onAssignment,
  onScheduleChange,
  onVendorChange,
  onCostChange,
  onHandoff,
  onSetHandoffMode,
  onSetHandoffProviderId,
  onSetHandoffReason,
  onNotifyResident,
  onAddNote,
  onDeleteNote,
  onNewNoteChange,
}: RequestDetailProps) {
  const statusTimeline = getStatusTimeline(history);

  const [draftStatus, setDraftStatus] = useState(selectedRequest.status);
  const [draftPriority, setDraftPriority] = useState(selectedRequest.priority);
  const [draftTeamId, setDraftTeamId] = useState(selectedRequest.assignedTeamId || '');
  const [draftProviderId, setDraftProviderId] = useState(selectedRequest.assignedProviderId || '');
  const [draftAssignedTo, setDraftAssignedTo] = useState(selectedRequest.assignedTo || '');
  const [draftVendor, setDraftVendor] = useState(selectedRequest.vendor || '');
  const [draftScheduledDate, setDraftScheduledDate] = useState(
    selectedRequest.scheduledDate ? selectedRequest.scheduledDate.split('T')[0] : ''
  );
  const [draftEstimatedCost, setDraftEstimatedCost] = useState(
    selectedRequest.estimatedCost != null ? String(selectedRequest.estimatedCost) : ''
  );
  const [draftActualCost, setDraftActualCost] = useState(
    selectedRequest.actualCost != null ? String(selectedRequest.actualCost) : ''
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftStatus(selectedRequest.status);
    setDraftPriority(selectedRequest.priority);
    setDraftTeamId(selectedRequest.assignedTeamId || '');
    setDraftProviderId(selectedRequest.assignedProviderId || '');
    setDraftAssignedTo(selectedRequest.assignedTo || '');
    setDraftVendor(selectedRequest.vendor || '');
    setDraftScheduledDate(
      selectedRequest.scheduledDate ? selectedRequest.scheduledDate.split('T')[0] : ''
    );
    setDraftEstimatedCost(
      selectedRequest.estimatedCost != null ? String(selectedRequest.estimatedCost) : ''
    );
    setDraftActualCost(
      selectedRequest.actualCost != null ? String(selectedRequest.actualCost) : ''
    );
  }, [selectedRequest.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = selectedRequest.id;
      if (draftStatus !== selectedRequest.status) await onStatusChange(id, draftStatus);
      if (draftPriority !== selectedRequest.priority) await onPriorityChange(id, draftPriority);
      if (draftAssignedTo !== (selectedRequest.assignedTo || ''))
        await onAssigneeChange(id, draftAssignedTo || '');
      if (
        draftTeamId !== (selectedRequest.assignedTeamId || '') ||
        draftProviderId !== (selectedRequest.assignedProviderId || '')
      )
        await onAssignment(id, draftTeamId || undefined, draftProviderId || undefined);
      if (
        draftScheduledDate !==
        (selectedRequest.scheduledDate ? selectedRequest.scheduledDate.split('T')[0] : '')
      )
        await onScheduleChange(id, draftScheduledDate);
      if (draftVendor !== (selectedRequest.vendor || '')) await onVendorChange(id, draftVendor);
      if (
        draftEstimatedCost !==
        (selectedRequest.estimatedCost != null ? String(selectedRequest.estimatedCost) : '')
      )
        await onCostChange(id, 'estimatedCost', draftEstimatedCost);
      if (
        draftActualCost !==
        (selectedRequest.actualCost != null ? String(selectedRequest.actualCost) : '')
      )
        await onCostChange(id, 'actualCost', draftActualCost);
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    draftStatus !== selectedRequest.status ||
    draftPriority !== selectedRequest.priority ||
    draftTeamId !== (selectedRequest.assignedTeamId || '') ||
    draftProviderId !== (selectedRequest.assignedProviderId || '') ||
    draftAssignedTo !== (selectedRequest.assignedTo || '') ||
    draftVendor !== (selectedRequest.vendor || '') ||
    draftScheduledDate !==
      (selectedRequest.scheduledDate ? selectedRequest.scheduledDate.split('T')[0] : '') ||
    draftEstimatedCost !==
      (selectedRequest.estimatedCost != null ? String(selectedRequest.estimatedCost) : '') ||
    draftActualCost !==
      (selectedRequest.actualCost != null ? String(selectedRequest.actualCost) : '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-xl bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden animate-slide-up shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white pt-3 z-10">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
        </div>
        <div className="p-6 pt-3">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
              {selectedRequest.ticketNumber && (
                <span className="text-sm font-mono text-indigo-600 font-semibold">
                  #{selectedRequest.ticketNumber}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Status Workflow</h3>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[draftStatus]}`}
              >
                {friendlyStatus(draftStatus)}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[draftPriority]}`}
              >
                {draftPriority}
              </span>
            </div>

            {workflowTransitions[draftStatus]?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {workflowTransitions[draftStatus].map(nextStatus => (
                  <button
                    key={nextStatus}
                    onClick={() => setDraftStatus(nextStatus)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${statusColors[nextStatus]} border-transparent hover:opacity-80`}
                  >
                    → {friendlyStatus(nextStatus)}
                  </button>
                ))}
              </div>
            )}

            {(draftStatus === 'COMPLETED' || draftStatus === 'CANCELLED') && (
              <p className="text-xs text-gray-500 italic">This request is in a terminal state.</p>
            )}

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={draftPriority}
                onChange={e => setDraftPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {priorityOptions.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onNotifyResident}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              📧 Notify Resident
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              Resident Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900 truncate">
                {selectedRequest.user?.name || 'Unknown'}
              </p>
              <p className="text-gray-600 truncate">{selectedRequest.user?.email || 'No email'}</p>
              <p className="text-gray-600">
                {selectedRequest.user?.address?.street
                  ? `${selectedRequest.user.address.street}${selectedRequest.user.address.unit ? `, ${selectedRequest.user.address.unit}` : ''}`
                  : 'Address on file'}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Request Details</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">
                Category:{' '}
                <span className="font-medium text-gray-900 capitalize">
                  {selectedRequest.category.replace('_', ' ')}
                </span>
              </p>
              {(selectedRequest.preferredDate || selectedRequest.preferredTime) && (
                <p className="text-sm text-gray-500 mb-1">
                  Preferred:{' '}
                  <span className="font-medium text-gray-900">
                    {selectedRequest.preferredDate && formatDate(selectedRequest.preferredDate)}
                    {selectedRequest.preferredTime && ` at ${selectedRequest.preferredTime}`}
                  </span>
                </p>
              )}
              <p className="text-gray-700 whitespace-pre-wrap break-words">
                {selectedRequest.description}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
              Assignment & Scheduling
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  In-house Team
                </label>
                <select
                  value={draftTeamId}
                  onChange={e => {
                    setDraftTeamId(e.target.value);
                    if (e.target.value) setDraftProviderId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">No team assigned</option>
                  {teams
                    .filter(t => t.isActive)
                    .map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.trade})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Provider
                </label>
                {draftTeamId ? (
                  <p className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm">
                    Inhouse Team
                  </p>
                ) : (
                  <select
                    value={draftProviderId}
                    onChange={e => setDraftProviderId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">No provider assigned</option>
                    {providers
                      .filter(p => p.isActive)
                      .map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {provider.companyName} ({provider.trade})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {draftTeamId && !handoffMode && (
                <button
                  onClick={() => onSetHandoffMode(true)}
                  className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                  Hand off to Provider
                </button>
              )}

              {handoffMode && (
                <div className="border border-amber-300 rounded-lg p-3 bg-amber-50">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">
                    Hand off to Provider
                  </h4>
                  <p className="text-xs text-amber-700 mb-3">
                    This will unassign the current team and assign a provider instead. A history
                    entry will record the reason.
                  </p>
                  <div className="space-y-2">
                    <select
                      value={handoffProviderId}
                      onChange={e => onSetHandoffProviderId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="">Select a provider...</option>
                      {providers
                        .filter(p => p.isActive)
                        .map(provider => (
                          <option key={provider.id} value={provider.id}>
                            {provider.companyName} ({provider.trade})
                          </option>
                        ))}
                    </select>
                    <textarea
                      value={handoffReason}
                      onChange={e => onSetHandoffReason(e.target.value)}
                      placeholder="Reason for handoff (e.g., scope issue, specialized repair needed)..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onHandoff(selectedRequest.id)}
                        disabled={!handoffProviderId}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm Handoff
                      </button>
                      <button
                        onClick={() => {
                          onSetHandoffMode(false);
                          onSetHandoffProviderId('');
                          onSetHandoffReason('');
                        }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To (Board Member)
                </label>
                <select
                  value={draftAssignedTo}
                  onChange={e => setDraftAssignedTo(e.target.value)}
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
                  value={draftVendor}
                  onChange={e => setDraftVendor(e.target.value)}
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
                  value={draftScheduledDate}
                  onChange={e => setDraftScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Cost Tracking</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Cost (ZAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draftEstimatedCost}
                    onChange={e => setDraftEstimatedCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actual Cost (ZAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draftActualCost}
                    onChange={e => setDraftActualCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Progress Timeline</h3>
            {loadingHistory ? (
              <p className="text-gray-500 text-sm">Loading timeline...</p>
            ) : statusTimeline.length === 0 ? (
              <p className="text-gray-500 text-sm">No status changes yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
                <div className="space-y-4">
                  {statusTimeline.map(entry => (
                    <div key={entry.id} className="relative pl-8">
                      <div
                        className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${statusDotColors[entry.newValue] || 'bg-gray-400'}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[entry.newValue] || ''}`}
                          >
                            {friendlyStatus(entry.newValue)}
                          </span>
                          {entry.oldValue && (
                            <span className="text-xs text-gray-400">
                              from {friendlyStatus(entry.oldValue)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {entry.user?.name || 'System'} • {formatDateTime(entry.createdAt)}
                        </p>
                        {entry.comment && (
                          <p className="text-xs text-gray-600 mt-0.5 italic">
                            &ldquo;{entry.comment}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedRequest.images && selectedRequest.images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                Images ({selectedRequest.images.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedRequest.images.map((img, idx) => (
                  <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
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

          <div className="text-sm text-gray-500 mb-6">
            <p>Created: {formatDateTime(selectedRequest.createdAt)}</p>
            <p>Updated: {formatDateTime(selectedRequest.updatedAt || selectedRequest.createdAt)}</p>
          </div>

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
                      <span className="font-medium text-gray-900 capitalize">{entry.field}</span>
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
                        <p className="text-gray-600 mt-1 italic">&ldquo;{entry.comment}&rdquo;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Internal Notes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => onNewNoteChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onAddNote(selectedRequest.id)}
                  placeholder="Add internal note..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  onClick={() => onAddNote(selectedRequest.id)}
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
                          onClick={() => onDeleteNote(selectedRequest.id, note.id)}
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
        {isDirty && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 z-10">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
