'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { ErrorBoundary, LoadingCard } from '@shared/ui';
import { useWallet } from '@entities/dwallet';
import { Wallet, CreditCard, Download, Info } from 'lucide-react';

// ── Sub-components ────────────────────────────────────────────────────────

interface ConsentToggleProps {
  streamKey: string;
  label: string;
  granted: boolean;
  isMaster?: boolean;
  subtitle?: string;
  onToggle: (streamKey: string, granted: boolean) => void;
  isPending: boolean;
}

function ConsentToggle({
  streamKey,
  label,
  granted,
  isMaster = false,
  subtitle,
  onToggle,
  isPending,
}: ConsentToggleProps) {
  const handleToggle = useCallback(() => {
    onToggle(streamKey, !granted);
  }, [streamKey, granted, onToggle]);

  return (
    <div className={isMaster ? 'py-3 border-b border-slate-200' : 'py-2'}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <span
            className={`text-sm ${isMaster ? 'font-semibold text-slate-800' : 'text-slate-700'}`}
          >
            {label}
          </span>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={granted}
          aria-label={`Toggle ${label} consent`}
          disabled={isPending}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
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

// ── Empty State ────────────────────────────────────────────────────────────

function WalletEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-2">No community activity yet</h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Your dWallet is ready. Value earned through data sharing will appear here as it is
        distributed.
      </p>
    </div>
  );
}

// ── Community Impact Card ──────────────────────────────────────────────────

function CommunityImpactCard() {
  // These values are derived from the useWallet hook's wallet data.
  // For the widget, we show a simplified 2×2 grid.
  // In practice these would come from wallet context / API.
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Community Impact</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-400">Active Streams</p>
          <p className="text-base font-semibold text-slate-700">—</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Participants</p>
          <p className="text-base font-semibold text-slate-700">—</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Total Pool</p>
          <p className="text-base font-semibold text-slate-700">R 0.00</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Your Est. Share</p>
          <p className="text-base font-semibold text-indigo-600">R 0.00</p>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3">Unclaimed &rarr; CBF After: 12 months</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

function DWalletSummaryWidgetContent() {
  const { wallet, consents, isLoading, error, updateConsent, isUpdatingConsent } = useWallet();

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingCard contentLines={6} className="min-h-[400px]" />;
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <div className="text-red-600 mb-3">
          <Info className="w-10 h-10 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Could not load dWallet</h3>
        <p className="text-sm text-red-600 mb-4 max-w-md">
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  // ── Empty state (no wallet yet) ────────────────────────────────────────
  if (!wallet) {
    return <WalletEmptyState />;
  }

  // ── Data ───────────────────────────────────────────────────────────────
  const balanceStr = wallet.balance || '0.00';
  const balanceNum = parseFloat(balanceStr);
  const lifetimeEarned = wallet.lifetimeEarned || '0.00';
  const isBelowThreshold = balanceNum < 50;

  const handleConsentToggle = useCallback(
    (streamKey: string, granted: boolean) => {
      updateConsent({ streamKey, granted });
    },
    [updateConsent]
  );

  // Separate master toggle from per-stream toggles
  const masterConsent = consents.find(c => c.streamKey === 'resident_data_share');
  const perStreamConsents = consents.filter(c => c.streamKey !== 'resident_data_share');

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-slate-800">My dWallet</h3>
      </div>

      {/* ── Available Value ─────────────────────────────────────────── */}
      <div>
        <p className="text-2xl font-semibold text-indigo-600">
          R {Number(balanceStr).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-slate-400 mt-0.5">Available Value</p>
      </div>

      {/* ── Lifetime Stats ──────────────────────────────────────────── */}
      <p className="text-sm text-slate-500">
        Value Earned (lifetime): R{' '}
        {Number(lifetimeEarned).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
      </p>

      {/* ── Consent Section ─────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Consent Status</h4>
        <div className="border border-slate-200 rounded-lg bg-white">
          {/* Master toggle */}
          {masterConsent && (
            <div className="px-4">
              <ConsentToggle
                streamKey={masterConsent.streamKey}
                label="Resident Data Share Program"
                granted={masterConsent.granted}
                isMaster
                subtitle={`You share equally with other residents`}
                onToggle={handleConsentToggle}
                isPending={isUpdatingConsent}
              />
            </div>
          )}

          {/* Per-stream toggles */}
          <div className="px-4 pb-2">
            {perStreamConsents.map(consent => (
              <ConsentToggle
                key={consent.streamKey}
                streamKey={consent.streamKey}
                label={consent.label}
                granted={consent.granted}
                onToggle={handleConsentToggle}
                isPending={isUpdatingConsent}
              />
            ))}
          </div>

          {/* Footnote */}
          <div className="px-4 py-2 bg-slate-50 rounded-b-lg border-t border-slate-200">
            <p className="text-xs text-slate-400 leading-relaxed">
              *Per-stream toggles control data usage only. Payout eligibility is controlled by the
              master toggle above. All participants share equally in the total pool.
            </p>
          </div>
        </div>
      </div>

      {/* ── Community Impact ────────────────────────────────────────── */}
      <CommunityImpactCard />

      {/* ── CTA Row ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Request Payout */}
          <button
            type="button"
            disabled={isBelowThreshold}
            title={
              isBelowThreshold
                ? `Minimum R50 community value required to request a payout`
                : undefined
            }
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
              isBelowThreshold
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Request Payout
          </button>

          {/* Export My Data */}
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export My Data
          </button>
        </div>

        {/* View full activity link */}
        <Link
          href="/dashboard/wallet?tab=activity"
          className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          View full activity &rarr;
        </Link>
      </div>
    </div>
  );
}

// ── Exported widget wrapped in ErrorBoundary ───────────────────────────────

export function DWalletSummaryWidget() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Could not load dWallet</h3>
          <p className="text-sm text-red-600 mb-4 max-w-md">
            Please refresh the page or try again later.
          </p>
        </div>
      }
    >
      <DWalletSummaryWidgetContent />
    </ErrorBoundary>
  );
}
