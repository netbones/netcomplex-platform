'use client';

import { X, Save, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminUser } from '@entities/user/model/types';
import { resolveSeatInfo } from './lib/resolve-user-helpers';

interface UserEditRowProps {
  user: AdminUser;
  editingForm: Record<string, string | string[] | boolean>;
  onFieldChange: (field: string, value: string | boolean | string[]) => void;
  onSave: () => void;
  saving: boolean;
  onAllocateSeat: (user: AdminUser, seatType: 'solo' | 'premium', platformAddress: string) => void;
  onRemoveSeat: (user: AdminUser, seatAddress: string | null) => void;
}

export function UserEditRow({
  user,
  editingForm,
  onFieldChange,
  onSave,
  saving,
  onAllocateSeat,
  onRemoveSeat,
}: UserEditRowProps) {
  const { t } = useTranslation('admin');
  const si = resolveSeatInfo(user);

  const makeDefaultAddress = (u: AdminUser) =>
    `${u.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`;

  return (
    <tr key={`${user.id}-edit`}>
      <td colSpan={8} className="px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('name')}</label>
            <input
              type="text"
              value={String(editingForm.name ?? '')}
              onChange={e => onFieldChange('name', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('email')}</label>
            <input
              type="email"
              value={String(editingForm.email ?? '')}
              onChange={e => onFieldChange('email', e.target.value)}
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
              onChange={e => onFieldChange('phone', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Profile Slug</label>
            <input
              type="text"
              value={String(editingForm.profileSlug ?? '')}
              onChange={e => onFieldChange('profileSlug', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('interests') ?? 'Interests'}
            </label>
            <input
              type="text"
              value={Array.isArray(editingForm.interests) ? editingForm.interests.join(', ') : ''}
              onChange={e =>
                onFieldChange(
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
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('seat')}</label>
            <div className="flex items-center gap-3">
              {!si.label ? (
                <span className="text-sm text-gray-400">Household</span>
              ) : (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${si.labelClass}`}
                >
                  {si.label}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Platform Address</label>
            <input
              type="text"
              value={String(editingForm.platformAddress ?? '')}
              onChange={e => onFieldChange('platformAddress', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="e.g. unit183@soralia.org"
            />
          </div>
        </div>
        {user.soloSeats?.length > 1 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-600 mb-1">
              Additional Vanity Addresses ({user.soloSeats.length - 1})
            </p>
            <ul className="space-y-1">
              {user.soloSeats.slice(1).map((s, i) => (
                <li key={i} className="text-xs text-gray-500 font-mono flex items-center gap-2">
                  <span>{s.platformAddress}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRemoveSeat(user, s.platformAddress);
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
          {(user.soloSeats?.length ?? 0) < 5 && (
            <button
              onClick={e => {
                e.stopPropagation();
                onAllocateSeat(user, 'solo', makeDefaultAddress(user));
              }}
              className="px-3 py-1 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
              type="button"
            >
              Allocate Solo Seat
            </button>
          )}
          {(user.standardSeats?.length ?? 0) > 0 && !user.premiumSeat && (
            <button
              onClick={e => {
                e.stopPropagation();
                onAllocateSeat(user, 'premium', makeDefaultAddress(user));
              }}
              className="px-3 py-1 text-xs border border-purple-300 text-purple-700 rounded hover:bg-purple-50"
              type="button"
            >
              Allocate Premium Seat
            </button>
          )}
          {(user.soloSeats?.length || user.premiumSeat) && (
            <button
              onClick={e => {
                e.stopPropagation();
                const seatAddr = user.soloSeats?.[0]?.platformAddress || null;
                onRemoveSeat(user, seatAddr);
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
              onChange={e => onFieldChange('isPublic', e.target.checked)}
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
              onChange={e => onFieldChange('showEmail', e.target.checked)}
              className="rounded border-gray-300"
            />
            Show Email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(editingForm.showPhone)}
              onChange={e => onFieldChange('showPhone', e.target.checked)}
              className="rounded border-gray-300"
            />
            Show Phone
          </label>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            type="button"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : (t('save') ?? 'Save')}
          </button>
        </div>
      </td>
    </tr>
  );
}
