'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ModalOverlay } from '@shared/ui';
import type { AdminUser, AllocateSeatFormData } from '@entities/user/model/types';

interface AllocateSeatModalProps {
  user: AdminUser | null;
  seatType: 'solo' | 'premium';
  onClose: () => void;
  onConfirm: (form: AllocateSeatFormData) => void;
}

const defaultAllocForm: AllocateSeatFormData = {
  platformAddress: '',
  soloSeatType: 'RESIDENT',
  portfolioName: '',
};

export function AllocateSeatModal({ user, seatType, onClose, onConfirm }: AllocateSeatModalProps) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<AllocateSeatFormData>({ ...defaultAllocForm });

  if (!user) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          Allocate {seatType === 'solo' ? 'Solo' : 'Premium'} Seat
        </h2>
        <button onClick={onClose} type="button">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        User: <strong>{user.name}</strong>
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Platform Address</label>
          <input
            type="text"
            value={form.platformAddress}
            onChange={e => setForm(f => ({ ...f, platformAddress: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="e.g. unit183@soralia.org"
          />
        </div>
        {seatType === 'solo' && (
          <div>
            <label className="block text-sm font-medium mb-1">Seat Type</label>
            <select
              value={form.soloSeatType}
              onChange={e => setForm(f => ({ ...f, soloSeatType: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="RESIDENT">Resident</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>
        )}
        {seatType === 'premium' && (
          <div>
            <label className="block text-sm font-medium mb-1">Portfolio Name (optional)</label>
            <input
              type="text"
              value={form.portfolioName}
              onChange={e => setForm(f => ({ ...f, portfolioName: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
      <div className="flex gap-4 mt-6">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
          type="button"
        >
          {t('cancel')}
        </button>
        <button
          onClick={() => onConfirm(form)}
          disabled={!form.platformAddress}
          className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          Confirm
        </button>
      </div>
    </ModalOverlay>
  );
}
