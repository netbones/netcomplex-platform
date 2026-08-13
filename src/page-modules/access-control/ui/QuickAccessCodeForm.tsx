'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { fullName: string; phone?: string | null }) => Promise<void>;
}

export function QuickAccessCodeForm({ open, onClose, onSubmit }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ fullName, phone: phone || null });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold m-0">Quick access code</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-sm text-gray-500 m-0">
            One-off code, valid for 2 hours. Name and optional phone only.
          </p>
          <label className="block text-sm">
            <span className="text-gray-600">Name</span>
            <input
              required
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Phone (optional)</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-600 m-0">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-indigo-600 text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Generate code'}
          </button>
        </form>
      </div>
    </div>
  );
}
