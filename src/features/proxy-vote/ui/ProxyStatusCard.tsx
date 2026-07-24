'use client';

import { CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

import type { MeetingProxyDTO } from '@/features/proxy-vote/model/proxy-vote.dto';
import type { ProxyStatus } from '@/features/proxy-vote/lib/status-transitions';
import { STATUS_META } from '@/features/proxy-vote/lib/constants';
import { ProxyQRCode } from './ProxyQRCode';

interface ProxyStatusCardProps {
  proxy: MeetingProxyDTO;
  onWithdraw?: () => void;
}

const TERMINAL_STATUSES: ProxyStatus[] = ['Approved', 'Rejected'];

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export function ProxyStatusCard({ proxy, onWithdraw }: ProxyStatusCardProps) {
  const status = proxy.status as ProxyStatus;
  const meta = STATUS_META[status];
  const showWithdraw =
    status === 'Draft' || status === 'WaitingForUpload' || status === 'WaitingForProxy';
  const showQR = !!proxy.referenceCode && status === 'Approved';

  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <article className="space-y-5 rounded-lg bg-white p-5 shadow-sm">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">Proxy appointment</h3>
        <p className="text-base text-gray-600">
          Proxy nominee: {proxy.proxyName ?? (proxy.proxyEmail || proxy.proxyPhone) ?? 'Pending'}
        </p>
      </header>

      <ul className="space-y-2">
        <li className="inline-flex items-center gap-2">
          <CheckCircle2
            className={proxy.ownerSignedAt ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-gray-400'}
            aria-hidden
          />
          <span className="text-sm text-gray-700">✓ Owner signed</span>
          {proxy.ownerSignedAt && (
            <span className="text-xs text-gray-500">{formatDate(proxy.ownerSignedAt)}</span>
          )}
        </li>
        <li className="inline-flex items-center gap-2">
          <CheckCircle2
            className={proxy.proxySignedAt ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-gray-400'}
            aria-hidden
          />
          <span className="text-sm text-gray-700">✓ Proxy signed</span>
          {proxy.proxySignedAt && (
            <span className="text-xs text-gray-500">{formatDate(proxy.proxySignedAt)}</span>
          )}
        </li>
        <li className="inline-flex items-center gap-2">
          <CheckCircle2
            className={proxy.formDocumentId ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-gray-400'}
            aria-hidden
          />
          <span className="text-sm text-gray-700">✓ Form uploaded</span>
        </li>
      </ul>

      <div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClasses(meta.color)}`}
        >
          {meta.label}
        </span>
        <p className="mt-2 text-sm text-gray-600">{meta.description}</p>
        {status === 'PendingHoaReview' && (
          <p className="mt-2 text-sm text-gray-500">Submitted to HOA. Pending verification.</p>
        )}
      </div>

      {showQR && proxy.referenceCode && (
        <section>
          <h4 className="mb-2 text-sm font-medium text-gray-700">QR reference</h4>
          <ProxyQRCode referenceCode={proxy.referenceCode} />
        </section>
      )}

      {showWithdraw && (
        <div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-600 px-4 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Withdraw Proxy
          </button>
          {showConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
            >
              <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-6 shadow-xl">
                <header className="flex items-start justify-between gap-2">
                  <h5 className="text-base font-semibold text-gray-900">Withdraw Proxy</h5>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="rounded p-1 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </header>
                <p className="text-sm text-gray-600">
                  Withdraw this proxy appointment? This action cannot be undone.
                </p>
                <footer className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirm(false);
                      onWithdraw?.();
                    }}
                    className="min-h-[44px] rounded-lg bg-red-600 px-4 text-sm font-medium text-white"
                  >
                    Withdraw
                  </button>
                </footer>
              </div>
            </div>
          )}
        </div>
      )}

      {TERMINAL_STATUSES.includes(status) && (
        <p className="text-xs text-gray-500">
          Terminal state — no further changes possible from this card.
        </p>
      )}
    </article>
  );
}
