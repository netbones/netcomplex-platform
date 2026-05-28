'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ModalOverlay } from '@shared/ui';
import type { AdminUser, SuspensionFormData } from '@entities/user/model/types';
import { suspensionTypes } from '@entities/user/model/types';

type DurationValue = '2days' | '1week' | '30days' | 'permanent';

const durationOptions = [
  { value: '2days' as const, label: 'duration2days', days: 2 },
  { value: '1week' as const, label: 'duration1week', days: 7 },
  { value: '30days' as const, label: 'duration30days', days: 30 },
  { value: 'permanent' as const, label: 'durationPermanent', days: null },
];

interface SuspendUserModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onConfirm: (data: SuspensionFormData) => void;
}

export function SuspendUserModal({ user, onClose, onConfirm }: SuspendUserModalProps) {
  const { t } = useTranslation('admin');
  const [suspensionType, setSuspensionType] = useState('VIOLATION');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<DurationValue>('1week');
  const [confirmName, setConfirmName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const reasonError =
    reason.trim().length > 0 && reason.trim().length < 3 ? t('reasonRequired') : null;
  const confirmError =
    confirmName.length > 0 && confirmName !== user.name ? t('confirmNameRequired') : null;
  const canSubmit = reason.trim().length >= 3 && confirmName === user.name && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const selected = durationOptions.find(d => d.value === duration);
    const endDate = selected?.days
      ? new Date(Date.now() + selected.days * 86400000).toISOString()
      : undefined;
    setSubmitting(true);
    onConfirm({
      suspensionType,
      reason: reason.trim(),
      description: description.trim() || undefined,
      duration,
      endDate,
    });
  };

  const selectedDuration = durationOptions.find(d => d.value === duration);
  const endDatePreview = selectedDuration?.days
    ? new Date(Date.now() + selectedDuration.days * 86400000).toLocaleDateString()
    : null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-red-600">{t('suspendUser')}</h2>
        <button onClick={onClose} type="button">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="font-medium text-sm">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('suspensionType')}</label>
        <select
          value={suspensionType}
          onChange={e => setSuspensionType(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          {suspensionTypes.map(st => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          {t('suspensionReason')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g., Repeated code of conduct violations"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex justify-between mt-1">
          {reasonError && <p className="text-xs text-red-500">{reasonError}</p>}
          <p className="text-xs text-gray-400 ml-auto">{reason.length} chars</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('suspensionDescription')}</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Additional details about this suspension..."
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('suspensionDuration')}</label>
        <div className="flex gap-2">
          {durationOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDuration(opt.value)}
              type="button"
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                duration === opt.value
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {endDatePreview ? `${t('endsOn')}: ${endDatePreview}` : t('noAutoEnd')}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('typeNameToConfirm')}</label>
        <input
          type="text"
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          placeholder={user.name}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {confirmError && <p className="text-xs text-red-500 mt-1">{confirmError}</p>}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onClose}
          disabled={submitting}
          className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
          type="button"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          type="button"
        >
          {submitting ? t('loading') : t('suspendUser')}
        </button>
      </div>
    </ModalOverlay>
  );
}
