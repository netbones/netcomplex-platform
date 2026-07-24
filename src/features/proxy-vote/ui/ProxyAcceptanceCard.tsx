'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import type { MeetingProxyDTO } from '@/features/proxy-vote/model/proxy-vote.dto';

interface ProxyAcceptanceCardProps {
  proxy: MeetingProxyDTO;
  meetingTitle: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function ProxyAcceptanceCard({
  proxy,
  meetingTitle,
  onAccept,
  onDecline,
}: ProxyAcceptanceCardProps) {
  const [showDecline, setShowDecline] = useState(false);

  return (
    <article className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
      <header className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900">Proxy appointment request</h3>
        <p className="text-base text-gray-700">
          You have been nominated as a proxy for{' '}
          <span className="font-medium">{proxy.proxyName ?? 'a resident'}</span> —{' '}
          <span className="font-medium">{meetingTitle}</span>
        </p>
      </header>

      {proxy.formDocumentId && (
        <a
          href={proxy.proxyUserId ? `/api/proxy-forms/${proxy.formDocumentId}` : undefined}
          rel="noopener"
          target="_blank"
          className="inline-flex min-h-[44px] items-center text-sm text-gray-600 underline hover:text-soralia-primary"
        >
          View Form
        </a>
      )}

      <footer className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-soralia-primary px-6 text-sm font-medium text-white"
        >
          Accept Proxy Appointment
        </button>
        <button
          type="button"
          onClick={() => setShowDecline(true)}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-red-600 px-6 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Decline Proxy Appointment
        </button>
      </footer>

      {showDecline && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-6 shadow-xl">
            <header className="flex items-start justify-between gap-2">
              <h5 className="text-base font-semibold text-gray-900">Decline Proxy Appointment</h5>
              <button
                type="button"
                onClick={() => setShowDecline(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>
            <p className="text-sm text-gray-600">Are you sure? This action cannot be undone.</p>
            <footer className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDecline(false)}
                className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDecline(false);
                  onDecline();
                }}
                className="min-h-[44px] rounded-lg bg-red-600 px-4 text-sm font-medium text-white"
              >
                Decline
              </button>
            </footer>
          </div>
        </div>
      )}
    </article>
  );
}
