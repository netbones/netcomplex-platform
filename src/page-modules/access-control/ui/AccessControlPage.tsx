'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Car, Footprints, Pencil, QrCode, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary, usePageLoading } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { apiDelete, apiGet, apiPost, ApiClientError } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import type {
  AccessCodePublic,
  AccessRequestListItem,
  CreateVisitorInput,
  VisitorListItem,
} from '@entities/access-control';
import { formatVisitorStatus, VISITOR_STATUS_STYLES } from '@entities/access-control';
import { AddVisitorForm } from './AddVisitorForm';
import { QuickAccessCodeForm } from './QuickAccessCodeForm';
import { ShareAccessCode } from './ShareAccessCode';
import { LiveAccessRequestCard } from './LiveAccessRequestCard';

const log = createComponentLogger('AccessControlPage');

type Tab = 'visitors' | 'inbox' | 'history';

interface ShareState {
  visitor: VisitorListItem;
  accessCode: AccessCodePublic;
}

export function AccessControlPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'visitors';
  const deepRequestId = searchParams.get('request');

  const [tab, setTab] = useState<Tab>(
    initialTab === 'inbox' || initialTab === 'history' ? initialTab : 'visitors'
  );
  const [visitors, setVisitors] = useState<VisitorListItem[]>([]);
  const [pending, setPending] = useState<AccessRequestListItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [historyVisitors, setHistoryVisitors] = useState<VisitorListItem[]>([]);
  const [historyRequests, setHistoryRequests] = useState<
    Array<{
      id: string;
      visitorName: string;
      status: string;
      requestedAt: string;
      vehicleReg: string | null;
      roleLabel: string | null;
    }>
  >([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [share, setShare] = useState<ShareState | null>(null);
  const [activeRequest, setActiveRequest] = useState<AccessRequestListItem | null>(null);
  const [respondBusy, setRespondBusy] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Access control', href: '/access-control' },
    ],
    { additionalLoading: loading }
  );

  const loadVisitors = useCallback(async (q?: string) => {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const { data } = await apiGet<{ visitors: VisitorListItem[] }>(
      `/api/access-control/visitors${qs}`
    );
    setVisitors(data.visitors ?? []);
  }, []);

  const loadInbox = useCallback(async () => {
    const { data } = await apiGet<{ pending: AccessRequestListItem[]; pendingCount: number }>(
      '/api/access-control/inbox'
    );
    setPending(data.pending ?? []);
    setPendingCount(data.pendingCount ?? 0);
    return data.pending ?? [];
  }, []);

  const loadHistory = useCallback(async () => {
    const { data } = await apiGet<{
      visitors: VisitorListItem[];
      accessRequests: typeof historyRequests;
    }>('/api/access-control/history');
    setHistoryVisitors(data.visitors ?? []);
    setHistoryRequests(data.accessRequests ?? []);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const inbox = await loadInbox();
      await loadVisitors();
      if (deepRequestId) {
        const match = inbox.find(r => r.id === deepRequestId);
        if (match) {
          setActiveRequest(match);
          setTab('inbox');
        } else {
          try {
            const { data } = await apiGet<{ request: AccessRequestListItem }>(
              `/api/access-control/inbox/${deepRequestId}`
            );
            setActiveRequest(data.request);
            setTab('inbox');
          } catch {
            // ignore missing deep link
          }
        }
      }
    } catch (error) {
      log.error({}, 'Failed to load access control', error);
      toast.error('Could not load access control');
    } finally {
      setLoading(false);
    }
  }, [deepRequestId, loadInbox, loadVisitors]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (tab === 'history') void loadHistory();
    if (tab === 'inbox') void loadInbox();
  }, [tab, loadHistory, loadInbox]);

  useEffect(() => {
    if (tab !== 'inbox') return;
    const id = window.setInterval(() => void loadInbox(), 10000);
    return () => window.clearInterval(id);
  }, [tab, loadInbox]);

  const filteredVisitors = useMemo(() => visitors, [visitors]);

  const createVisitor = async (input: CreateVisitorInput) => {
    try {
      const { data } = await apiPost<{ visitor: VisitorListItem; accessCode: AccessCodePublic }>(
        '/api/access-control/visitors',
        input
      );
      setShare({ visitor: data.visitor, accessCode: data.accessCode });
      await loadVisitors(query);
      toast.success('Visitor created');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Failed to create visitor';
      throw new Error(message);
    }
  };

  const createQuick = async (input: { fullName: string; phone?: string | null }) => {
    try {
      const { data } = await apiPost<{ visitor: VisitorListItem; accessCode: AccessCodePublic }>(
        '/api/access-control/quick-code',
        input
      );
      setShare({ visitor: data.visitor, accessCode: data.accessCode });
      await loadVisitors(query);
      toast.success('Quick code created');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Failed to create code';
      throw new Error(message);
    }
  };

  const respond = async (action: 'allow' | 'deny') => {
    if (!activeRequest) return;
    setRespondBusy(true);
    try {
      await apiPost(`/api/access-control/inbox/${activeRequest.id}`, { action });
      setResolvedLabel(action === 'allow' ? 'Access allowed' : 'Access denied');
      toast.success(action === 'allow' ? 'Visitor allowed' : 'Visitor denied');
      await loadInbox();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Action failed';
      toast.error(message);
    } finally {
      setRespondBusy(false);
    }
  };

  const deleteShared = async () => {
    if (!share) return;
    try {
      await apiDelete(`/api/access-control/visitors/${share.visitor.id}`);
      toast.success('Visit cancelled');
      setShare(null);
      await loadVisitors(query);
    } catch {
      toast.error('Could not cancel visit');
    }
  };

  if (!isReady) return LoadingComponent;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'visitors', label: 'Visitors' },
    { key: 'inbox', label: 'Access inbox', badge: pendingCount },
    { key: 'history', label: 'History' },
  ];

  return (
    <ErrorBoundary>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Access control', href: '/access-control' },
          ]}
        />

        <div className="flex items-center gap-2.5 mt-4 mb-5">
          <DomainIconBadge id="access-control" size="md" />
          <h1 className="text-xl font-semibold m-0">Access control</h1>
        </div>

        <div className="flex gap-5 border-b border-gray-200 mb-5">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setActiveRequest(null);
                setResolvedLabel(null);
              }}
              className={`pb-2 text-sm flex items-center gap-1.5 border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600 font-medium'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="bg-red-600 text-white text-[11px] min-w-[16px] h-4 rounded-full inline-flex items-center justify-center px-1">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'visitors' ? (
          <>
            <div className="flex gap-2.5 mb-3.5">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex-1 bg-indigo-600 text-white rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> Add new visitor
              </button>
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                className="flex-1 border border-gray-300 rounded-md py-2.5 text-sm flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-4 h-4" /> Quick access code
              </button>
            </div>

            <input
              type="search"
              placeholder="Search visitors"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-sm"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void loadVisitors(query);
              }}
              onBlur={() => void loadVisitors(query)}
            />

            <p className="text-sm text-gray-500 m-0 mb-2.5">Upcoming and active</p>
            <div className="flex flex-col gap-2.5">
              {filteredVisitors.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No active visitors</p>
              ) : (
                filteredVisitors.map(v => (
                  <div
                    key={v.id}
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-3 flex items-center gap-3"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        v.visitorType === 'VEHICLE' ? 'bg-indigo-50' : 'bg-green-50'
                      }`}
                    >
                      {v.visitorType === 'VEHICLE' ? (
                        <Car className="w-4.5 h-4.5 text-indigo-600" />
                      ) : (
                        <Footprints className="w-4.5 h-4.5 text-green-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{v.fullName}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {[
                          v.phone,
                          v.vehicleReg,
                          v.visitorType === 'VEHICLE' ? 'Vehicle' : 'Walk-in visitor',
                          v.validUntil
                            ? `expires ${new Date(v.validUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${VISITOR_STATUS_STYLES[v.status]}`}
                    >
                      {formatVisitorStatus(v.status)}
                    </span>
                    {v.accessCode ? (
                      <button
                        type="button"
                        aria-label="Share visitor code"
                        className="p-1.5 border border-gray-200 rounded-md"
                        onClick={() => setShare({ visitor: v, accessCode: v.accessCode! })}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}

        {tab === 'inbox' ? (
          <div>
            {activeRequest ? (
              <LiveAccessRequestCard
                request={activeRequest}
                onAllow={() => void respond('allow')}
                onDeny={() => void respond('deny')}
                busy={respondBusy}
                resolvedLabel={resolvedLabel}
              />
            ) : pending.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No pending access requests</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {pending.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setActiveRequest(r);
                      setResolvedLabel(null);
                    }}
                    className="text-left bg-white border border-gray-200 rounded-xl px-3.5 py-3"
                  >
                    <div className="font-medium text-sm">{r.visitorName}</div>
                    <div className="text-sm text-gray-500">
                      {[r.roleLabel, r.vehicleReg, r.gateName].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'history' ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Past visitors</p>
              {historyVisitors.length === 0 ? (
                <p className="text-sm text-gray-400">No visitor history</p>
              ) : (
                historyVisitors.map(v => (
                  <div
                    key={v.id}
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-3 mb-2 flex justify-between gap-2"
                  >
                    <div>
                      <div className="font-medium text-sm">{v.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(v.validFrom).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border h-fit ${VISITOR_STATUS_STYLES[v.status]}`}
                    >
                      {formatVisitorStatus(v.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Past gate requests</p>
              {historyRequests.length === 0 ? (
                <p className="text-sm text-gray-400">No request history</p>
              ) : (
                historyRequests.map(r => (
                  <div
                    key={r.id}
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-3 mb-2"
                  >
                    <div className="font-medium text-sm">{r.visitorName}</div>
                    <div className="text-sm text-gray-500">
                      {r.status} · {new Date(r.requestedAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <AddVisitorForm open={addOpen} onClose={() => setAddOpen(false)} onSubmit={createVisitor} />
        <QuickAccessCodeForm
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          onSubmit={createQuick}
        />
        {share ? (
          <ShareAccessCode
            visitor={share.visitor}
            accessCode={share.accessCode}
            propertyLabel="your property"
            onClose={() => setShare(null)}
            onDelete={deleteShared}
          />
        ) : null}
      </main>
    </ErrorBoundary>
  );
}
