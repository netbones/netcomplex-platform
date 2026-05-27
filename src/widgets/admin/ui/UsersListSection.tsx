'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@shared/ui';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  UserPlus,
  X,
  Trash2,
  Search,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';

interface PropertyInfo {
  id: string;
  street: string;
  unit: string;
  platformAddress?: string;
}

interface StandardSeat {
  property: PropertyInfo;
  isPrimaryOwner: boolean;
  platformAddress: string;
}

interface SoloSeat {
  property: PropertyInfo;
  seatType: string;
  platformAddress: string;
}

interface PremiumSeat {
  id: string;
  platformAddress: string;
  portfolioName: string | null;
  tier: string | null;
  isActive: boolean | null;
}

interface UserProfile {
  occupantType: string;
  residencyType: string;
  property: PropertyInfo;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  isPublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  profileSlug: string | null;
  interests: string[];
  isPlatformAdmin?: boolean;
  standardSeats: StandardSeat[];
  soloSeats: SoloSeat[];
  premiumSeat: PremiumSeat | null;
  profiles: UserProfile[];
}

interface SeatInfo {
  label: string;
  labelClass: string;
  address: string;
}

function resolveSeatInfo(u: User): SeatInfo {
  if (u.premiumSeat) {
    return {
      label: 'Premium',
      labelClass: 'bg-purple-100 text-purple-800',
      address: u.premiumSeat.platformAddress,
    };
  }
  if (u.soloSeats?.[0]) {
    return {
      label: `Vanity (${u.soloSeats.length})`,
      labelClass: 'bg-amber-100 text-amber-800',
      address: u.soloSeats[0].platformAddress,
    };
  }
  if (u.standardSeats?.length && u.standardSeats[0]?.platformAddress) {
    return {
      label: 'Standard',
      labelClass: 'bg-blue-100 text-blue-800',
      address: u.standardSeats[0].platformAddress,
    };
  }
  const pAddr = u.profiles?.[0]?.property?.platformAddress;
  if (pAddr) return { label: '', labelClass: '', address: pAddr };
  return { label: '', labelClass: '', address: '' };
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
const PAGE_SIZE = 20;

function resolveAddress(u: User): string {
  const seat = u.standardSeats?.[0];
  if (seat?.property?.street) {
    const p = seat.property;
    return p.unit ? `${p.street} ${p.unit}` : p.street;
  }
  if (u.soloSeats?.[0]?.property?.street) {
    const p = u.soloSeats[0].property;
    return p.unit ? `${p.street} ${p.unit}` : p.street;
  }
  const profile = u.profiles?.[0];
  if (profile?.property?.street) {
    const p = profile.property;
    return p.unit ? `${p.street} ${p.unit}` : p.street;
  }
  return '';
}

function resolveType(u: User): string {
  const profileOccupant = u.profiles?.[0]?.occupantType;
  if (profileOccupant === 'OWNER') return 'Owner';
  if (profileOccupant === 'RENTER') return 'Renter';
  if (u.standardSeats?.length && u.standardSeats[0]?.isPrimaryOwner) return 'Owner';
  if (u.standardSeats?.length) return 'Resident';
  if (u.soloSeats?.length) return 'Board';
  if (u.profiles?.length) return 'Resident';
  return '';
}

export function UsersListSection() {
  const { t } = useTranslation('admin');
  const [isOpen, setIsOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Record<string, string | string[] | boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [allocatingUser, setAllocatingUser] = useState<User | null>(null);
  const [allocSeatType, setAllocSeatType] = useState<'solo' | 'premium'>('solo');
  const [allocForm, setAllocForm] = useState({
    platformAddress: '',
    soloSeatType: 'RESIDENT',
    portfolioName: '',
  });
  const [removingUser, setRemovingUser] = useState<User | null>(null);
  const [removingSeatAddress, setRemovingSeatAddress] = useState<string | null>(null);
  const [removeConfirmText, setRemoveConfirmText] = useState('');
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (filterRole !== 'all') params.set('role', filterRole);
    Promise.all([
      fetch(`/api/users?${params}`).then(r => r.json()),
      fetch('/api/invitations').then(r => r.json()),
    ])
      .then(([usersData, invitesData]) => {
        setUsers(usersData.users || []);
        setTotal(usersData.total ?? 0);
        setInvitations(invitesData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, search, filterRole, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterRole]);

  const pendingInvites = useMemo(
    () => invitations.filter(i => i.status === 'PENDING'),
    [invitations]
  );

  const filteredUsers = useMemo(() => {
    if (filterType === 'all') return users;
    return users.filter(u => {
      const type = resolveType(u);
      if (filterType === 'OWNER') return type === 'Owner';
      if (filterType === 'RENTER') return type === 'Renter';
      if (filterType === 'SUSPENDED') return type === 'Suspended';
      return true;
    });
  }, [users, filterType]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm),
    });
    if (r.ok) {
      setInvitations([await r.json(), ...invitations]);
      toast.success(t('inviteSent'));
    } else {
      toast.error(t('inviteFailed'));
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
    if (confirmText !== deleteUser?.name) return;
    await fetch(`/api/users/${deleteUser?.id}`, { method: 'DELETE' });
    setUsers(users.filter(u => u.id !== deleteUser?.id));
    setDeleteUser(null);
    setConfirmText('');
    toast.success(t('userRemoved'));
  };

  const handleSuspend = async () => {
    if (confirmText !== suspendUser?.name) return;
    const res = await fetch(`/api/users/${suspendUser?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ residentType: 'SUSPENDED', isActive: 'false' }),
    });
    if (res.ok) {
      setUsers(
        users.map(u =>
          u.id === suspendUser?.id
            ? { ...u, residentType: 'SUSPENDED' as string, isActive: false }
            : u
        )
      );
      toast.success(t('userSuspended'));
    }
    setSuspendUser(null);
    setConfirmText('');
  };

  const handleRowClick = (u: User) => {
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

  const handleSaveUser = async (u: User) => {
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
    // Seat platform address
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

  const handleActivate = async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: 'true' }),
    });
    if (res.ok) {
      setUsers(users.map(u => (u.id === user.id ? { ...u, isActive: true } : u)));
      toast.success(t('userActivated'));
    }
  };

  const handleAllocateSeat = async () => {
    const u = allocatingUser;
    if (!u) return;
    const res = await fetch('/api/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: u.id,
        seatType: allocSeatType,
        platformAddress: allocForm.platformAddress,
        soloSeatType: allocSeatType === 'solo' ? allocForm.soloSeatType : undefined,
        portfolioName: allocSeatType === 'premium' ? allocForm.portfolioName || null : undefined,
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
    setAllocForm({ platformAddress: '', soloSeatType: 'RESIDENT', portfolioName: '' });
  };

  const handleRemoveSeat = async () => {
    const u = removingUser;
    if (!u || removeConfirmText !== u.name) return;
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
    setRemoveConfirmText('');
  };

  return (
    <ErrorBoundary>
      <div
        id="users-section"
        ref={sectionRef}
        className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200"
      >
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

            {loading ? (
              <p className="text-center py-8 text-gray-500">{t('loading')}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          t('name'),
                          t('email'),
                          t('address'),
                          t('seat'),
                          t('type'),
                          t('role'),
                          t('status'),
                          '',
                        ].map(h => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                            {t('search') === 'Search...' ? 'No users found' : t('search')}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <Fragment key={u.id}>
                            <tr
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleRowClick(u)}
                            >
                              <td className="px-4 py-3 text-sm">{u.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {resolveAddress(u) || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {(() => {
                                  const si = resolveSeatInfo(u);
                                  if (!si.label && !si.address) {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-400">&mdash;</span>
                                        <div className="flex items-center gap-1">
                                          {(u.soloSeats?.length ?? 0) < 5 && (
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setAllocatingUser(u);
                                                setAllocSeatType('solo');
                                                setAllocForm(f => ({
                                                  ...f,
                                                  platformAddress: `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`,
                                                  portfolioName: '',
                                                }));
                                              }}
                                              className="px-1.5 py-0.5 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                                              type="button"
                                            >
                                              +Solo
                                            </button>
                                          )}
                                          {(u.standardSeats?.length ?? 0) > 0 && !u.premiumSeat && (
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setAllocatingUser(u);
                                                setAllocSeatType('premium');
                                                setAllocForm(f => ({
                                                  ...f,
                                                  platformAddress: `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`,
                                                  portfolioName: '',
                                                }));
                                              }}
                                              className="px-1.5 py-0.5 text-xs border border-purple-300 text-purple-700 rounded hover:bg-purple-50"
                                              type="button"
                                            >
                                              +Premium
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {si.label && (
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${si.labelClass}`}
                                        >
                                          {si.label}
                                        </span>
                                      )}
                                      {si.address && (
                                        <span className="text-gray-500 text-xs">{si.address}</span>
                                      )}
                                      <div className="flex items-center gap-1">
                                        {(u.soloSeats?.length ?? 0) < 5 && (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              setAllocatingUser(u);
                                              setAllocSeatType('solo');
                                              setAllocForm(f => ({
                                                ...f,
                                                platformAddress: `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`,
                                                portfolioName: '',
                                              }));
                                            }}
                                            className="px-1.5 py-0.5 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                                            type="button"
                                          >
                                            +Solo
                                          </button>
                                        )}
                                        {(u.standardSeats?.length ?? 0) > 0 && !u.premiumSeat && (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              setAllocatingUser(u);
                                              setAllocSeatType('premium');
                                              setAllocForm(f => ({
                                                ...f,
                                                platformAddress: `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`,
                                                portfolioName: '',
                                              }));
                                            }}
                                            className="px-1.5 py-0.5 text-xs border border-purple-300 text-purple-700 rounded hover:bg-purple-50"
                                            type="button"
                                          >
                                            +Premium
                                          </button>
                                        )}
                                        {(u.soloSeats?.length || u.premiumSeat) && (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              const seatAddr =
                                                u.soloSeats?.[0]?.platformAddress || null;
                                              setRemovingSeatAddress(seatAddr);
                                              setRemoveConfirmText('');
                                              setRemovingUser(u);
                                            }}
                                            className="p-0.5 text-red-400 hover:text-red-600"
                                            title="Remove seat"
                                            type="button"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 text-sm">{resolveType(u) || '-'}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={u.role || 'RESIDENT'}
                                  onChange={e => updateUser(u.id, { role: e.target.value })}
                                  className="text-sm border rounded px-2 py-1"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {roleOptions.map(r => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (u.isActive === true) setSuspendUser(u);
                                    else handleActivate(u);
                                  }}
                                  className={`px-2 py-1 rounded text-sm ${u.isActive === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                  type="button"
                                >
                                  {u.isActive === true ? t('active') : t('suspended')}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDeleteUser(u);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  type="button"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                            {expandedUserId === u.id && (
                              <tr key={`${u.id}-edit`}>
                                <td colSpan={8} className="px-6 py-4 bg-gray-50">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('name')}
                                      </label>
                                      <input
                                        type="text"
                                        value={String(editingForm.name ?? '')}
                                        onChange={e => handleFieldChange('name', e.target.value)}
                                        className="w-full border rounded px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('email')}
                                      </label>
                                      <input
                                        type="email"
                                        value={String(editingForm.email ?? '')}
                                        onChange={e => handleFieldChange('email', e.target.value)}
                                        className="w-full border rounded px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('phone') ?? 'Phone'}
                                      </label>
                                      <input
                                        type="text"
                                        value={String(editingForm.phone ?? '')}
                                        onChange={e => handleFieldChange('phone', e.target.value)}
                                        className="w-full border rounded px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Profile Slug
                                      </label>
                                      <input
                                        type="text"
                                        value={String(editingForm.profileSlug ?? '')}
                                        onChange={e =>
                                          handleFieldChange('profileSlug', e.target.value)
                                        }
                                        className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('interests') ?? 'Interests'}
                                      </label>
                                      <input
                                        type="text"
                                        value={
                                          Array.isArray(editingForm.interests)
                                            ? editingForm.interests.join(', ')
                                            : ''
                                        }
                                        onChange={e =>
                                          handleFieldChange(
                                            'interests',
                                            e.target.value
                                              .split(',')
                                              .map(s => s.trim())
                                              .filter(Boolean)
                                          )
                                        }
                                        placeholder="Comma-separated"
                                        className="w-full border rounded px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                  </div>
                                  <hr className="my-4 border-gray-200" />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('seat')}
                                      </label>
                                      <div className="flex items-center gap-3">
                                        {(() => {
                                          const si = resolveSeatInfo(u);
                                          if (!si.label)
                                            return (
                                              <span className="text-sm text-gray-400">
                                                Household
                                              </span>
                                            );
                                          return (
                                            <span
                                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${si.labelClass}`}
                                            >
                                              {si.label}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Platform Address
                                      </label>
                                      <input
                                        type="text"
                                        value={String(editingForm.platformAddress ?? '')}
                                        onChange={e =>
                                          handleFieldChange('platformAddress', e.target.value)
                                        }
                                        className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                                        placeholder="e.g. unit183@soralia.org"
                                      />
                                    </div>
                                  </div>
                                  {u.soloSeats?.length > 1 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-gray-600 mb-1">
                                        Additional Vanity Addresses ({u.soloSeats.length - 1})
                                      </p>
                                      <ul className="space-y-1">
                                        {u.soloSeats.slice(1).map((s, i) => (
                                          <li
                                            key={i}
                                            className="text-xs text-gray-500 font-mono flex items-center gap-2"
                                          >
                                            <span>{s.platformAddress}</span>
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setRemovingSeatAddress(s.platformAddress);
                                                setRemoveConfirmText('');
                                                setRemovingUser(u);
                                              }}
                                              className="text-red-400 hover:text-red-600"
                                              type="button"
                                              title={`Remove ${s.platformAddress}`}
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {(u.soloSeats?.length ?? 0) < 5 && (
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          setAllocatingUser(u);
                                          setAllocSeatType('solo');
                                          setAllocForm(f => ({
                                            ...f,
                                            platformAddress: `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`,
                                            portfolioName: '',
                                          }));
                                        }}
                                        className="px-3 py-1 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                                        type="button"
                                      >
                                        Allocate Solo Seat
                                      </button>
                                    )}
                                    {(u.standardSeats?.length ?? 0) > 0 && !u.premiumSeat && (
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          setAllocatingUser(u);
                                          setAllocSeatType('premium');
                                          setAllocForm(f => ({
                                            ...f,
                                            platformAddress: `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`,
                                            portfolioName: '',
                                          }));
                                        }}
                                        className="px-3 py-1 text-xs border border-purple-300 text-purple-700 rounded hover:bg-purple-50"
                                        type="button"
                                      >
                                        Allocate Premium Seat
                                      </button>
                                    )}
                                    {(u.soloSeats?.length || u.premiumSeat) && (
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          const seatAddr =
                                            u.soloSeats?.[0]?.platformAddress || null;
                                          setRemovingSeatAddress(seatAddr);
                                          setRemoveConfirmText('');
                                          setRemovingUser(u);
                                        }}
                                        className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                                        type="button"
                                      >
                                        Remove Seat
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-4 mt-3">
                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(editingForm.isPublic)}
                                        onChange={e =>
                                          handleFieldChange('isPublic', e.target.checked)
                                        }
                                        className="rounded border-gray-300"
                                      />
                                      <span className="flex items-center gap-1">
                                        {Boolean(editingForm.isPublic) ? (
                                          <Eye className="w-3.5 h-3.5" />
                                        ) : (
                                          <EyeOff className="w-3.5 h-3.5" />
                                        )}{' '}
                                        Public Profile
                                      </span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(editingForm.showEmail)}
                                        onChange={e =>
                                          handleFieldChange('showEmail', e.target.checked)
                                        }
                                        className="rounded border-gray-300"
                                      />
                                      Show Email
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(editingForm.showPhone)}
                                        onChange={e =>
                                          handleFieldChange('showPhone', e.target.checked)
                                        }
                                        className="rounded border-gray-300"
                                      />
                                      Show Phone
                                    </label>
                                  </div>
                                  <div className="flex justify-end mt-4">
                                    <button
                                      onClick={() => handleSaveUser(u)}
                                      disabled={saving === u.id}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                      type="button"
                                    >
                                      <Save className="w-4 h-4" />
                                      {saving === u.id ? 'Saving...' : (t('save') ?? 'Save')}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {total > 0
                      ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
                      : '0 users'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      type="button"
                    >
                      &larr; Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      type="button"
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{t('inviteNewResident')}</h2>
              <button onClick={() => setShowInvite(false)} type="button">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('name')}</label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('email')}</label>
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
                  <label className="block text-sm font-medium mb-1">{t('street')}</label>
                  <input
                    type="text"
                    value={inviteForm.street}
                    onChange={e => setInviteForm({ ...inviteForm, street: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('unit')}</label>
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
                  <label className="block text-sm font-medium mb-1">{t('residentType')}</label>
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
                  <label className="block text-sm font-medium mb-1">{t('role')}</label>
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                >
                  {t('sendInvitation')}
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
              <h2 className="text-xl font-bold text-red-600">{t('removeUser')}</h2>
              <button
                onClick={() => {
                  setDeleteUser(null);
                  setConfirmText('');
                }}
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mb-4">
              {t('removeConfirm')} <strong>{deleteUser.name}</strong>? {t('cannotUndo')}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {t('typeToConfirm')} <strong>{deleteUser.name}</strong>:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={deleteUser.name}
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
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== deleteUser.name}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('removeUser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {suspendUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-red-600">{t('suspendUser')}</h2>
              <button
                onClick={() => {
                  setSuspendUser(null);
                  setConfirmText('');
                }}
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mb-4">
              {t('suspendConfirm')} <strong>{suspendUser.name}</strong>? {t('loseAccess')}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {t('typeToConfirm')} <strong>{suspendUser.name}</strong>:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={suspendUser.name}
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
                {t('cancel')}
              </button>
              <button
                onClick={handleSuspend}
                disabled={confirmText !== suspendUser.name}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('suspendUser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {allocatingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Allocate {allocSeatType === 'solo' ? 'Solo' : 'Premium'} Seat
              </h2>
              <button
                onClick={() => {
                  setAllocatingUser(null);
                  setAllocSeatType('solo');
                  setAllocForm({
                    platformAddress: '',
                    soloSeatType: 'RESIDENT',
                    portfolioName: '',
                  });
                }}
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              User: <strong>{allocatingUser.name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Platform Address</label>
                <input
                  type="text"
                  value={allocForm.platformAddress}
                  onChange={e => setAllocForm(f => ({ ...f, platformAddress: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="e.g. unit183@soralia.org"
                />
              </div>
              {allocSeatType === 'solo' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Seat Type</label>
                  <select
                    value={allocForm.soloSeatType}
                    onChange={e => setAllocForm(f => ({ ...f, soloSeatType: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="RESIDENT">Resident</option>
                    <option value="MEMBER">Member</option>
                  </select>
                </div>
              )}
              {allocSeatType === 'premium' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Portfolio Name (optional)
                  </label>
                  <input
                    type="text"
                    value={allocForm.portfolioName}
                    onChange={e => setAllocForm(f => ({ ...f, portfolioName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setAllocatingUser(null);
                  setAllocSeatType('solo');
                  setAllocForm({
                    platformAddress: '',
                    soloSeatType: 'RESIDENT',
                    portfolioName: '',
                  });
                }}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                type="button"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAllocateSeat}
                disabled={!allocForm.platformAddress}
                className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {removingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-red-600">Remove Seat</h2>
              <button
                onClick={() => {
                  setRemovingUser(null);
                  setRemoveConfirmText('');
                  setRemovingSeatAddress(null);
                  setAllocSeatType('solo');
                }}
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mb-4">
              Remove seat for <strong>{removingUser.name}</strong>? This cannot be undone.
            </p>
            {removingSeatAddress && (
              <p className="text-sm text-amber-700 mb-2">
                Vanity address: <strong>{removingSeatAddress}</strong>
              </p>
            )}
            <p className="text-sm text-gray-600 mb-4">
              Type <strong>{removingUser.name}</strong> to confirm:
            </p>
            <input
              type="text"
              value={removeConfirmText}
              onChange={e => setRemoveConfirmText(e.target.value)}
              placeholder={removingUser.name}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setRemovingUser(null);
                  setRemoveConfirmText('');
                  setRemovingSeatAddress(null);
                  setAllocSeatType('solo');
                }}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                type="button"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  handleRemoveSeat();
                  setRemovingSeatAddress(null);
                }}
                disabled={removeConfirmText !== removingUser.name}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
