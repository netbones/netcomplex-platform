'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { createComponentLogger } from '@shared/lib';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/shared/api/http-client';
import type { MaintenanceTeam } from '@entities/maintenance';

const log = createComponentLogger('admin-teams-page');

const TRADES = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'LANDSCAPING', 'GENERAL'] as const;

interface TeamMember {
  id: string;
  userId: string;
  createdAt: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<MaintenanceTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTrade, setNewTrade] = useState('GENERAL');
  const [newContact, setNewContact] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTrade, setEditTrade] = useState('');
  const [editContact, setEditContact] = useState('');

  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiGet<MaintenanceTeam[]>('/api/maintenance/teams');
      setTeams(data ?? []);
    } catch (error) {
      log.error({}, 'Failed to fetch teams', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const fetchMembers = async (teamId: string) => {
    setLoadingMembers(true);
    try {
      const { data } = await apiGet<TeamMember[]>(`/api/maintenance/teams/${teamId}/members`);
      setMembers(data ?? []);
    } catch (error) {
      log.error({}, 'Failed to fetch members', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleExpand = (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      setMembers([]);
    } else {
      setExpandedTeamId(teamId);
      setNewMemberUserId('');
      fetchMembers(teamId);
    }
  };

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiPost('/api/maintenance/teams', {
        name: newName.trim(),
        trade: newTrade,
        contactName: newContact.trim() || null,
      });
      setShowCreate(false);
      setNewName('');
      setNewTrade('GENERAL');
      setNewContact('');
      fetchTeams();
      flash('Team created successfully');
    } catch (error) {
      log.error({}, 'Failed to create team', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await apiPatch(`/api/maintenance/teams/${id}`, {
        name: editName.trim(),
        trade: editTrade,
        contactName: editContact.trim() || null,
      });
      setEditingId(null);
      fetchTeams();
      flash('Team updated successfully');
    } catch (error) {
      log.error({}, 'Failed to update team', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setSaving(true);
    try {
      await apiPatch(`/api/maintenance/teams/${id}`, { isActive: !currentActive });
      fetchTeams();
      flash(currentActive ? 'Team deactivated' : 'Team activated');
    } catch (error) {
      log.error({}, 'Failed to toggle team status', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this team? It will no longer appear in assignment lists.')) return;
    setSaving(true);
    try {
      await apiDelete(`/api/maintenance/teams/${id}`);
      fetchTeams();
      flash('Team deactivated');
    } catch (error) {
      log.error({}, 'Failed to delete team', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (teamId: string) => {
    if (!newMemberUserId.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/api/maintenance/teams/${teamId}/members`, {
        userId: newMemberUserId.trim(),
      });
      setNewMemberUserId('');
      fetchMembers(teamId);
      flash('Member added');
    } catch (error) {
      log.error({}, 'Failed to add member', error);
      flash(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Remove this member from the team?')) return;
    setSaving(true);
    try {
      await apiDelete(`/api/maintenance/teams/${teamId}/members?userId=${userId}`);
      fetchMembers(teamId);
      flash('Member removed');
    } catch (error) {
      log.error({}, 'Failed to remove member', error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (team: MaintenanceTeam) => {
    setEditingId(team.id);
    setEditName(team.name);
    setEditTrade(team.trade);
    setEditContact(team.contactName || '');
  };

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4 py-8 overflow-x-hidden">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Maintenance Teams' }]} />

        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DomainIconBadge id="teams" variant="admin" size="md" />
            Maintenance Teams
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            + New Team
          </button>
        </div>

        {message && (
          <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {message}
          </div>
        )}

        {showCreate && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Create New Team</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Plumbing Crew"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Trade *</label>
                <select
                  value={newTrade}
                  onChange={e => setNewTrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {TRADES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={newContact}
                  onChange={e => setNewContact(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Create'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading teams...</p>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 mb-2">No maintenance teams yet.</p>
            <p className="text-sm text-gray-400">
              Create a team to assign maintenance requests in-house.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => {
              const isExpanded = expandedTeamId === team.id;
              return (
                <div key={team.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className={`${team.isActive ? '' : 'opacity-60 bg-gray-50'}`}>
                    <div className="px-4 py-3 flex items-center gap-4 flex-wrap">
                      <button
                        onClick={() => toggleExpand(team.id)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label={isExpanded ? 'Collapse members' : 'Expand members'}
                      >
                        {isExpanded ? '▾' : '▸'}
                      </button>

                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        {editingId === team.id ? (
                          <>
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <select
                              value={editTrade}
                              onChange={e => setEditTrade(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {TRADES.map(t => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editContact}
                              onChange={e => setEditContact(e.target.value)}
                              placeholder="Contact"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-gray-900 truncate">{team.name}</span>
                            <span className="text-gray-600 text-sm">{team.trade}</span>
                            <span className="text-gray-600 text-sm truncate">
                              {team.contactName || '—'}
                            </span>
                          </>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                            team.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {team.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {editingId === team.id ? (
                          <>
                            <button
                              onClick={() => handleEdit(team.id)}
                              disabled={saving || !editName.trim()}
                              className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={saving}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(team)}
                              disabled={saving}
                              className="px-2 py-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(team.id, team.isActive)}
                              disabled={saving}
                              className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs disabled:opacity-50"
                            >
                              {team.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(team.id)}
                              disabled={saving}
                              className="px-2 py-1 text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Team Members
                      </h4>

                      {loadingMembers ? (
                        <p className="text-sm text-gray-500">Loading...</p>
                      ) : members.length === 0 ? (
                        <p className="text-sm text-gray-500 mb-3">No members yet.</p>
                      ) : (
                        <div className="space-y-1 mb-3">
                          {members.map(member => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-sm"
                            >
                              <span className="text-gray-700 font-mono text-xs">
                                {member.userId}
                              </span>
                              <button
                                onClick={() => handleRemoveMember(team.id, member.userId)}
                                disabled={saving}
                                className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMemberUserId}
                          onChange={e => setNewMemberUserId(e.target.value)}
                          placeholder="User ID"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                          onKeyDown={e => e.key === 'Enter' && handleAddMember(team.id)}
                        />
                        <button
                          onClick={() => handleAddMember(team.id)}
                          disabled={saving || !newMemberUserId.trim()}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Add Member
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
