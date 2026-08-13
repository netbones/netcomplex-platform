'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateVisitorInput, VisitorType, VisitType } from '@entities/access-control';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateVisitorInput) => Promise<void>;
}

export function AddVisitorForm({ open, onClose, onSubmit }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [visitorType, setVisitorType] = useState<VisitorType>('WALK_IN');
  const [vehicleReg, setVehicleReg] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('SINGLE');
  const [validFrom, setValidFrom] = useState(() => toLocalInputValue(new Date()));
  const [validUntil, setValidUntil] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 4 * 60 * 60 * 1000))
  );
  const [recurrenceRule, setRecurrenceRule] = useState('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        fullName,
        phone: phone || null,
        visitorType,
        vehicleReg: visitorType === 'VEHICLE' ? vehicleReg : null,
        roleLabel: roleLabel || null,
        visitType,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: visitType === 'SINGLE' ? new Date(validUntil).toISOString() : null,
        recurrenceRule: visitType === 'RECURRING' ? recurrenceRule : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create visitor');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold m-0">Add new visitor</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <label className="block text-sm">
            <span className="text-gray-600">Visitor type</span>
            <select
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              value={visitorType}
              onChange={e => setVisitorType(e.target.value as VisitorType)}
            >
              <option value="WALK_IN">Walk-in</option>
              <option value="VEHICLE">Vehicle</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Full name</span>
            <input
              required
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">
              Phone {visitorType === 'VEHICLE' ? '(required)' : '(optional)'}
            </span>
            <input
              required={visitorType === 'VEHICLE'}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </label>
          {visitorType === 'VEHICLE' ? (
            <label className="block text-sm">
              <span className="text-gray-600">Vehicle registration</span>
              <input
                required
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                value={vehicleReg}
                onChange={e => setVehicleReg(e.target.value)}
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="text-gray-600">Role label (optional)</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Uber driver, Plumber…"
              value={roleLabel}
              onChange={e => setRoleLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Visit period</span>
            <select
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              value={visitType}
              onChange={e => setVisitType(e.target.value as VisitType)}
            >
              <option value="SINGLE">Single visit</option>
              <option value="RECURRING">Recurring</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Valid from</span>
            <input
              type="datetime-local"
              required
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              value={validFrom}
              onChange={e => setValidFrom(e.target.value)}
            />
          </label>
          {visitType === 'SINGLE' ? (
            <label className="block text-sm">
              <span className="text-gray-600">Valid until</span>
              <input
                type="datetime-local"
                required
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
              />
            </label>
          ) : (
            <label className="block text-sm">
              <span className="text-gray-600">Recurrence rule</span>
              <input
                required
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                value={recurrenceRule}
                onChange={e => setRecurrenceRule(e.target.value)}
              />
            </label>
          )}
          {error ? <p className="text-sm text-red-600 m-0">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-indigo-600 text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create visitor'}
          </button>
        </form>
      </div>
    </div>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
