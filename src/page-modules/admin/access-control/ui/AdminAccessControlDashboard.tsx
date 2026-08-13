'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MoreVertical, Pause, Play, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { apiGet, apiPost } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import type { AccessEventListItem } from '@entities/access-control';
import {
  ACCESS_EVENT_STATE_STYLES,
  formatActorLabel,
  formatEventMethod,
} from '@entities/access-control';

const log = createComponentLogger('AdminAccessControlDashboard');

interface EventsResponse {
  events: AccessEventListItem[];
  lastHourCount: number;
}

export function AdminAccessControlDashboard() {
  const [events, setEvents] = useState<AccessEventListItem[]>([]);
  const [lastHourCount, setLastHourCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useState('');
  const [state, setState] = useState('ANY');
  const [method, setMethod] = useState('ANY');
  const [range, setRange] = useState('today');
  const [manualOpen, setManualOpen] = useState(false);
  const [detail, setDetail] = useState<AccessEventListItem | null>(null);
  const pausedBuffer = useRef<AccessEventListItem[]>([]);
  const knownIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (state !== 'ANY') params.set('state', state);
      if (method !== 'ANY') params.set('method', method);
      params.set('range', range);
      const { data } = await apiGet<EventsResponse>(
        `/api/admin/access-control/events?${params.toString()}`
      );
      setLastHourCount(data.lastHourCount ?? 0);

      if (paused) {
        const incoming = (data.events ?? []).filter(e => !knownIds.current.has(e.id));
        if (incoming.length) {
          pausedBuffer.current = [...incoming, ...pausedBuffer.current];
        }
        return;
      }

      const list = data.events ?? [];
      knownIds.current = new Set(list.map(e => e.id));
      setEvents(list);
    } catch (error) {
      log.error({}, 'Failed to load access events', error);
    } finally {
      setLoading(false);
    }
  }, [q, state, method, range, paused]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const resume = () => {
    if (pausedBuffer.current.length) {
      setEvents(prev => {
        const merged = [...pausedBuffer.current, ...prev];
        const seen = new Set<string>();
        return merged.filter(e => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
      });
      for (const e of pausedBuffer.current) knownIds.current.add(e.id);
      pausedBuffer.current = [];
    }
    setPaused(false);
  };

  const submitManual = async (payload: {
    visitorLabel: string;
    vehicleReg?: string;
    state: 'GRANTED' | 'DENIED' | 'PENDING';
  }) => {
    try {
      await apiPost('/api/admin/access-control/events', payload);
      toast.success('Manual entry logged');
      setManualOpen(false);
      setPaused(false);
      void load();
    } catch {
      toast.error('Failed to log entry');
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Access control' }]} />

        <div className="flex items-center justify-between mt-6 mb-2 flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5">
            <DomainIconBadge id="access-control" variant="admin" size="md" />
            <h1 className="text-xl font-semibold m-0">Access control</h1>
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Live
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (paused ? resume() : setPaused(true))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md inline-flex items-center gap-1.5"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {paused ? 'Resume stream' : 'Pause stream'}
            </button>
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Manual entry
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 m-0 mb-5">
          {paused
            ? `Stream paused · ${pausedBuffer.current.length} buffered`
            : `Streaming new events · ${lastHourCount} in the last hour`}
        </p>

        <div className="flex gap-2.5 mb-4 flex-wrap">
          <input
            type="search"
            placeholder="Search visitor or property"
            className="flex-[2] min-w-[200px] border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select
            className="flex-1 min-w-[140px] border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={state}
            onChange={e => setState(e.target.value)}
          >
            <option value="ANY">State: any</option>
            <option value="GRANTED">Granted</option>
            <option value="DENIED">Denied</option>
            <option value="PENDING">Pending</option>
          </select>
          <select
            className="flex-1 min-w-[140px] border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            <option value="ANY">Method: any</option>
            <option value="QR">QR</option>
            <option value="CODE">Code</option>
            <option value="ANPR">ANPR</option>
            <option value="MANUAL">Manual</option>
            <option value="INTERCOM">Intercom</option>
            <option value="AUTO_LIST">Auto-list</option>
          </select>
          <select
            className="flex-1 min-w-[140px] border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={range}
            onChange={e => setRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-1.5 text-gray-500 font-medium">Time</th>
                  <th className="text-left py-2 px-1.5 text-gray-500 font-medium">Visitor</th>
                  <th className="text-left py-2 px-1.5 text-gray-500 font-medium">Property</th>
                  <th className="text-left py-2 px-1.5 text-gray-500 font-medium">State</th>
                  <th className="text-left py-2 px-1.5 text-gray-500 font-medium">By</th>
                  <th className="text-left py-2 px-1.5 text-gray-500 font-medium">Method</th>
                  <th className="py-2 px-1.5" />
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="py-2.5 px-1.5 text-gray-500 whitespace-nowrap">
                      {new Date(e.occurredAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-1.5 font-medium">{e.visitorLabel}</td>
                    <td className="py-2.5 px-1.5 text-gray-500">{e.propertyLabel ?? '—'}</td>
                    <td className="py-2.5 px-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${ACCESS_EVENT_STATE_STYLES[e.state]}`}
                      >
                        {e.state.charAt(0) + e.state.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-1.5 text-gray-500">
                      {formatActorLabel(e.actorType, e.actorName)}
                    </td>
                    <td className="py-2.5 px-1.5 text-gray-500">{formatEventMethod(e.method)}</td>
                    <td className="py-2.5 px-1.5 text-right">
                      <button
                        type="button"
                        aria-label="View detail"
                        onClick={() => setDetail(e)}
                        className="p-1 text-gray-400"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No access events</p>
            ) : null}
          </div>
        )}

        {manualOpen ? (
          <ManualEntryModal onClose={() => setManualOpen(false)} onSubmit={submitManual} />
        ) : null}

        {detail ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5">
              <h2 className="text-base font-semibold m-0 mb-3">Event detail</h2>
              <dl className="text-sm space-y-2">
                <div>
                  <dt className="text-gray-500">Visitor</dt>
                  <dd className="m-0 font-medium">{detail.visitorLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Property</dt>
                  <dd className="m-0">{detail.propertyLabel ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Gate</dt>
                  <dd className="m-0">{detail.gateName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">State / Method</dt>
                  <dd className="m-0">
                    {detail.state} · {formatEventMethod(detail.method)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">By</dt>
                  <dd className="m-0">{formatActorLabel(detail.actorType, detail.actorName)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">When</dt>
                  <dd className="m-0">{new Date(detail.occurredAt).toLocaleString()}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="mt-4 w-full border border-gray-300 rounded-md py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}

function ManualEntryModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    visitorLabel: string;
    vehicleReg?: string;
    state: 'GRANTED' | 'DENIED' | 'PENDING';
  }) => Promise<void>;
}) {
  const [visitorLabel, setVisitorLabel] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [state, setState] = useState<'GRANTED' | 'DENIED' | 'PENDING'>('GRANTED');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="bg-white rounded-xl max-w-md w-full p-5 space-y-3"
        onSubmit={e => {
          e.preventDefault();
          setBusy(true);
          void onSubmit({
            visitorLabel,
            vehicleReg: vehicleReg || undefined,
            state,
          }).finally(() => setBusy(false));
        }}
      >
        <h2 className="text-base font-semibold m-0">Manual entry</h2>
        <p className="text-sm text-gray-500 m-0">
          Log an access decision that happened outside the app. Does not open a gate.
        </p>
        <label className="block text-sm">
          <span className="text-gray-600">Visitor label</span>
          <input
            required
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
            value={visitorLabel}
            onChange={e => setVisitorLabel(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Vehicle reg (optional)</span>
          <input
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
            value={vehicleReg}
            onChange={e => setVehicleReg(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">State</span>
          <select
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
            value={state}
            onChange={e => setState(e.target.value as typeof state)}
          >
            <option value="GRANTED">Granted</option>
            <option value="DENIED">Denied</option>
            <option value="PENDING">Pending</option>
          </select>
        </label>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-indigo-600 text-white rounded-md py-2 text-sm disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Log entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
