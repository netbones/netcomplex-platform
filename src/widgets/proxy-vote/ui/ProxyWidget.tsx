'use client';

import Link from 'next/link';

import { STATUS_META } from '@/features/proxy-vote/lib/constants';
import type { ProxyStatus } from '@/features/proxy-vote/lib/status-transitions';

interface ProxyWidgetRow {
  id: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  status: ProxyStatus;
}

interface ProxyWidgetProps {
  rows: ProxyWidgetRow[];
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

export function ProxyWidget({ rows }: ProxyWidgetProps) {
  if (rows.length === 0) {
    return (
      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-base font-semibold text-gray-900">Proxy appointments</h3>
        <p className="text-sm text-gray-500">You have no active proxy submissions.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <header>
        <h3 className="text-base font-semibold text-gray-900">Proxy appointments</h3>
        <p className="text-sm text-gray-500">Your active proxy votes for upcoming meetings.</p>
      </header>
      <ul className="space-y-3">
        {rows.map(row => {
          const meta = STATUS_META[row.status];
          return (
            <li key={row.id} className="space-y-1 rounded border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{row.meetingTitle}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badgeClasses(meta.color)}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">{row.meetingDate}</p>
              <Link
                href={`/dashboard/proxy/${row.meetingId}`}
                className="inline-flex min-h-[44px] items-center text-sm text-soralia-primary underline"
              >
                View Proxy
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
