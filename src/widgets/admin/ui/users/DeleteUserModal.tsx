'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ModalOverlay } from '@shared/ui';
import type { AdminUser } from '@entities/user/model/types';

interface DeleteUserModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteUserModal({ user, onClose, onConfirm }: DeleteUserModalProps) {
  const { t } = useTranslation('admin');
  const [confirmText, setConfirmText] = useState('');

  if (!user) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-red-600">{t('removeUser')}</h2>
        <button onClick={onClose} type="button">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="mb-4">
        {t('removeConfirm')} <strong>{user.name}</strong>? {t('cannotUndo')}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        {t('typeToConfirm')} <strong>{user.name}</strong>:
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        placeholder={user.name}
        className="w-full border rounded-lg px-3 py-2 mb-4"
      />
      <div className="flex gap-4">
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
          {t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={confirmText !== user.name}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('removeUser')}
        </button>
      </div>
    </ModalOverlay>
  );
}
