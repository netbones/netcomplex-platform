'use client';

import { X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminUser } from '@entities/user/model/types';
import { roleOptions } from '@entities/user/model/types';
import { resolveSeatInfo, resolveAddress, resolveType } from './lib/resolve-user-helpers';

interface UserRowProps {
  user: AdminUser;
  onToggle: () => void;
  onRoleChange: (id: string, data: Record<string, string>) => void;
  onStatusToggle: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onAllocateSeat: (user: AdminUser, seatType: 'solo' | 'premium', platformAddress: string) => void;
  onRemoveSeat: (user: AdminUser, seatAddress: string | null) => void;
}

export function UserRow({
  user,
  onToggle,
  onRoleChange,
  onStatusToggle,
  onDelete,
  onAllocateSeat,
  onRemoveSeat,
}: UserRowProps) {
  const { t } = useTranslation('admin');
  const si = resolveSeatInfo(user);

  const makeDefaultAddress = (u: AdminUser) =>
    `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`;

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
      <td className="px-4 py-3 text-sm">{user.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{resolveAddress(user) || '-'}</td>
      <td className="px-4 py-3 text-sm">
        {!si.label && !si.address ? (
          <div className="flex items-center gap-1">
            <span className="text-gray-400">&mdash;</span>
            <div className="flex items-center gap-1">
              {(user.soloSeats?.length ?? 0) < 5 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onAllocateSeat(user, 'solo', makeDefaultAddress(user));
                  }}
                  className="px-1.5 py-0.5 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                  type="button"
                >
                  +Solo
                </button>
              )}
              {(user.standardSeats?.length ?? 0) > 0 && !user.premiumSeat && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onAllocateSeat(user, 'premium', makeDefaultAddress(user));
                  }}
                  className="px-1.5 py-0.5 text-xs border border-purple-300 text-purple-700 rounded hover:bg-purple-50"
                  type="button"
                >
                  +Premium
                </button>
              )}
            </div>
          </div>
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
            <div className="flex items-center gap-1">
              {(user.soloSeats?.length ?? 0) < 5 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onAllocateSeat(user, 'solo', makeDefaultAddress(user));
                  }}
                  className="px-1.5 py-0.5 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                  type="button"
                >
                  +Solo
                </button>
              )}
              {(user.standardSeats?.length ?? 0) > 0 && !user.premiumSeat && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onAllocateSeat(user, 'premium', makeDefaultAddress(user));
                  }}
                  className="px-1.5 py-0.5 text-xs border border-purple-300 text-purple-700 rounded hover:bg-purple-50"
                  type="button"
                >
                  +Premium
                </button>
              )}
              {(user.soloSeats?.length || user.premiumSeat) && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const seatAddr = user.soloSeats?.[0]?.platformAddress || null;
                    onRemoveSeat(user, seatAddr);
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
