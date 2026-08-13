'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookUser } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { apiGet, apiPatch } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('AdminSecurityDashboard');

type Tab = 'live' | 'resolved' | 'tips';

interface DashboardData {
  stats: {
    activeNow: number;
    today: number;
    avgResponseMinutes: number | null;
    monthTotal: number;
  };
  live: LiveRow[];
  resolved: Array<{
    id: string;
    alertType: string;
    status: string;
    createdAt: string;
    residentName: string | null;
  }>;
  tips: Array<{ id: string; message: string | null; createdAt: string; status: string }>;
}

interface LiveRow {
  id: string;
  alertType: string;
  status: string;
  createdAt: string;
  residentName: string | null;
  propertyUnit: string | null;
  propertyStreet: string | null;
  withinBoundary: boolean | null;
  latitude: string | null;
  longitude: string | null;
}

function elapsedLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function AdminSecurityDashboard() {
  const [tab, setTab] = useState<Tab>('live');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: payload } = await apiGet<DashboardData>('/api/admin/security/dashboard');
      setData(payload);
    } catch (error) {
      log.error({}, 'Dashboard load failed', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(id);
  }, [load]);

  const act = async (id: string, action: 'acknowledge' | 'responding' | 'resolve') => {
    try {
      await apiPatch(`/api/admin/security/alerts/${id}`, { action });
      toast.success('Alert updated');
      void load();
    } catch {
      toast.error('Action failed');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'live', label: 'Live stream' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'tips', label: 'Anonymous tips' },
  ];

  return (
    <ErrorBoundary>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Security' }]} />

        <div className="flex items-center justify-between mt-6 mb-5">
          <div className="flex items-center gap-2.5">
            <DomainIconBadge id="security" variant="admin" size="md" />
            <h1 className="text-xl font-semibold m-0">Security</h1>
          </div>
          <Link
            href="/admin/security/contacts"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <BookUser className="w-4 h-4" />
            Manage contacts
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Active now" value={data?.stats.activeNow ?? '—'} danger />
          <Stat label="Today" value={data?.stats.today ?? '—'} />
          <Stat
            label="Avg response"
            value={
              data?.stats.avgResponseMinutes != null ? `${data.stats.avgResponseMinutes}m` : '—'
            }
          />
          <Stat label="This month" value={data?.stats.monthTotal ?? '—'} />
        </div>

        <div className="flex gap-5 border-b border-gray-200 mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              className={`pb-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500'
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : tab === 'live' ? (
          <div className="space-y-2.5">
            {(data?.live ?? []).length === 0 && (
              <p className="text-sm text-gray-500">No active alerts.</p>
            )}
            {(data?.live ?? []).map(row => (
              <div
                key={row.id}
                className={`rounded-xl p-4 border ${
                  row.status === 'SENT'
                    ? 'border-red-300 border-2 bg-red-50/40'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {row.alertType === 'ANONYMOUS_TIP'
                      ? 'Anonymous tip-off'
                      : `Panic alert · ${row.residentName ?? 'Resident'}`}
                  </span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-gray-100">
                    {row.status} · {elapsedLabel(row.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {row.propertyUnit && row.propertyStreet
                    ? `Unit ${row.propertyUnit}, ${row.propertyStreet}`
                    : 'Location unavailable'}
                  {row.withinBoundary === true && ' · within boundary'}
                  {row.withinBoundary === false && ' · outside boundary'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {row.status === 'SENT' && (
                    <ActionBtn onClick={() => void act(row.id, 'acknowledge')}>
                      Acknowledge
                    </ActionBtn>
                  )}
                  {row.status === 'ACKNOWLEDGED' && (
                    <ActionBtn onClick={() => void act(row.id, 'responding')}>
                      Mark responding
                    </ActionBtn>
                  )}
                  {['SENT', 'ACKNOWLEDGED', 'RESPONDING'].includes(row.status) && (
                    <ActionBtn primary onClick={() => void act(row.id, 'resolve')}>
                      Mark resolved
                    </ActionBtn>
                  )}
                  {row.latitude && row.longitude ? (
                    <a
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-md"
                      href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on map
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500 px-1 py-1.5">No GPS for map</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'resolved' ? (
          <div className="space-y-2">
            {(data?.resolved ?? []).map(r => (
              <div key={r.id} className="text-sm border border-gray-200 rounded-lg p-3">
                {r.alertType} · {r.residentName ?? 'Anonymous'} · resolved ·{' '}
                {elapsedLabel(r.createdAt)}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.tips ?? []).map(t => (
              <div key={t.id} className="border border-gray-200 rounded-lg p-3 opacity-80">
                <div className="text-sm font-medium">
                  Anonymous tip-off · {elapsedLabel(t.createdAt)}
                </div>
                <p className="text-sm text-gray-600 mt-1">{t.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-medium mt-1 ${danger ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-md ${
        primary ? 'bg-indigo-600 text-white' : 'border border-gray-300 bg-white'
      }`}
    >
      {children}
    </button>
  );
}
