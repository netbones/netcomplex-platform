'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary, LoadingCard } from '@shared/ui';
import { Wallet, CheckCircle, XCircle } from 'lucide-react';
import type { AdminStats, PayoutRequestItem, BatchRecord, StreamConfig } from '../model/types';

// ── Data fetching helpers ──────────────────────────────────────────────────

async function unwrapEnvelope<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch('/api/admin/dwallet/stats');
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return unwrapEnvelope<AdminStats>(res);
}

async function fetchPayouts(): Promise<PayoutRequestItem[]> {
  const res = await fetch('/api/admin/dwallet/payouts');
  if (!res.ok) throw new Error('Failed to fetch payouts');
  return unwrapEnvelope<PayoutRequestItem[]>(res);
}

async function fetchBatches(): Promise<BatchRecord[]> {
  const res = await fetch('/api/admin/dwallet/batches');
  if (!res.ok) throw new Error('Failed to fetch batches');
  return unwrapEnvelope<BatchRecord[]>(res);
}

async function fetchStreams(): Promise<StreamConfig[]> {
  const res = await fetch('/api/admin/dwallet/streams');
  if (!res.ok) throw new Error('Failed to fetch streams');
  return unwrapEnvelope<StreamConfig[]>(res);
}

async function patchPayoutStatus(
  payoutId: string,
  status: 'COMPLETED' | 'REJECTED',
  notes?: string
): Promise<void> {
  const res = await fetch(`/api/admin/dwallet/payouts/${payoutId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(notes ? { notes } : {}) }),
  });
  if (!res.ok) throw new Error(`Failed to ${status.toLowerCase()} payout`);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

// ── Distribution Batch Form ────────────────────────────────────────────────

interface DistributionFormProps {
  streams: StreamConfig[];
  onSubmit: (data: {
    streamKey: string;
    periodStart: string;
    periodEnd: string;
    totalRevenue: number;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function DistributionForm({ streams, onSubmit, onCancel, isSubmitting }: DistributionFormProps) {
  const [streamKey, setStreamKey] = useState(streams[0]?.key ?? '');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        streamKey,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        totalRevenue: parseFloat(totalRevenue),
      });
    },
    [streamKey, periodStart, periodEnd, totalRevenue, onSubmit]
  );

  const isValid = streamKey && periodStart && periodEnd && parseFloat(totalRevenue) > 0;

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Run Distribution</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Stream selector */}
        <div>
          <label htmlFor="batch-stream" className="block text-xs text-slate-500 mb-1">
            Revenue Stream
          </label>
          <select
            id="batch-stream"
            value={streamKey}
            onChange={e => setStreamKey(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {streams.length === 0 ? (
              <option value="">No revenue streams configured</option>
            ) : (
              streams.map(s => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Period Start */}
        <div>
          <label htmlFor="batch-start" className="block text-xs text-slate-500 mb-1">
            Period Start
          </label>
          <input
            id="batch-start"
            type="date"
            value={periodStart}
            onChange={e => setPeriodStart(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {/* Period End */}
        <div>
          <label htmlFor="batch-end" className="block text-xs text-slate-500 mb-1">
            Period End
          </label>
          <input
            id="batch-end"
            type="date"
            value={periodEnd}
            onChange={e => setPeriodEnd(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {/* Total Revenue */}
        <div>
          <label htmlFor="batch-revenue" className="block text-xs text-slate-500 mb-1">
            Total Revenue (ZAR)
          </label>
          <input
            id="batch-revenue"
            type="number"
            min="0"
            step="0.01"
            value={totalRevenue}
            onChange={e => setTotalRevenue(e.target.value)}
            placeholder="0.00"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-white transition-colors"
          >
            Go Back
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Processing...' : 'Run Distribution'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Pending Payouts Table ──────────────────────────────────────────────────

interface PayoutsTableProps {
  payouts: PayoutRequestItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isActioning: boolean;
  actioningId: string | null;
}

function PayoutsTable({
  payouts,
  onApprove,
  onReject,
  isActioning,
  actioningId: _actioningId,
}: PayoutsTableProps) {
  void _actioningId;
  if (payouts.length === 0) {
    return <AdminEmptyState message="No pending payouts" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              Resident
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              Amount
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              Date Requested
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {payouts.map(payout => (
            <tr key={payout.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 px-3 text-slate-700">
                {/* Resident name — only PII allowed for payment processing */}
                {payout.id.slice(0, 8)}
              </td>
              <td className="py-2 px-3 text-indigo-600 font-medium">
                R {Number(payout.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2 px-3 text-slate-500">
                {payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-ZA') : '—'}
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onApprove(payout.id)}
                    disabled={isActioning}
                    aria-label={`Approve payout`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(payout.id)}
                    disabled={isActioning}
                    aria-label={`Reject payout`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Batches List ───────────────────────────────────────────────────────────

interface BatchesListProps {
  batches: BatchRecord[];
}

function BatchesList({ batches }: BatchesListProps) {
  if (batches.length === 0) {
    return <AdminEmptyState message="No distribution batches" />;
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
            <CheckCircle className="w-3 h-3" /> Completed
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-1">
      {batches.map(batch => (
        <div
          key={batch.id}
          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">{batch.streamKey}</p>
            <p className="text-xs text-slate-400">
              {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('en-ZA') : '—'}
            </p>
          </div>
          <div className="ml-3">{statusBadge(batch.status)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

function DWalletAdminWidgetContent() {
  const [showDistributionForm, setShowDistributionForm] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [actioningPayoutId, setActioningPayoutId] = useState<string | null>(null);

  // Data state — admin widget uses its own fetch calls, never useWallet()
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [streams, setStreams] = useState<StreamConfig[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [s, p, b, streamsData] = await Promise.all([
          fetchAdminStats(),
          fetchPayouts(),
          fetchBatches(),
          fetchStreams(),
        ]);
        if (!cancelled) {
          setStats(s);
          setPayouts(p);
          setBatches(b);
          setStreams(streamsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load admin data');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStats(false);
          setIsLoadingPayouts(false);
          setIsLoadingBatches(false);
          setIsLoadingStreams(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Action handlers ────────────────────────────────────────────────────

  const handleRunDistribution = useCallback(
    async (data: {
      streamKey: string;
      periodStart: string;
      periodEnd: string;
      totalRevenue: number;
    }) => {
      setIsSubmittingBatch(true);
      try {
        const res = await fetch('/api/admin/dwallet/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Distribution failed');
        setShowDistributionForm(false);
        // Refresh data
        const [s, p, b] = await Promise.all([fetchAdminStats(), fetchPayouts(), fetchBatches()]);
        setStats(s);
        setPayouts(p);
        setBatches(b);
      } catch (err) {
        // Error handling — would show toast in production
        console.error('Distribution failed:', err);
      } finally {
        setIsSubmittingBatch(false);
      }
    },
    []
  );

  const handleApprovePayout = useCallback(async (payoutId: string) => {
    setActioningPayoutId(payoutId);
    try {
      await patchPayoutStatus(payoutId, 'COMPLETED');
      // Refresh
      const [s, p] = await Promise.all([fetchAdminStats(), fetchPayouts()]);
      setStats(s);
      setPayouts(p);
    } catch (err) {
      console.error('Failed to approve payout:', err);
    } finally {
      setActioningPayoutId(null);
    }
  }, []);

  const handleRejectPayout = useCallback(async (payoutId: string) => {
    setActioningPayoutId(payoutId);
    try {
      await patchPayoutStatus(payoutId, 'REJECTED');
      // Refresh
      const [s, p] = await Promise.all([fetchAdminStats(), fetchPayouts()]);
      setStats(s);
      setPayouts(p);
    } catch (err) {
      console.error('Failed to reject payout:', err);
    } finally {
      setActioningPayoutId(null);
    }
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────
  const isLoading = isLoadingStats || isLoadingPayouts || isLoadingBatches || isLoadingStreams;
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <LoadingCard contentLines={2} className="h-20" />
        <div className="grid grid-cols-3 gap-4">
          <LoadingCard contentLines={1} />
          <LoadingCard contentLines={1} />
          <LoadingCard contentLines={1} />
        </div>
        <LoadingCard contentLines={4} />
        <LoadingCard contentLines={3} />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Could not load dWallet admin</h3>
        <p className="text-sm text-red-600 mb-4 max-w-md">{error}</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-slate-800">dWallet Admin</h3>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Residents Opted In" value={stats?.optedInResidents ?? 0} />
        <StatCard
          label="Month Rewards"
          value={
            stats?.totalRewardsMonth
              ? `R ${Number(stats.totalRewardsMonth).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
              : 'R 0.00'
          }
        />
        <StatCard label="Pending Payouts" value={stats?.pendingPayouts ?? 0} />
      </div>

      {/* ── Run Distribution CTA ─────────────────────────────────────── */}
      {!showDistributionForm ? (
        <button
          type="button"
          onClick={() => setShowDistributionForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors self-start"
        >
          Run Distribution
        </button>
      ) : (
        <DistributionForm
          streams={streams}
          onSubmit={handleRunDistribution}
          onCancel={() => setShowDistributionForm(false)}
          isSubmitting={isSubmittingBatch}
        />
      )}

      {/* ── Pending Payouts ──────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Pending Payouts</h4>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <PayoutsTable
            payouts={payouts.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING')}
            onApprove={handleApprovePayout}
            onReject={handleRejectPayout}
            isActioning={actioningPayoutId !== null}
            actioningId={actioningPayoutId}
          />
        </div>
      </div>

      {/* ── Recent Batches ───────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Recent Batches</h4>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <BatchesList batches={batches.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}

// ── Exported widget wrapped in ErrorBoundary ───────────────────────────────

export function DWalletAdminWidget() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Could not load dWallet admin</h3>
          <p className="text-sm text-red-600 mb-4 max-w-md">
            Please refresh the page or try again later.
          </p>
        </div>
      }
    >
      <DWalletAdminWidgetContent />
    </ErrorBoundary>
  );
}
