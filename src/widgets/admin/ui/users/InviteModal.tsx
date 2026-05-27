'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ModalOverlay } from '@shared/ui';
import { roleOptions } from '@entities/user/model/types';
import type { InviteFormData } from '@entities/user/model/types';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (form: InviteFormData) => void;
}

const defaultForm: InviteFormData = {
  email: '',
  name: '',
  street: '',
  unit: '',
  residentType: 'OWNER',
  role: 'RESIDENT',
};

export function InviteModal({ open, onClose, onInvite }: InviteModalProps) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<InviteFormData>({ ...defaultForm });

  useEffect(() => {
    if (open) setForm({ ...defaultForm });
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(form);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{t('inviteNewResident')}</h2>
        <button onClick={onClose} type="button">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('name')}</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('email')}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('street')}</label>
            <input
              type="text"
              value={form.street}
              onChange={e => setForm({ ...form, street: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('unit')}</label>
            <input
              type="text"
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('residentType')}</label>
            <select
              value={form.residentType}
              onChange={e => setForm({ ...form, residentType: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="OWNER">Owner</option>
              <option value="RENTER">Renter</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('role')}</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              {roleOptions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
          >
            {t('sendInvitation')}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
