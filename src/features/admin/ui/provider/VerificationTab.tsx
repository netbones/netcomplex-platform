'use client';

import { formatDate, ddStepColor } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';
import type { DdItemState } from './useProviderDetail';

export function VerificationTab({
  data,
  ddItems,
  vrNotes,
  ddSaving,
  onDdItemsChange,
  onVrNotesChange,
  onSave,
}: {
  data: ProviderDetailResponse;
  ddItems: DdItemState[];
  vrNotes: string;
  ddSaving: boolean;
  onDdItemsChange: (items: DdItemState[]) => void;
  onVrNotesChange: (notes: string) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Due diligence</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tick each item as approved and add notes for audit trail.
        </p>
        <div className="mt-4 space-y-4">
          {ddItems.map(item => {
            const current = data.dueDiligence.items.find(i => i.key === item.key);
            if (!current) return null;
            const c = ddStepColor(item.key);
            return (
              <div key={item.key} className={`rounded-xl border-l-4 bg-gray-50 p-4 ${c.border}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.status === 'APPROVED'}
                    onChange={event =>
                      onDdItemsChange(
                        ddItems.map(i =>
                          i.key === item.key
                            ? { ...i, status: event.target.checked ? 'APPROVED' : 'PENDING' }
                            : i
                        )
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{current.label}</div>
                    <div className="mt-1 text-sm text-gray-600">{current.description}</div>
                    <textarea
                      value={item.notes ?? ''}
                      onChange={event =>
                        onDdItemsChange(
                          ddItems.map(i =>
                            i.key === item.key ? { ...i, notes: event.target.value } : i
                          )
                        )
                      }
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      placeholder="Admin notes for this item…"
                    />
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Verification record</h2>
        <textarea
          value={vrNotes}
          onChange={event => onVrNotesChange(event.target.value)}
          rows={6}
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Verification notes — visible in audit trail…"
        />
        <div className="mt-4 space-y-3">
          <div className="text-xs text-gray-500">
            Threshold: {data.verification.verificationThreshold} points
            {data.verification.startDate
              ? ` • Started ${formatDate(data.verification.startDate)}`
              : ''}
            {data.verification.endDate ? ` • Ending ${formatDate(data.verification.endDate)}` : ''}
          </div>
          {data.verificationHistory.map(item => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-medium text-gray-900">{item.status}</div>
              <div className="mt-1 text-sm text-gray-600">{item.notes ?? 'No notes'}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={ddSaving}
          onClick={onSave}
          className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {ddSaving ? 'Saving…' : 'Save due diligence'}
        </button>
      </div>
    </section>
  );
}
