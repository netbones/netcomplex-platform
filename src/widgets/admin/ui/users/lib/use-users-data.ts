'use client';

import { useState, useEffect, useMemo } from 'react';
import type { AdminUser, Invitation } from '@entities/user/model/types';
import { PAGE_SIZE } from '@entities/user/model/types';
import { resolveType } from './resolve-user-helpers';

interface UseUsersDataReturn {
  users: AdminUser[];
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  invitations: Invitation[];
  setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>;
  loading: boolean;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  filterRole: string;
  setFilterRole: React.Dispatch<React.SetStateAction<string>>;
  filterType: string;
  setFilterType: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  total: number;
  totalPages: number;
  pendingInvites: Invitation[];
  filteredUsers: AdminUser[];
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useUsersData(): UseUsersDataReturn {
  const [isOpen, setIsOpen] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterRole]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  return {
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
  };
}
