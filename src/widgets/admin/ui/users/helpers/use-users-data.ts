'use client';

import { useState, useEffect, useMemo } from 'react';
import type { AdminUser, Invitation } from '@entities/user';
import { PAGE_SIZE } from '@entities/user';
import { useAdminUsers } from '@shared/lib/hooks';
import { resolveType } from './resolve-user-helpers';
import { apiGet } from '@/shared/api/http-client';

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
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);

  const { data: rawData, isLoading } = useAdminUsers<AdminUser>();

  const allUsers: AdminUser[] = useMemo(() => {
    if (!rawData) return [];
    return rawData.users ?? [];
  }, [rawData]);

  const searchedUsers = useMemo(() => {
    if (!search) return allUsers;
    const s = search.toLowerCase();
    return allUsers.filter(
      u =>
        (u.name && String(u.name).toLowerCase().includes(s)) ||
        (u.email && String(u.email).toLowerCase().includes(s))
    );
  }, [allUsers, search]);

  const roleFiltered = useMemo(() => {
    if (filterRole === 'all') return searchedUsers;
    return searchedUsers.filter(u => u.role === filterRole);
  }, [searchedUsers, filterRole]);

  const typeFiltered = useMemo(() => {
    if (filterType === 'all') return roleFiltered;
    return roleFiltered.filter(u => {
      const type = resolveType(u);
      if (filterType === 'OWNER') return type === 'Owner';
      if (filterType === 'RENTER') return type === 'Renter';
      if (filterType === 'SUSPENDED') return type === 'Suspended';
      return true;
    });
  }, [roleFiltered, filterType]);

  const total = typeFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return typeFiltered.slice(start, start + PAGE_SIZE);
  }, [typeFiltered, page]);

  useEffect(() => {
    setUsers(paginated);
  }, [paginated]);

  useEffect(() => {
    if (!isOpen) return;
    apiGet<Invitation[]>('/api/invitations')
      .then(({ data }) => {
        setInvitations(data ?? []);
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    setPage(1);
  }, [search, filterRole]);

  const pendingInvites = useMemo(
    () => invitations.filter(i => i.status === 'PENDING'),
    [invitations]
  );

  const filteredUsers = users;

  return {
    users,
    setUsers,
    invitations,
    setInvitations,
    loading: isLoading,
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
