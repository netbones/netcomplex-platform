'use client';

import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@shared/ui';
import type { AdminUser } from '@entities/user/model/types';
import { UserRow } from './UserRow';
import { UserEditRow } from './UserEditRow';

interface UserTableProps {
  filteredUsers: AdminUser[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  expandedUserId: string | null;
  editingForm: Record<string, string | string[] | boolean>;
  saving: string | null;
  onPageChange: (page: number) => void;
  onToggleRow: (user: AdminUser) => void;
  onFieldChange: (field: string, value: string | boolean | string[]) => void;
  onSaveUser: (user: AdminUser) => void;
  onRoleChange: (id: string, data: Record<string, string>) => void;
  onStatusToggle: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onAllocateSeat: (user: AdminUser, seatType: 'solo' | 'premium', platformAddress: string) => void;
  onRemoveSeat: (user: AdminUser, seatAddress: string | null) => void;
}

export function UserTable({
  filteredUsers,
  loading,
  total,
  page,
  totalPages,
  expandedUserId,
  editingForm,
  saving,
  onPageChange,
  onToggleRow,
  onFieldChange,
  onSaveUser,
  onRoleChange,
  onStatusToggle,
  onDelete,
  onAllocateSeat,
  onRemoveSeat,
}: UserTableProps) {
  const { t } = useTranslation('admin');

  if (loading) {
    return <p className="text-center py-8 text-gray-500">{t('loading')}</p>;
  }

  return (
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
              filteredUsers.map((u, idx) => (
                <Fragment key={u.id}>
                  <UserRow
                    index={idx}
                    user={u}
                    onToggle={() => onToggleRow(u)}
                    onRoleChange={onRoleChange}
                    onStatusToggle={onStatusToggle}
                    onDelete={onDelete}
                    onAllocateSeat={onAllocateSeat}
                    onRemoveSeat={onRemoveSeat}
                  />
                  {expandedUserId === u.id && (
                    <UserEditRow
                      user={u}
                      editingForm={editingForm}
                      onFieldChange={onFieldChange}
                      onSave={() => onSaveUser(u)}
                      saving={saving === u.id}
                      onAllocateSeat={onAllocateSeat}
                      onRemoveSeat={onRemoveSeat}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          {total > 0
            ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}`
            : '0 users'}
        </p>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </>
  );
}
