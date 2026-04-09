'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('admin-users-page');

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  standardSeats?: Array<{
    household: {
      street: string;
      unit: string;
    };
    isPrimaryOwner: boolean;
  }>;
  soloSeat?: {
    seatType: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  name: string;
  street: string | null;
  unit: string | null;
  residentType: string;
  status: string;
}

const roleOptions = ['RESIDENT', 'BOARD', 'ADMIN', 'COMMITTEE'];
const residentTypeOptions = ['OWNER', 'RENTER', 'SUSPENDED'];
const activeOptions = ['active', 'suspended'];

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [suspendUser, setSuspendUser] = useState<User | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    street: '',
    unit: '',
    residentType: 'OWNER',
    role: 'RESIDENT',
  });

  useEffect(() => {
    Promise.all([fetch('/api/users'), fetch('/api/invitations')])
      .then(([u, i]) => Promise.all([u.json(), i.json()]))
      .then(([usersData, invitesData]) => {
        setUsers(usersData.users || []);
        setInvitations(invitesData);
        setLoading(false);
      })
      .catch(err => log.error({}, 'Failed to fetch users', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterType !== 'all') params.set('residentType', filterType);

    fetch(`/api/users?${params}`)
      .then(r => r.json())
      .then(d => {
        setUsers(d.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, filterType]);

  const pendingInvites = invitations.filter(i => i.status === 'PENDING');
  const filteredUsers = filterRole === 'all' ? users : users.filter(u => u.role === filterRole);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm),
    });
    if (r.ok) {
      setInvitations([await r.json(), ...invitations]);
      showToast('Invitation sent successfully');
    } else {
      showToast('Failed to send invitation', 'error');
    }
    setShowInvite(false);
    setInviteForm({
      email: '',
      name: '',
      street: '',
      unit: '',
      residentType: 'OWNER',
      role: 'RESIDENT',
    });
  };

  const handleRevoke = async (id: string) => {
    await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
    setInvitations(invitations.filter(i => i.id !== id));
    showToast('Invitation revoked');
  };

  const updateUser = async (id: string, data: Record<string, string>) => {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setUsers(users.map(u => (u.id === id ? { ...u, ...data } : u)));
    showToast('User updated successfully');
  };

  const handleDelete = async () => {
    if (confirmText !== `remove ${deleteUser?.name}`) return;
    await fetch(`/api/users/${deleteUser?.id}`, { method: 'DELETE' });
    setUsers(users.filter(u => u.id !== deleteUser?.id));
    setDeleteUser(null);
    setConfirmText('');
    showToast('User removed successfully');
  };

  const handleSuspend = async () => {
    if (confirmText !== `suspend ${suspendUser?.name}`) return;
    const res = await fetch(`/api/users/${suspendUser?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ residentType: 'SUSPENDED', isActive: 'false' }),
    });
    if (res.ok) {
      setUsers(
        users.map(u =>
          u.id === suspendUser?.id ? { ...u, residentType: 'SUSPENDED', isActive: false } : u
        )
      );
      showToast('User suspended successfully');
    }
    setSuspendUser(null);
    setConfirmText('');
  };

  const handleActivate = async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isActive: 'true',
      }),
    });
    if (res.ok) {
      setUsers(
        users.map(u =>
          u.id === user.id
            ? {
                ...u,
                isActive: true,
              }
            : u
        )
      );
      showToast('User activated successfully');
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <nav className="text-sm">
            <ol className="flex items-center space-x-2">
              <li>
                <a href="/admin" className="text-indigo-600 hover:text-indigo-800">
                  Admin
                </a>
              </li>
              <li>
                <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
              </li>
              <li className="text-gray-900 font-medium">User Management</li>
            </ol>
          </nav>
        </div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">User Management</h1>
          <button
            onClick={() => setShowInvite(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <i className="fas fa-user-plus mr-2"></i>Invite User
          </button>
        </div>

        {pendingInvites.length > 0 && (
          <div className="mb-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvites.map(inv => (
                <div
                  key={inv.id}
                  className="flex justify-between items-center bg-white p-4 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{inv.name}</p>
                    <p className="text-sm text-gray-500">
                      {inv.email} • {inv.street}
                      {inv.unit && `, ${inv.unit}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <i className="fas fa-times mr-1"></i>Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-600"
          />
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="all">All Roles</option>
            {roleOptions.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="all">All Types</option>
            {residentTypeOptions.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Email', 'Address', 'Type', 'Role', 'Status', ''].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{u.name}</td>
                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {u.standardSeats?.[0]?.household?.street || u.soloSeat
                        ? 'Assigned'
                        : 'Not assigned'}
                      {(u.standardSeats?.[0]?.household?.unit || u.soloSeat?.seatType) &&
                        ` (${u.standardSeats?.[0]?.household?.unit || u.soloSeat?.seatType})`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {u.standardSeats?.[0]?.isPrimaryOwner
                          ? 'Owner'
                          : u.soloSeat
                            ? 'Board'
                            : 'No identity'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'RESIDENT'}
                        onChange={e => updateUser(u.id, { role: e.target.value })}
                        className="text-sm border rounded px-2 py-1"
                      >
                        {roleOptions.map(r => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={
                          u.isActive === true ? () => setSuspendUser(u) : () => handleActivate(u)
                        }
                        className={`px-2 py-1 rounded text-sm ${u.isActive === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {u.isActive === true ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Invite New Resident</h2>
                <button onClick={() => setShowInvite(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Street</label>
                    <input
                      type="text"
                      value={inviteForm.street}
                      onChange={e => setInviteForm({ ...inviteForm, street: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <input
                      type="text"
                      value={inviteForm.unit}
                      onChange={e => setInviteForm({ ...inviteForm, unit: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Resident Type</label>
                    <select
                      value={inviteForm.residentType}
                      onChange={e => setInviteForm({ ...inviteForm, residentType: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="RENTER">Renter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {roleOptions.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-red-600">Remove User</h2>
                <button
                  onClick={() => {
                    setDeleteUser(null);
                    setConfirmText('');
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <p className="mb-4">
                Are you sure you want to remove <strong>{deleteUser.name}</strong>? This action
                cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Type <code className="bg-gray-100 px-1">remove {deleteUser.name}</code> to confirm
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={`remove ${deleteUser.name}`}
                className="w-full border rounded-lg px-3 py-2 mb-4"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setDeleteUser(null);
                    setConfirmText('');
                  }}
                  className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== `remove ${deleteUser.name}`}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>
        )}

        {suspendUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-red-600">Suspend User</h2>
                <button
                  onClick={() => {
                    setSuspendUser(null);
                    setConfirmText('');
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <p className="mb-4">
                Are you sure you want to suspend <strong>{suspendUser.name}</strong>? They will lose
                access to the platform.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Type <code className="bg-gray-100 px-1">suspend {suspendUser.name}</code> to confirm
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={`suspend ${suspendUser.name}`}
                className="w-full border rounded-lg px-3 py-2 mb-4"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSuspendUser(null);
                    setConfirmText('');
                  }}
                  className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={confirmText !== `suspend ${suspendUser.name}`}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suspend User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
