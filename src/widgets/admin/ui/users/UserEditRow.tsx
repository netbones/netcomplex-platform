'use client';

import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminUser } from '@entities/user';

interface UserEditRowProps {
  user: AdminUser;
  editingForm: Record<string, string | string[] | boolean>;
  onFieldChange: (field: string, value: string | boolean | string[]) => void;
  onSave: () => void;
  saving: boolean;
}

export function UserEditRow({
  user,
  editingForm,
  onFieldChange,
  onSave,
  saving,
}: UserEditRowProps) {
  const { t } = useTranslation('admin');

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
        <p className="mt-4 text-xs text-gray-500">
          Seat allocation and privacy settings are managed in Plan &amp; Seats and the
          resident&apos;s own profile.
        </p>
        <div className="flex justify-end mt-3">
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
