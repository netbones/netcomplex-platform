'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary, LoadingCard } from '@shared/ui';
import { useSafeTranslation } from '@shared/lib';
import { Wallet } from 'lucide-react';
import type { AdminStats, PayoutRequestItem, BatchRecord, StreamConfig } from '../model/types';
import {
  fetchAdminStats,
  fetchPayouts,
  fetchBatches,
  fetchStreams,
  patchPayoutStatus,
} from './admin/api';
import { StatCard } from './admin/shared';
import { ManageStreams } from './admin/ManageStreams';
import { DistributionForm } from './admin/DistributionForm';
import { PayoutsTable } from './admin/PayoutsTable';
import { BatchesList } from './admin/BatchesList';

function DWalletAdminWidgetContent() {
  const { tx } = useSafeTranslation('admin');
  const [activeTab, setActiveTab] = useState<'streams' | 'distribute'>('streams');
  const [showDistributionForm, setShowDistributionForm] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [actioningPayoutId, setActioningPayoutId] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [streams, setStreams] = useState<StreamConfig[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [s, p, b] = await Promise.all([fetchAdminStats(), fetchPayouts(), fetchBatches()]);
        setStats(s);
        setPayouts(p);
        setBatches(b);
      } catch (err) {
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
      const [s, p] = await Promise.all([fetchAdminStats(), fetchPayouts()]);
      setStats(s);
      setPayouts(p);
    } catch (err) {
      console.error('Failed to reject payout:', err);
    } finally {
      setActioningPayoutId(null);
    }
  }, []);

  const refreshStreams = useCallback(async () => {
    try {
      const streamsData = await fetchStreams();
      setStreams(streamsData);
    } catch (err) {
      console.error('Failed to refresh streams:', err);
    }
  }, []);

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

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          {tx('dwalletAdmin.errorHeading', 'Could not load dWallet admin')}
        </h3>
        <p className="text-sm text-red-600 mb-4 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-slate-800">
          {tx('dwalletAdmin.heading', 'dWallet Admin')}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={tx('dwalletAdmin.residentsOptedIn', 'Residents Opted In')}
          value={stats?.optedInResidents ?? 0}
        />
        <StatCard
          label={tx('dwalletAdmin.monthRewards', 'Month Rewards')}
          value={
            stats?.totalRewardsMonth
              ? `R ${Number(stats.totalRewardsMonth).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
              : 'R 0.00'
          }
        />
        <StatCard
          label={tx('dwalletAdmin.pendingPayouts', 'Pending Payouts')}
          value={stats?.pendingPayouts ?? 0}
        />
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('streams')}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'streams'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tx('dwalletAdmin.streams.heading', 'Revenue Streams')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('distribute')}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'distribute'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tx('dwalletAdmin.distribution.heading', 'Run Distribution')}
          </button>
        </nav>
      </div>

      {activeTab === 'streams' ? (
        <ManageStreams
          streams={streams}
          onStreamCreated={refreshStreams}
          onStreamUpdated={refreshStreams}
          tx={tx}
        />
      ) : !showDistributionForm ? (
        <button
          type="button"
          onClick={() => setShowDistributionForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors self-start"
        >
          {tx('dwalletAdmin.distribution.runDistribution', 'Run Distribution')}
        </button>
      ) : (
        <DistributionForm
          streams={streams}
          onSubmit={handleRunDistribution}
          onCancel={() => setShowDistributionForm(false)}
          isSubmitting={isSubmittingBatch}
          tx={tx}
        />
      )}

      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">
          {tx('dwalletAdmin.pendingPayouts', 'Pending Payouts')}
        </h4>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <PayoutsTable
            payouts={payouts.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING')}
            onApprove={handleApprovePayout}
            onReject={handleRejectPayout}
            isActioning={actioningPayoutId !== null}
            actioningId={actioningPayoutId}
            tx={tx}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">
          {tx('dwalletAdmin.recentBatches', 'Recent Batches')}
        </h4>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <BatchesList batches={batches.slice(0, 5)} tx={tx} />
        </div>
      </div>
    </div>
  );
}

export function DWalletAdminWidget() {
  const { tx } = useSafeTranslation('admin');
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {tx('dwalletAdmin.errorHeading', 'Could not load dWallet admin')}
          </h3>
          <p className="text-sm text-red-600 mb-4 max-w-md">
            {tx('dwalletAdmin.errorGeneric', 'Please refresh the page or try again later.')}
          </p>
        </div>
      }
    >
      <DWalletAdminWidgetContent />
    </ErrorBoundary>
  );
}
