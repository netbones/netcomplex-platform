'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ModalOverlay } from '@shared/ui';
import type { AdminUser } from '@entities/user';

interface RemoveSeatModalProps {
  user: AdminUser | null;
  seatAddress: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function RemoveSeatModal({ user, seatAddress, onClose, onConfirm }: RemoveSeatModalProps) {
  const { t } = useTranslation('admin');
  const [confirmText, setConfirmText] = useState('');

  if (!user) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-red-600">Remove Seat</h2>
        <button onClick={onClose} type="button">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="mb-4">
        Remove seat for <strong>{user.name}</strong>? This cannot be undone.
      </p>
      {seatAddress && (
        <p className="text-sm text-amber-700 mb-2">
          Vanity address: <strong>{seatAddress}</strong>
        </p>
      )}
      <p className="text-sm text-gray-600 mb-4">
        Type <strong>{user.name}</strong> to confirm:
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        placeholder={user.name}
        className="w-full border rounded-lg px-3 py-2 mb-4"
      />
      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
          type="button"
        >
          {t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={confirmText !== user.name}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          Remove
        </button>
      </div>
    </ModalOverlay>
  );
}
