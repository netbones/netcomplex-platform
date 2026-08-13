'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertCircle, User } from 'lucide-react';
import type { AccessRequestListItem } from '@entities/access-control';

interface Props {
  request: AccessRequestListItem;
  estateName?: string;
  onAllow: () => void;
  onDeny: () => void;
  busy?: boolean;
  resolvedLabel?: string | null;
}

function formatCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LiveAccessRequestCard({
  request,
  estateName = 'Estate',
  onAllow,
  onDeny,
  busy,
  resolvedLabel,
}: Props) {
  const [countdown, setCountdown] = useState(() => formatCountdown(request.expiresAt));

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(formatCountdown(request.expiresAt));
    }, 250);
    return () => window.clearInterval(id);
  }, [request.expiresAt]);

  const subtitle = [request.roleLabel, request.vehicleReg].filter(Boolean).join(' · ');

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-4 text-center border-b border-gray-200">
          <p className="text-sm text-gray-500 m-0">Visitor requesting access at</p>
          <p className="text-base font-medium m-0 mt-0.5">
            {estateName} — {request.gateName}
          </p>
        </div>

        <div className="px-5 py-5 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-3 overflow-hidden">
            {request.visitorPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={request.visitorPhotoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-9 h-9 text-indigo-600" aria-hidden />
            )}
          </div>
          <p className="font-medium text-base m-0">{request.visitorName}</p>
          {subtitle ? <p className="text-sm text-gray-500 m-0 mt-0.5">{subtitle}</p> : null}

          {request.status === 'PENDING' && !resolvedLabel ? (
            <div className="flex items-center gap-1.5 mt-4 text-amber-700">
              <Clock className="w-4 h-4" aria-hidden />
              <span className="text-sm font-medium">Expires in {countdown}</span>
            </div>
          ) : null}
        </div>

        {resolvedLabel ? (
          <div className="bg-gray-50 px-3 py-2.5 text-center text-sm font-medium text-gray-700">
            {resolvedLabel}
          </div>
        ) : (
          <>
            <div className="bg-amber-50 px-3 py-2.5 text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700" aria-hidden />
              <span className="text-sm font-medium text-amber-700">Action required</span>
            </div>
            <div className="flex gap-2.5 p-4">
              <button
                type="button"
                disabled={busy}
                onClick={onDeny}
                className="flex-1 bg-red-600 text-white border-none rounded-md py-2.5 text-sm font-medium disabled:opacity-60"
              >
                Deny
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onAllow}
                className="flex-1 bg-green-600 text-white border-none rounded-md py-2.5 text-sm font-medium disabled:opacity-60"
              >
                Allow
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
