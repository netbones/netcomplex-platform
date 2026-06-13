'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, UserPlus, X, Search } from 'lucide-react';
import { ErrorBoundary } from '@shared/ui';
import type {
  AdminUser,
  InviteFormData,
  AllocateSeatFormData,
  SuspensionFormData,
} from '@entities/user';
import { roleOptions } from '@entities/user';
import { resolveSeatInfo } from './helpers/resolve-user-helpers';
import { useUsersData } from './helpers/use-users-data';
import { UserTable } from './UserTable';
import { InviteModal } from './InviteModal';
import { DeleteUserModal } from './DeleteUserModal';
import { SuspendUserModal } from './SuspendUserModal';
import { AllocateSeatModal } from './AllocateSeatModal';
import { RemoveSeatModal } from './RemoveSeatModal';

export function UsersListSection() {
  const { t } = useTranslation('admin');
  const {
    users,
    setUsers,
    invitations,
    setInvitations,
    loading,
    search,
    setSearch,
    filterRole,
    setFilterRole,
    filterType,
    setFilterType,
    page,
    setPage,
    total,
    totalPages,
    pendingInvites,
    filteredUsers,
    isOpen,
    setIsOpen,
  } = useUsersData();

  const [showInvite, setShowInvite] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Record<string, string | string[] | boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [allocatingUser, setAllocatingUser] = useState<AdminUser | null>(null);
  const [allocSeatType, setAllocSeatType] = useState<'solo' | 'premium'>('solo');
  const [removingUser, setRemovingUser] = useState<AdminUser | null>(null);
  const [removingSeatAddress, setRemovingSeatAddress] = useState<string | null>(null);

  // --- Action handlers ---

  const handleInvite = async (form: InviteFormData) => {
    const r = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const body = await r.json();
      setInvitations([body?.data ?? body, ...invitations]);
      toast.success(t('inviteSent'));
    } else {
      toast.error(t('inviteFailed'));
    }
    setShowInvite(false);
  };

  const handleRevoke = async (id: string) => {
    await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
    setInvitations(invitations.filter(i => i.id !== id));
    toast.success(t('inviteRevoked'));
  };

  const updateUser = async (id: string, data: Record<string, string>) => {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setUsers(users.map(u => (u.id === id ? { ...u, ...data } : u)));
    toast.success(t('userUpdated'));
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' });
    setUsers(users.filter(u => u.id !== deleteUser.id));
    setDeleteUser(null);
    toast.success(t('userRemoved'));
  };

  const handleSuspend = async (formData: SuspensionFormData) => {
    if (!suspendUser) return;
    const durationDays = { '2days': 2, '1week': 7, '30days': 30, permanent: null } as const;
    const days = durationDays[formData.duration];
    const endDate = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const res = await fetch(`/api/users/${suspendUser.id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suspensionType: formData.suspensionType,
        reason: formData.reason,
        description: formData.description || undefined,
        endDate,
      }),
    });
    if (res.ok) {
      setUsers(users.map(u => (u.id === suspendUser.id ? { ...u, isActive: false } : u)));
      toast.success(t('userSuspended'));
    } else {
      const err = await res.json();
      toast.error(err.error || t('suspendFailed'));
    }
    setSuspendUser(null);
  };

  const handleRowClick = (u: AdminUser) => {
    if (expandedUserId === u.id) {
      setExpandedUserId(null);
      setEditingForm({});
    } else {
      const si = resolveSeatInfo(u);
      setExpandedUserId(u.id);
      setEditingForm({
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
        profileSlug: u.profileSlug ?? '',
        interests: u.interests ?? [],
        isPublic: u.isPublic ?? true,
        showEmail: u.showEmail ?? true,
        showPhone: u.showPhone ?? true,
        platformAddress: si?.address ?? '',
      });
    }
  };

  const handleFieldChange = (field: string, value: string | boolean | string[]) => {
    setEditingForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveUser = async (u: AdminUser) => {
    setSaving(u.id);
    const payload: Record<string, unknown> = {};
    if (editingForm.name !== u.name) payload.name = editingForm.name;
    if (editingForm.email !== u.email) payload.email = editingForm.email;
    if (editingForm.phone !== (u.phone ?? '')) payload.phone = editingForm.phone;
    if (editingForm.profileSlug !== (u.profileSlug ?? ''))
      payload.profileSlug = editingForm.profileSlug;
    if (editingForm.isPublic !== u.isPublic) payload.isPublic = editingForm.isPublic;
    if (editingForm.showEmail !== u.showEmail) payload.showEmail = editingForm.showEmail;
    if (editingForm.showPhone !== u.showPhone) payload.showPhone = editingForm.showPhone;
    if (JSON.stringify(editingForm.interests) !== JSON.stringify(u.interests ?? [])) {
      payload.interests = editingForm.interests;
    }
    const si = resolveSeatInfo(u);
    if (editingForm.platformAddress !== (si?.address ?? '')) {
      payload.platformAddress = editingForm.platformAddress;
    }
    if (Object.keys(payload).length === 0) {
      setSaving(null);
      toast.success(t('userUpdated'));
      return;
    }
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(
          users.map(x => {
            if (x.id !== u.id) return x;
            const merged = { ...x, ...updated };
            if (updated.updatedSeat) {
              const { type, platformAddress } = updated.updatedSeat;
              if (type === 'premium') {
                merged.premiumSeat = {
                  ...(x.premiumSeat ?? {
                    id: '',
                    platformAddress,
                    portfolioName: null,
                    tier: null,
                    isActive: null,
                  }),
                  platformAddress,
                };
              } else if (type === 'solo' && x.soloSeats?.length) {
                const seats = [...x.soloSeats];
                if (seats.length) seats[0] = { ...seats[0], platformAddress };
                merged.soloSeats = seats;
              } else if (type === 'standard' && x.standardSeats?.length) {
                const seats = [...x.standardSeats];
                if (seats.length) seats[0] = { ...seats[0], platformAddress };
                merged.standardSeats = seats;
              }
            }
            return merged;
          })
        );
        toast.success(t('userUpdated'));
      } else {
        toast.error(t('inviteFailed'));
      }
    } catch {
      toast.error(t('inviteFailed'));
    }
    setSaving(null);
  };

  const handleStatusToggle = async (user: AdminUser) => {
    if (user.isActive === true) {
      setSuspendUser(user);
    } else {
      const res = await fetch(`/api/users/${user.id}/unsuspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setUsers(users.map(u => (u.id === user.id ? { ...u, isActive: true } : u)));
        toast.success(t('userActivated'));
      } else {
        const err = await res.json();
        toast.error(err.error?.message ?? err.error ?? t('unsuspendFailed'));
      }
    }
  };

  const handleAllocateSeat = (
    user: AdminUser,
    seatType: 'solo' | 'premium',
    _platformAddress: string
  ) => {
    setAllocatingUser(user);
    setAllocSeatType(seatType);
  };

  const handleAllocateSeatConfirm = async (form: AllocateSeatFormData) => {
    const u = allocatingUser;
    if (!u) return;
    const res = await fetch('/api/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: u.id,
        seatType: allocSeatType,
        platformAddress: form.platformAddress,
        soloSeatType: allocSeatType === 'solo' ? form.soloSeatType : undefined,
        portfolioName: allocSeatType === 'premium' ? form.portfolioName || null : undefined,
      }),
    });
    if (res.ok) {
      const userRes = await fetch(`/api/users/${u.id}`);
      if (userRes.ok) {
        const updatedUser = await userRes.json();
        setUsers(users.map(x => (x.id === u.id ? { ...x, ...updatedUser } : x)));
      }
      toast.success(allocSeatType === 'solo' ? 'Solo seat allocated' : 'Premium seat allocated');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to allocate seat');
    }
    setAllocatingUser(null);
    setAllocSeatType('solo');
  };

  const handleRemoveSeat = (user: AdminUser, seatAddress: string | null) => {
    setRemovingSeatAddress(seatAddress);
    setRemovingUser(user);
  };

  const handleRemoveSeatConfirm = async () => {
    const u = removingUser;
    if (!u) return;
    const si = resolveSeatInfo(u);
    if (!si) return;
    const seatType = si.label.toLowerCase().startsWith('vanity')
      ? 'solo'
      : si.label.toLowerCase() === 'premium'
        ? 'premium'
        : null;
    if (!seatType) {
      toast.error('Cannot remove a standard seat from here');
      setRemovingUser(null);
      setRemovingSeatAddress(null);
      return;
    }
    const res = await fetch('/api/seats', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: u.id,
        seatType,
        platformAddress: seatType === 'solo' ? removingSeatAddress : undefined,
      }),
    });
    if (res.ok) {
      const userRes = await fetch(`/api/users/${u.id}`);
      if (userRes.ok) {
        const updatedUser = await userRes.json();
        setUsers(users.map(x => (x.id === u.id ? { ...x, ...updatedUser } : x)));
      }
      toast.success('Seat removed');
    } else {
      toast.error('Failed to remove seat');
    }
    setRemovingUser(null);
    setRemovingSeatAddress(null);
  };

  // --- Render ---

  return (
    <ErrorBoundary>
      <div id="users-section" className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          id="users-section-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition rounded-t-lg"
          type="button"
        >
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">{t('usersSection')}</h2>
            {!loading && (
              <span className="text-sm text-gray-500">
                ({total} {t('users').toLowerCase()})
              </span>
            )}
          </div>
        </button>

        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {pendingInvites.length > 0 && (
              <div className="my-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="text-sm font-semibold mb-3">{t('pendingInvitations')}</h3>
                <div className="space-y-2">
                  {pendingInvites.map(inv => (
                    <div
                      key={inv.id}
                      className="flex justify-between items-center bg-white p-3 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{inv.name}</p>
                        <p className="text-xs text-gray-500">
                          {inv.email} &bull; {inv.street}
                          {inv.unit && `, ${inv.unit}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 my-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">{t('allRoles')}</option>
                {roleOptions.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">{t('allTypes')}</option>
                <option value="OWNER">Owner</option>
                <option value="RENTER">Renter</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                {t('inviteUser')}
              </button>
            </div>

            <UserTable
              filteredUsers={filteredUsers}
              loading={loading}
              total={total}
              page={page}
              totalPages={totalPages}
              expandedUserId={expandedUserId}
              editingForm={editingForm}
              saving={saving}
              onPageChange={setPage}
              onToggleRow={handleRowClick}
              onFieldChange={handleFieldChange}
              onSaveUser={handleSaveUser}
              onRoleChange={updateUser}
              onStatusToggle={handleStatusToggle}
              onDelete={setDeleteUser}
              onAllocateSeat={handleAllocateSeat}
              onRemoveSeat={handleRemoveSeat}
            />
          </div>
        )}
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} onInvite={handleInvite} />
      <DeleteUserModal
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
      />
      <SuspendUserModal
        user={suspendUser}
        onClose={() => setSuspendUser(null)}
        onConfirm={handleSuspend}
      />
      <AllocateSeatModal
        user={allocatingUser}
        seatType={allocSeatType}
        onClose={() => {
          setAllocatingUser(null);
          setAllocSeatType('solo');
        }}
        onConfirm={handleAllocateSeatConfirm}
      />
      <RemoveSeatModal
        user={removingUser}
        seatAddress={removingSeatAddress}
        onClose={() => {
          setRemovingUser(null);
          setRemovingSeatAddress(null);
        }}
        onConfirm={handleRemoveSeatConfirm}
      />
    </ErrorBoundary>
  );
}
