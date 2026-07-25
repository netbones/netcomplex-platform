'use client';

import { useState } from 'react';
import { CheckCircle2, Copy, X } from 'lucide-react';

import { STATUS_META } from '@/features/proxy-vote/lib/constants';
import type { MeetingProxyDTO } from '@/features/proxy-vote/model/proxy-vote.dto';
import type { ProxyStatus } from '@/features/proxy-vote/lib/status-transitions';

interface HoaProxyRow {
  id: string;
  meetingTitle: string;
  ownerName: string;
  proxyName: string;
  status: ProxyStatus;
  ownerSignedAt: string | null;
  proxySignedAt: string | null;
  formDocumentId: string | null;
  referenceCode: string | null;
}

interface HoaProxyWidgetProps {
  rows: HoaProxyRow[];
  onApprove: (proxyId: string) => Promise<void>;
  onReject: (proxyId: string, notes: string) => Promise<void>;
}

function badgeClasses(color: string): string {
  switch (color) {
    case 'green':
      return 'bg-emerald-100 text-emerald-800';
    case 'amber':
      return 'bg-amber-100 text-amber-800';
    case 'red':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HoaProxyWidget({ rows, onApprove, onReject }: HoaProxyWidgetProps) {
  const [showRejectId, setShowRejectId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  async function handleApprove(row: HoaProxyRow) {
    await onApprove(row.id);
  }

  async function handleRejectSubmit(row: HoaProxyRow) {
    if (!notes.trim()) return;
    await onReject(row.id, notes.trim());
    setShowRejectId(null);
    setNotes('');
  }

  return (
    <section className="space-y-4">
      <header>
        <h3 className="text-lg font-semibold text-gray-900">Proxy Votes</h3>
        <p className="text-sm text-gray-500">Proxy appointments awaiting HOA review.</p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No proxy has been submitted for this meeting yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map(row => {
            const meta = STATUS_META[row.status];
            const signClass = (set: boolean) => (set ? 'text-emerald-600' : 'text-gray-400');
            return (
              <li key={row.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <header className="space-y-1">
                  <p className="text-base font-semibold text-gray-900">{row.ownerName}</p>
                  <p className="text-sm text-gray-600">Proxy: {row.proxyName || '—'}</p>
                  <p className="text-xs text-gray-500">{row.meetingTitle}</p>
                </header>

                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  <li className="inline-flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 ${signClass(!!row.ownerSignedAt)}`}
                      aria-hidden
                    />
                    Owner signed
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 ${signClass(!!row.proxySignedAt)}`}
                      aria-hidden
                    />
                    Proxy signed
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 ${signClass(!!row.formDocumentId)}`}
                      aria-hidden
                    />
                    Form uploaded
                  </li>
                </ul>

                <div className="mt-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClasses(meta.color)}`}
                  >
                    {meta.label}
                  </span>
                </div>

                {row.status === 'Approved' && row.referenceCode && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-soralia-primary/5 px-3 py-2 text-sm text-gray-900">
                    <span className="font-mono">{row.referenceCode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(row.referenceCode!);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <Copy className="h-3 w-3" aria-hidden />
                      Copy
                    </button>
                  </div>
                )}

                {row.status === 'PendingHoaReview' && (
                  <footer className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleApprove(row)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-soralia-primary px-4 text-sm font-medium text-white"
                    >
                      Approve Proxy
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectId(row.id)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-600 px-4 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Reject Proxy Appointment
                    </button>
                  </footer>
                )}

                {row.ownerSignedAt && (
                  <p className="mt-2 text-xs text-gray-400">
                    Signed {formatDate(row.ownerSignedAt)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showRejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-6 shadow-xl">
            <header className="flex items-start justify-between gap-2">
              <h5 className="text-base font-semibold text-gray-900">Reject Proxy Appointment</h5>
              <button
                type="button"
                onClick={() => setShowRejectId(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>
            <label className="block text-sm text-gray-700" htmlFor="reject-notes">
              Notes (required)
            </label>
            <textarea
              id="reject-notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              className="min-h-[88px] w-full rounded border border-gray-300 p-2 text-sm"
              required
            />
            <footer className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectId(null)}
                className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!notes.trim()}
                onClick={() => {
                  const row = rows.find(r => r.id === showRejectId);
                  if (row) void handleRejectSubmit(row);
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-40"
              >
                Reject
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

void meetingProxyForRow;

function meetingProxyForRow(_row: MeetingProxyDTO) {
  void _row;
}
