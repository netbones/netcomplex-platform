'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { apiGet } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import type { ResidentPanicAlert, SecurityAlertStatus } from '@entities/security';

const log = createComponentLogger('SecurityHistory');

const STATUS_LABEL: Record<SecurityAlertStatus, string> = {
  SENT: 'Sent',
  ACKNOWLEDGED: 'Acknowledged',
  RESPONDING: 'Responding',
  RESOLVED: 'Resolved',
  FAILED: 'Failed',
};

export function SecurityHistory() {
  const [alerts, setAlerts] = useState<ResidentPanicAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await apiGet<{ alerts: ResidentPanicAlert[] }>('/api/security/alerts');
      setAlerts(data.alerts ?? []);
    } catch (error) {
      log.error({}, 'Failed to load alert history', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ErrorBoundary>
      <main className="max-w-md mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Security', href: '/security' },
            { label: 'Alert history' },
          ]}
        />
        <h1 className="text-xl font-semibold mt-6 mb-2">Your alert history</h1>
        <p className="text-sm text-gray-600 mb-4">
          Personal panic alerts you have triggered. Anonymous tips are not listed.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-500">No alerts yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {alerts.map(alert => (
              <li
                key={alert.id}
                className="bg-white border border-gray-200 rounded-xl p-3.5 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {STATUS_LABEL[alert.status] ?? alert.status}
                  </span>
                  <time className="text-xs text-gray-500">
                    {new Date(alert.createdAt).toLocaleString()}
                  </time>
                </div>
                {alert.status === 'FAILED' && (
                  <p className="text-xs text-red-700 mt-1.5">
                    Dispatch did not go through. Use Call security or Call 10111 if you still need
                    help.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/security"
          className="inline-block mt-6 text-sm text-indigo-600 hover:underline"
        >
          &larr; Back to Security
        </Link>
      </main>
    </ErrorBoundary>
  );
}
