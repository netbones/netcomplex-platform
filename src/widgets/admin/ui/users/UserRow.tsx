'use client';

import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminUser } from '@entities/user';
import { roleOptions } from '@entities/user';
import { resolveSeatInfo, resolveAddress, resolveType } from './helpers/resolve-user-helpers';
import Image from 'next/image';

interface UserRowProps {
  index: number;
  user: AdminUser;
  onToggle: () => void;
  onRoleChange: (id: string, data: Record<string, string>) => void;
  onStatusToggle: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export function UserRow({
  index,
  user,
  onToggle,
  onRoleChange,
  onStatusToggle,
  onDelete,
}: UserRowProps) {
  const { t } = useTranslation('admin');
  const si = resolveSeatInfo(user);

  return (
    <tr
      className={`hover:bg-gray-100 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
      onClick={onToggle}
    >
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          {user.image ? (
            <Image
              src={user.image}
              alt=""
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span>{user.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{resolveAddress(user) || '-'}</td>
      <td className="px-4 py-3 text-sm">
        {!si.label && !si.address ? (
          <span className="text-gray-400">&mdash;</span>
        ) : (
          <div className="flex items-center gap-1 flex-wrap">
            {si.label && (
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${si.labelClass}`}
              >
                {si.label}
              </span>
            )}
            {si.address && <span className="text-gray-500 text-xs">{si.address}</span>}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm">{resolveType(user) || '-'}</td>
      <td className="px-4 py-3">
        <select
          value={user.role || 'RESIDENT'}
          onChange={e => onRoleChange(user.id, { role: e.target.value })}
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
        {user.isActive === true ? (
          <button
            onClick={e => {
              e.stopPropagation();
              onStatusToggle(user);
            }}
            className="px-2 py-1 rounded text-sm bg-green-100 text-green-800"
            type="button"
          >
            {t('active')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-sm bg-red-100 text-red-800">
              {t('suspended')}
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                onStatusToggle(user);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline"
              type="button"
            >
              {t('unsuspend')}
            </button>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete(user);
          }}
          className="text-red-600 hover:text-red-800"
          type="button"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
