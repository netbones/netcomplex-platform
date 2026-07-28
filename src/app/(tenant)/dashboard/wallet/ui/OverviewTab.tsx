'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSafeTranslation } from '@shared/lib';
import { LoadingSkeleton } from '@shared/ui';
import { CreditCard, Download } from 'lucide-react';
import type { ConsentState, TransactionItem, StreamConfig } from '@entities/dwallet';
import { formatZAR, formatDate, getTypeBadge, getStreamLabelKey } from '../model/helpers';

export function OverviewTab({
  wallet,
  consents,
  transactions,
  streams,
  isLoading,
}: {
  wallet: { balance?: string; lifetimeEarned?: string; lifetimePaid?: string } | null;
  consents: ConsentState[];
  transactions: TransactionItem[];
  streams: StreamConfig[];
  isLoading: boolean;
}) {
  const { tx } = useSafeTranslation();

  if (isLoading) {
    return <LoadingSkeleton className="space-y-4" />;
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
          <Image src="/platform/wallet-red.svg" alt="dWallet" width={32} height={32} />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-2">
          {tx('dwallet.noActivity', 'No community activity yet')}
        </h3>
        <p className="text-sm text-slate-500 max-w-xs">
          {tx(
            'dwallet.noActivityDesc',
            'Your dWallet is ready. Value earned through data sharing will appear here as it is distributed.'
          )}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">
            {tx('dwallet.valueEarned', 'Value Earned (Lifetime)')}
          </p>
          <p className="text-xl font-semibold text-slate-700">{formatZAR(lifetimeEarned)}</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">
            {tx('dwallet.valueWithdrawn', 'Value Withdrawn')}
          </p>
          <p className="text-xl font-semibold text-slate-700">{formatZAR(lifetimePaid)}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          {tx('dwallet.valueSources', 'Where Your Value Comes From')}
        </h4>
        {streams.length === 0 ? (
          <p className="text-sm text-slate-400">
            {tx('dwallet.noStreams', 'No active revenue streams yet.')}
          </p>
        ) : (
          <div className="space-y-2">
            {streams.map(stream => {
              const consent = consents.find(c => c.streamKey === stream.key);
              const granted = consent?.granted ?? false;
              const pct = Number(stream.residentSharePct) || 0;
              return (
                <div
                  key={stream.key}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      {tx(getStreamLabelKey(stream.key), stream.label)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tx(
                        'dwallet.streamContributes',
                        'Stream contributes {pct}% of its distributable surplus to the pool',
                        { pct }
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      Consent:{' '}
                      {granted
                        ? tx('dwallet.consentGranted', 'Granted')
                        : tx('dwallet.consentNotGranted', 'Not granted')}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-indigo-600 shrink-0">
                    {formatZAR(balanceStr)}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">
                {tx('dwallet.totalYourShare', 'Total Your Share')}
              </span>
              <span className="text-sm font-semibold text-indigo-600">{formatZAR(balanceStr)}</span>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          {tx(
            'dwallet.yourShareDesc',
            'Your share = total Resident Data Share pool ÷ all program participants. Equal distribution — all opt-in residents receive the same amount. Per-stream consent controls data usage, not payout calculation.'
          )}
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          {tx('dwallet.communityImpact', 'Community Impact')}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400">
              {tx('dwallet.activeStreams', 'Active Revenue Streams')}
            </p>
            <p className="text-lg font-semibold text-slate-700">{activeStreamCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">
              {tx('dwallet.participatingResidents', 'Participating Residents')}
            </p>
            <p className="text-lg font-semibold text-slate-700">—</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">
              {tx('dwallet.totalPool', 'Total Resident Share Pool')}
            </p>
            <p className="text-lg font-semibold text-slate-700">—</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">
              {tx('dwallet.yourEstimatedShare', 'Your Estimated Share')}
            </p>
            <p className="text-lg font-semibold text-indigo-600">—</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/wallet?tab=payouts"
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          {tx('dwallet.requestPayout', 'Request Payout')}
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          {tx('dwallet.exportMyData', 'Export My Data')}
        </button>
      </div>

      {transactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700">
              {tx('dwallet.recentCommunityActivity', 'Recent Community Activity')}
            </h4>
            <Link
              href="/dashboard/wallet?tab=activity"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {tx('dwallet.viewAll', 'View all →')}
            </Link>
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
