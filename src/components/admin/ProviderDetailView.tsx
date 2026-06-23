'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchApi, formatCurrency, formatDate, sendJson, statusBadgeClass } from './adminApi';
import type { ProviderDetailResponse } from './types';

const TABS = ['profile', 'verification', 'legal', 'reputation', 'payments', 'actions'] as const;
type ProviderTab = (typeof TABS)[number];

export function ProviderDetailView({ providerId }: { providerId: string }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProviderTab>('profile');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [reputationReason, setReputationReason] = useState('');
  const [reputationDelta, setReputationDelta] = useState('0');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [ddItems, setDdItems] = useState<Array<{ key: string; status: string; notes?: string }>>(
    []
  );
  const [vrNotes, setVrNotes] = useState('');
  const [ddSaving, setDdSaving] = useState(false);

  const queryKey = useMemo(() => ['admin', 'provider-detail', providerId], [providerId]);
  const providerQuery = useQuery<ProviderDetailResponse>({
    queryKey,
    queryFn: () => fetchApi<ProviderDetailResponse>(`/api/admin/providers/${providerId}`),
    staleTime: 30_000,
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      url: string;
      method: 'POST' | 'PATCH';
      body: Record<string, unknown>;
    }) =>
      sendJson<unknown>(payload.url, {
        method: payload.method,
        body: JSON.stringify(payload.body),
      }),
    onSuccess: async () => {
      setActionMessage('Provider moderation change saved.');
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
    },
  });

  const data = providerQuery.data;

  // Initialise due diligence items from loaded data
  if (data && ddItems.length === 0 && data.dueDiligence.items.length > 0) {
    setDdItems(
      data.dueDiligence.items.map(i => ({ key: i.key, status: i.status, notes: i.notes ?? '' }))
    );
    setVrNotes(data.verification.notes ?? '');
  }

  if (providerQuery.isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl p-6 text-sm text-gray-500">Loading provider detail…</div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-slate-300">Provider moderation detail</div>
            <h1 className="mt-2 text-3xl font-semibold">{data.provider.companyName}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-200">
              Review legal acceptance, due diligence, reputation, payments, and apply admin
              overrides with audit-backed APIs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(data.provider.verificationStatus)}`}
            >
              {data.provider.verificationStatus.toLowerCase()}
            </span>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {data.reputation?.totalScore ?? 0} points
            </span>
          </div>
        </div>
      </section>

      {actionMessage ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          {actionMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-soralia-primary text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Profile</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Contact</dt>
                <dd className="font-medium text-gray-900">{data.provider.contactName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900">{data.provider.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900">{data.provider.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Trade</dt>
                <dd className="font-medium text-gray-900">{data.provider.trade ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900">{formatDate(data.provider.createdAt)}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Activity timeline</h2>
            <div className="mt-4 space-y-3">
              {data.activityTimeline.map(item => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500">{formatDate(item.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'verification' ? (
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
                return (
                  <div key={item.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.status === 'APPROVED'}
                        onChange={event =>
                          setDdItems(prev =>
                            prev.map(i =>
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
                            setDdItems(prev =>
                              prev.map(i =>
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
              onChange={event => setVrNotes(event.target.value)}
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
                {data.verification.endDate
                  ? ` • Ending ${formatDate(data.verification.endDate)}`
                  : ''}
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
              onClick={async () => {
                setDdSaving(true);
                try {
                  await actionMutation.mutateAsync({
                    url: `/api/admin/providers/${providerId}/due-diligence`,
                    method: 'PATCH',
                    body: {
                      items: ddItems.map(i => ({
                        key: i.key,
                        status: i.status,
                        notes: i.notes,
                      })),
                      verificationNotes: vrNotes.trim() || undefined,
                    },
                  });
                } finally {
                  setDdSaving(false);
                }
              }}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {ddSaving ? 'Saving…' : 'Save due diligence'}
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === 'legal' ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Legal agreements</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {data.legalStatus.documents.map(document => (
              <div key={document.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="font-medium text-gray-900">{document.label}</div>
                <div className="mt-1 text-sm text-gray-600">Version {document.version}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Accepted {document.accepted ? formatDate(document.acceptedAt) : 'No'}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'reputation' ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Reputation snapshot</h2>
            <div className="mt-4 text-4xl font-semibold text-gray-900">
              {data.reputation?.totalScore ?? 0}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Last calculated {formatDate(data.reputation?.lastCalculatedAt ?? null)}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Reputation history</h2>
            <div className="mt-4 space-y-3">
              {data.reputationHistory.map(item => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="font-medium text-gray-900">
                    {item.meritType.replace('_', ' ')}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {item.description ?? 'No description provided'}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {item.points} points • {formatDate(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'payments' ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Revenue</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(data.revenueSummary.totalRevenue)}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Platform fees</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(data.revenueSummary.totalPlatformFees)}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Processor fees</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(data.revenueSummary.totalProcessorFees)}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Net payout</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(data.revenueSummary.totalNetPayout)}
              </div>
            </div>
          </div>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Payment profile</h2>
            <p className="mt-2 text-sm text-gray-600">{data.paymentProfile.note}</p>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-3 pr-4">Gateway</th>
                    <th className="pb-3 pr-4">Tier</th>
                    <th className="pb-3 pr-4">Gross</th>
                    <th className="pb-3 pr-4">Fees</th>
                    <th className="pb-3">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.paymentHistory.map(payment => (
                    <tr key={payment.id}>
                      <td className="py-4 pr-4 text-gray-700">{payment.gateway}</td>
                      <td className="py-4 pr-4 text-gray-700">{payment.tierName ?? '—'}</td>
                      <td className="py-4 pr-4 text-gray-700">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">
                        {formatCurrency(
                          payment.platformFee + payment.processorFee,
                          payment.currency
                        )}
                      </td>
                      <td className="py-4 font-medium text-gray-900">
                        {formatCurrency(payment.netAmount, payment.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === 'actions' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <form
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
            onSubmit={async event => {
              event.preventDefault();
              await actionMutation.mutateAsync({
                url: `/api/admin/providers/${providerId}/verify`,
                method: 'POST',
                body: { notes: verifyNotes },
              });
              setVerifyNotes('');
            }}
          >
            <h2 className="text-base font-semibold text-gray-900">Verify provider</h2>
            <textarea
              value={verifyNotes}
              onChange={event => setVerifyNotes(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Verification notes"
            />
            <button
              type="submit"
              disabled={actionMutation.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Approve & verify
            </button>
          </form>

          <form
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
            onSubmit={async event => {
              event.preventDefault();
              await actionMutation.mutateAsync({
                url: `/api/admin/providers/${providerId}/reject`,
                method: 'PATCH',
                body: { reason: rejectReason },
              });
              setRejectReason('');
            }}
          >
            <h2 className="text-base font-semibold text-gray-900">Reject application</h2>
            <textarea
              required
              value={rejectReason}
              onChange={event => setRejectReason(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reason for rejection"
            />
            <button
              type="submit"
              disabled={actionMutation.isPending}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Reject provider
            </button>
          </form>

          <form
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
            onSubmit={async event => {
              event.preventDefault();
              await actionMutation.mutateAsync({
                url: `/api/admin/providers/${providerId}/suspend`,
                method: 'PATCH',
                body: {
                  action:
                    data.provider.verificationStatus === 'SUSPENDED' ? 'REINSTATE' : 'SUSPEND',
                  reason: suspendReason,
                  restoreStatus: 'PROBATION',
                },
              });
              setSuspendReason('');
            }}
          >
            <h2 className="text-base font-semibold text-gray-900">Suspend or reinstate</h2>
            <textarea
              value={suspendReason}
              onChange={event => setSuspendReason(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Suspension or reinstatement notes"
            />
            <button
              type="submit"
              disabled={actionMutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {data.provider.verificationStatus === 'SUSPENDED'
                ? 'Reinstate provider'
                : 'Suspend provider'}
            </button>
          </form>

          <form
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
            onSubmit={async event => {
              event.preventDefault();
              await actionMutation.mutateAsync({
                url: `/api/admin/providers/${providerId}/reputation`,
                method: 'PATCH',
                body: {
                  reason: reputationReason,
                  reputationDelta: Number.parseInt(reputationDelta, 10) || 0,
                },
              });
              setReputationReason('');
              setReputationDelta('0');
            }}
          >
            <h2 className="text-base font-semibold text-gray-900">Adjust reputation</h2>
            <input
              value={reputationDelta}
              onChange={event => setReputationDelta(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              inputMode="numeric"
            />
            <textarea
              required
              value={reputationReason}
              onChange={event => setReputationReason(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reason for manual reputation adjustment"
            />
            <button
              type="submit"
              disabled={actionMutation.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Save reputation override
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
