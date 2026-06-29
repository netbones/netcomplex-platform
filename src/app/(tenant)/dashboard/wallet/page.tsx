'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ErrorBoundary, LoadingSkeleton } from '@shared/ui';
import { useWallet } from '@entities/dwallet';
import type {
  ConsentState,
  TransactionItem,
  PayoutRequestItem,
  StreamConfig,
} from '@entities/dwallet';
import {
  Download,
  MoreHorizontal,
  Info,
  TrendingUp,
  Shield,
  FileText,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Activity as ActivityIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const TABS = ['overview', 'activity', 'impact', 'consents', 'payouts'] as const;
type TabKey = (typeof TABS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  activity: 'Activity',
  impact: 'Impact',
  consents: 'Consents',
  payouts: 'Payouts',
};

function formatZAR(amount: string | number): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getTypeBadge(type: TransactionItem['type']) {
  switch (type) {
    case 'CREDIT':
      return { label: 'Value Earned', className: 'bg-indigo-50 text-indigo-600' };
    case 'DEBIT':
      return { label: 'Value Used', className: 'bg-slate-100 text-slate-600' };
    case 'ROLLOVER':
      return { label: 'Value Rolled', className: 'bg-slate-50 text-slate-400' };
    case 'ADJUSTMENT':
      return { label: 'Adjustment', className: 'bg-gray-50 text-gray-400' };
    default:
      return { label: type, className: 'bg-slate-50 text-slate-500' };
  }
}

function getPayoutStatusBadge(status: PayoutRequestItem['status']) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', className: 'bg-slate-100 text-slate-500' };
    case 'PROCESSING':
      return { label: 'Processing', className: 'bg-indigo-50 text-indigo-500' };
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-indigo-50 text-indigo-600' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-slate-100 text-slate-600' };
    case 'CANCELLED':
      return { label: 'Cancelled', className: 'bg-gray-50 text-gray-400' };
    default:
      return { label: status, className: 'bg-slate-50 text-slate-500' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Consent Toggle Component
// ═══════════════════════════════════════════════════════════════════════════

interface ConsentToggleProps {
  streamKey: string;
  label: string;
  granted: boolean;
  isMaster?: boolean;
  subtitle?: string;
  dateLine?: string;
  onToggle: (streamKey: string, granted: boolean) => void;
  isPending: boolean;
}

function ConsentToggle({
  streamKey,
  label,
  granted,
  isMaster = false,
  subtitle,
  dateLine,
  onToggle,
  isPending,
}: ConsentToggleProps) {
  return (
    <div
      className={isMaster ? 'py-4 border-b-2 border-indigo-100' : 'py-3 border-b border-slate-100'}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm ${isMaster ? 'font-semibold text-slate-800' : 'text-slate-700'}`}
          >
            {label}
          </span>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {dateLine && <p className="text-xs text-slate-400 mt-0.5">{dateLine}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={granted}
          aria-label={`Toggle ${label} consent`}
          disabled={isPending}
          onClick={() => onToggle(streamKey, !granted)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
            granted ? 'bg-indigo-600' : 'bg-slate-200'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
              granted ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Header
// ═══════════════════════════════════════════════════════════════════════════

function PageHeader({ balance, isLoading }: { balance: string | undefined; isLoading: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <img src="/platform/wallet-red.svg" alt="dWallet" className="w-7 h-7" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">My dWallet</h2>
            <p className="text-sm text-slate-500">Your data, your consent, your rewards</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10 py-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Download Annual Statement
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  Delete My Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
            <div className="h-5 w-64 bg-slate-100 rounded" />
          </div>
        ) : (
          <>
            <p className="text-3xl font-semibold text-indigo-600">
              {balance ? formatZAR(balance) : 'R 0.00'}
            </p>
            <p className="text-sm text-slate-400 mt-1">Available Value</p>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Bar
// ═══════════════════════════════════════════════════════════════════════════

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  return (
    <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
      {TABS.map(tab => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === tab
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — Overview
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({
  wallet,
  consents,
  transactions,
  streams,
  isLoading,
}: {
  wallet: ReturnType<typeof useWallet>['wallet'];
  consents: ConsentState[];
  transactions: TransactionItem[];
  streams: StreamConfig[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <LoadingSkeleton className="space-y-4" />;
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
          <img src="/platform/wallet-red.svg" alt="dWallet" className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-2">No community activity yet</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          Your dWallet is ready. Value earned through data sharing will appear here as it is
          distributed.
        </p>
      </div>
    );
  }

  const balanceStr = wallet.balance || '0.00';
  const lifetimeEarned = wallet.lifetimeEarned || '0.00';
  const lifetimePaid = wallet.lifetimePaid || '0.00';
  const activeStreamCount = streams.filter(s => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Available Value + Lifetime Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">Available Value</p>
          <p className="text-xl font-semibold text-indigo-600">{formatZAR(balanceStr)}</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">Value Earned (Lifetime)</p>
          <p className="text-xl font-semibold text-slate-700">{formatZAR(lifetimeEarned)}</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">Value Withdrawn</p>
          <p className="text-xl font-semibold text-slate-700">{formatZAR(lifetimePaid)}</p>
        </div>
      </div>

      {/* Earnings Breakdown Card */}
      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Where Your Value Comes From</h4>
        {streams.length === 0 ? (
          <p className="text-sm text-slate-400">No active revenue streams yet.</p>
        ) : (
          <div className="space-y-2">
            {streams.map(stream => {
              const consent = (consents ?? []).find(c => c.streamKey === stream.key);
              const granted = consent?.granted ?? false;
              // Show stream contribution info
              const pct = Number(stream.residentSharePct) || 0;
              return (
                <div
                  key={stream.key}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{stream.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Stream contributes {pct}% of its distributable surplus to the pool
                    </p>
                    <p className="text-xs text-slate-400">
                      Consent: {granted ? 'Granted' : 'Not granted'}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-indigo-600 shrink-0">
                    {formatZAR(balanceStr)}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Total Your Share</span>
              <span className="text-sm font-semibold text-indigo-600">{formatZAR(balanceStr)}</span>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          Your share = total Resident Data Share pool ÷ all program participants. Equal distribution
          — all opt-in residents receive the same amount. Per-stream consent controls data usage,
          not payout calculation.
        </p>
      </div>

      {/* Community Impact Card */}
      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Community Impact</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400">Active Revenue Streams</p>
            <p className="text-lg font-semibold text-slate-700">{activeStreamCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Participating Residents</p>
            <p className="text-lg font-semibold text-slate-700">—</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Resident Share Pool</p>
            <p className="text-lg font-semibold text-slate-700">—</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Your Estimated Share</p>
            <p className="text-lg font-semibold text-indigo-600">—</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <a
          href="/dashboard/wallet?tab=payouts"
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Request Payout
        </a>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export My Data
        </button>
      </div>

      {/* Recent Activity */}
      {transactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700">Recent Community Activity</h4>
            <a
              href="/dashboard/wallet?tab=activity"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View all &rarr;
            </a>
          </div>
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {transactions.slice(0, 5).map(txn => {
                  const badge = getTypeBadge(txn.type);
                  const isPositive = txn.type === 'CREDIT';
                  return (
                    <tr key={txn.id} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-2 px-3 text-slate-500">{formatDate(txn.createdAt)}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[200px]">
                        {txn.description}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-medium ${isPositive ? 'text-indigo-600' : 'text-slate-600'}`}
                      >
                        {isPositive ? '+' : ''}
                        {formatZAR(txn.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — Activity
// ═══════════════════════════════════════════════════════════════════════════

function ActivityTab() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const limit = 20;

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (typeFilter) params.set('type', typeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/v1/tenant/dwallet/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to load activity');
      const data = await res.json();
      // apiSuccess wraps in { data, ... } or returns array directly
      const items = Array.isArray(data) ? data : (data.data ?? []);
      setTransactions(items);
      setTotal(data.total ?? items.length);
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={e => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Types</option>
          <option value="CREDIT">Value Earned</option>
          <option value="DEBIT">Value Used</option>
          <option value="ROLLOVER">Value Rolled</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="End date"
        />
      </div>

      {/* Loading */}
      {isLoading && <LoadingSkeleton className="space-y-2" />}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchTransactions}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && transactions.length === 0 && (
        <div className="text-center py-12">
          <ActivityIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No community activity yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Value earned through data sharing will appear here.
          </p>
        </div>
      )}

      {/* Activity Table */}
      {!isLoading && !error && transactions.length > 0 && (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    Type
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    Source
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    Amount
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    Value Before
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    Value After
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => {
                  const badge = getTypeBadge(txn.type);
                  const isPositive = txn.type === 'CREDIT';
                  return (
                    <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(txn.createdAt)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]">
                        {txn.description}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-medium ${isPositive ? 'text-indigo-600' : 'text-slate-600'}`}
                      >
                        {isPositive ? '+' : ''}
                        {formatZAR(txn.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {formatZAR(txn.balanceBefore)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {formatZAR(txn.balanceAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages} ({total} records)
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="inline-flex items-center px-2 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!hasMore}
                  onClick={() => setPage(p => p + 1)}
                  className="inline-flex items-center px-2 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — Impact
// ═══════════════════════════════════════════════════════════════════════════

function ImpactTab({ streams }: { streams: StreamConfig[] }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Impact data is derived from available endpoints
    // In production, a dedicated /impact endpoint would provide these aggregates
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSkeleton className="space-y-4" />;
  }

  const activeStreams = streams.filter(s => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Derived Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">Total Resident Share Pool (Current Period)</p>
          <p className="text-xl font-semibold text-slate-800">R 0.00</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">Participating Residents</p>
          <p className="text-xl font-semibold text-slate-800">—</p>
          <p className="text-xs text-slate-400 mt-1">residents currently opted in</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">Your Estimated Share</p>
          <p className="text-xl font-semibold text-indigo-600">R 0.00</p>
          <p className="text-xs text-slate-400 mt-1">1/— of community total</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">Active Revenue Streams</p>
          <p className="text-xl font-semibold text-slate-800">
            {activeStreams} of {streams.length || 8}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            revenue streams generating value this period
          </p>
        </div>
      </div>

      {/* Community Benefit Fund Card */}
      <div className="border border-slate-200 rounded-lg p-5 bg-slate-50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Community Benefit Fund</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              This fund supports projects that benefit all residents — infrastructure, events,
              security, and facility upgrades. It is not your personal balance. Disbursed by the HOA
              Board per Schedule F Section F6.4.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-400">Current Balance</p>
                <p className="text-base font-semibold text-slate-700">—</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Unclaimed Transfers</p>
                <p className="text-base font-semibold text-slate-700">—</p>
                <p className="text-xs text-slate-400">from expired rewards after 12 months</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Next Allocation</p>
                <p className="text-base font-semibold text-slate-700">—</p>
              </div>
            </div>
            <a href="#" className="inline-block mt-4 text-sm text-indigo-600 hover:text-indigo-700">
              View Community Projects &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Revenue Stream Contribution Breakdown */}
      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Revenue Stream Contribution Breakdown
        </h4>
        {streams.length === 0 ? (
          <p className="text-sm text-slate-400">No active revenue streams yet.</p>
        ) : (
          <div className="space-y-2">
            {streams.map(stream => {
              const pct = Number(stream.residentSharePct) || 0;
              return (
                <div key={stream.key} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 flex-1">{stream.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 w-12 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          Your share = total Resident Data Share pool ÷ all program participants. Equal distribution
          — all opt-in residents receive the same amount. Per-stream consent controls data usage,
          not payout calculation.
        </p>
      </div>

      {/* Empty state fallback */}
      {streams.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No impact data yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Community impact metrics will appear once your data sharing generates community-wide
            contributions.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — Consents
// ═══════════════════════════════════════════════════════════════════════════

function ConsentsTab({
  consents,
  isLoading,
  isUpdating,
  onToggle,
}: {
  consents: ConsentState[];
  isLoading: boolean;
  isUpdating: boolean;
  onToggle: (streamKey: string, granted: boolean) => void;
}) {
  if (isLoading) {
    return <LoadingSkeleton className="space-y-3" />;
  }

  const safe = consents ?? [];

  const masterConsent = safe.find(c => c.streamKey === 'resident_data_share');
  const perStreamConsents = safe.filter(c => c.streamKey !== 'resident_data_share');

  return (
    <div>
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        {/* Master toggle */}
        {masterConsent && (
          <div className="px-5">
            <ConsentToggle
              streamKey={masterConsent.streamKey}
              label="Resident Data Share Program"
              granted={masterConsent.granted}
              isMaster
              subtitle="Share in platform revenue earned by the community. Your share = total pool ÷ all participants."
              dateLine={
                masterConsent.granted && masterConsent.grantedAt
                  ? `Granted ${formatDate(masterConsent.grantedAt)}`
                  : masterConsent.revokedAt
                    ? `Revoked ${formatDate(masterConsent.revokedAt)} (paused)`
                    : 'No consent granted'
              }
              onToggle={onToggle}
              isPending={isUpdating}
            />
          </div>
        )}

        {/* Per-stream toggles */}
        <div className="px-5 pb-2">
          {perStreamConsents.length === 0 ? (
            <p className="py-4 text-sm text-slate-400 text-center">
              No per-stream consents configured yet.
            </p>
          ) : (
            perStreamConsents.map(consent => (
              <ConsentToggle
                key={consent.streamKey}
                streamKey={consent.streamKey}
                label={consent.label}
                granted={consent.granted}
                subtitle={consent.description ?? undefined}
                dateLine={
                  consent.granted && consent.grantedAt
                    ? `Granted ${formatDate(consent.grantedAt)}`
                    : consent.revokedAt
                      ? `Revoked ${formatDate(consent.revokedAt)} (paused)`
                      : 'No consent granted'
                }
                onToggle={onToggle}
                isPending={isUpdating}
              />
            ))
          )}
        </div>

        {/* Info & Audit Disclaimer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Revoking consent stops future data usage for that stream. Past value earned is not
              affected. To stop receiving future rewards, use the Resident Data Share Program toggle
              above.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              All consent changes are logged and retained for 5 years per Schedule G4.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5 — Payouts
// ═══════════════════════════════════════════════════════════════════════════

function PayoutsTab({
  wallet,
  requestPayout,
  isRequestingPayout,
}: {
  wallet: ReturnType<typeof useWallet>['wallet'];
  requestPayout: ReturnType<typeof useWallet>['requestPayout'];
  isRequestingPayout: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const balanceStr = wallet?.balance || '0.00';
  const balanceNum = parseFloat(balanceStr);
  const isBelowThreshold = balanceNum < 50;

  // Load payout history
  const fetchPayouts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/tenant/dwallet/payout');
      if (!res.ok) throw new Error('Failed to load payouts');
      const data = await res.json();
      setPayouts(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      // Silently fail for payout history
    } finally {
      setIsLoadingPayouts(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Pre-fill amount with current balance
  useEffect(() => {
    if (amount === '' && balanceStr && balanceStr !== '0.00') {
      setAmount(balanceStr);
    }
  }, [balanceStr, amount]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setSubmitError('Please enter a valid amount');
        return;
      }
      if (numAmount < 50) {
        setSubmitError('Minimum payout amount is R50');
        return;
      }
      requestPayout({ amount: numAmount });
    },
    [amount, requestPayout]
  );

  return (
    <div className="space-y-6">
      {/* Payout Request Form */}
      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Request Payout</h4>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="payout-amount" className="block text-xs text-slate-500 mb-1">
              Amount (ZAR)
            </label>
            <input
              id="payout-amount"
              type="number"
              min="50"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="50.00"
            />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Method</p>
            <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              Bank Transfer
            </p>
          </div>
          {submitError && <p className="text-xs text-red-600">{submitError}</p>}
          <button
            type="submit"
            disabled={isBelowThreshold || isRequestingPayout}
            title={
              isBelowThreshold
                ? 'Minimum R50 community value required to request a payout'
                : undefined
            }
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
              isBelowThreshold
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            {isRequestingPayout ? 'Requesting...' : 'Request Payout'}
          </button>
        </form>
      </div>

      {/* Payout Compliance Notes */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <div className="flex items-start gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <h4 className="text-sm font-semibold text-slate-700">Payout Compliance Notes</h4>
        </div>
        <ul className="space-y-2 text-sm text-slate-500">
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>Minimum payout: R50 threshold. Monthly or on request (Schedule G, G3).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>
              Unclaimed rewards transfer to the Community Benefit Fund after 12 months from the
              credit date (Schedule G, G3).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>
              Per-resident reward = total pool ÷ active opt-in participants (Schedule G, G3).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>
              All distributions, payouts, and unclaimed transfers are logged and retained per
              Schedule G4 audit requirements.
            </span>
          </li>
        </ul>
      </div>

      {/* Payout History */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Payout History</h4>
        {isLoadingPayouts ? (
          <LoadingSkeleton className="h-24" />
        ) : payouts.length === 0 ? (
          <div className="text-center py-8 border border-slate-200 rounded-lg bg-white">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No payout requests yet.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      Date Requested
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      Amount
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      Processed Date
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => {
                    const statusBadge = getPayoutStatusBadge(payout.status);
                    return (
                      <tr key={payout.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-500">
                          {formatDate(payout.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 text-indigo-600 font-medium">
                          {formatZAR(payout.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {formatDate(payout.processedAt)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-[200px]">
                          {payout.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════

function DWalletPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    wallet,
    consents,
    transactions,
    isLoading,
    error,
    updateConsent,
    isUpdatingConsent,
    requestPayout,
    isRequestingPayout,
  } = useWallet();

  const [streams, setStreams] = useState<StreamConfig[]>([]);

  // Determine active tab from URL
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = TABS.includes(tabParam as TabKey) ? (tabParam as TabKey) : 'overview';

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      router.push(`/dashboard/wallet?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  const handleConsentToggle = useCallback(
    (streamKey: string, granted: boolean) => {
      updateConsent({ streamKey, granted });
    },
    [updateConsent]
  );

  // Fetch streams for impact/overview data
  useEffect(() => {
    let cancelled = false;
    async function loadStreams() {
      try {
        const res = await fetch('/api/v1/tenant/dwallet/streams');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setStreams(Array.isArray(data) ? data : (data.data ?? []));
        }
      } catch {
        // Silently fail
      }
    }
    loadStreams();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Loading state (full page) ──────────────────────────────────────────
  if (isLoading && !wallet) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PageHeader balance={undefined} isLoading />
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        <LoadingSkeleton className="space-y-4" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error && !wallet) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PageHeader balance={undefined} isLoading={false} />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Could not load dWallet</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Please refresh the page or try again later.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader balance={wallet?.balance} isLoading={false} />
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            wallet={wallet}
            consents={consents}
            transactions={transactions}
            streams={streams}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'impact' && <ImpactTab streams={streams} />}
        {activeTab === 'consents' && (
          <ConsentsTab
            consents={consents ?? []}
            isLoading={isLoading}
            isUpdating={isUpdatingConsent}
            onToggle={handleConsentToggle}
          />
        )}
        {activeTab === 'payouts' && (
          <PayoutsTab
            wallet={wallet}
            requestPayout={requestPayout}
            isRequestingPayout={isRequestingPayout}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Exported page wrapped in ErrorBoundary
// ═══════════════════════════════════════════════════════════════════════════

export default function DWalletPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Could not load dWallet</h3>
            <p className="text-sm text-red-600 mb-4 max-w-md">
              Please refresh the page or try again later.
            </p>
          </div>
        </div>
      }
    >
      <DWalletPageContent />
    </ErrorBoundary>
  );
}
