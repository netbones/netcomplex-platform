'use client';

import { useState, useEffect } from 'react';
import { useSafeTranslation } from '@shared/lib';
import { LoadingSkeleton } from '@shared/ui';
import { Info, TrendingUp } from 'lucide-react';
import type { StreamConfig } from '@entities/dwallet';
import { getStreamLabelKey } from '../model/helpers';

export function ImpactTab({ streams }: { streams: StreamConfig[] }) {
  const { tx } = useSafeTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSkeleton className="space-y-4" />;
  }

  const activeStreams = streams.filter(s => s.isActive).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">
            {tx('dwallet.totalResidentSharePool', 'Total Resident Share Pool (Current Period)')}
          </p>
          <p className="text-xl font-semibold text-slate-800">R 0.00</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">
            {tx('dwallet.participatingResidents', 'Participating Residents')}
          </p>
          <p className="text-xl font-semibold text-slate-800">—</p>
          <p className="text-xs text-slate-400 mt-1">
            {tx('dwallet.residentsCurrentlyOptedIn', 'residents currently opted in')}
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">
            {tx('dwallet.yourEstimatedShare', 'Your Estimated Share')}
          </p>
          <p className="text-xl font-semibold text-indigo-600">R 0.00</p>
          <p className="text-xs text-slate-400 mt-1">
            {tx('dwallet.oneOf', '1/{total} of community total', { total: '—' })}
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className="text-xs text-slate-400 mb-1">
            {tx('dwallet.activeStreams', 'Active Revenue Streams')}
          </p>
          <p className="text-xl font-semibold text-slate-800">
            {activeStreams} of {streams.length || 8}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {tx(
              'dwallet.revenueStreamsGeneratingValue',
              'revenue streams generating value this period'
            )}
          </p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-5 bg-slate-50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">
              {tx('dwallet.communityBenefitFund', 'Community Benefit Fund')}
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              {tx(
                'dwallet.fundDescription',
                'This fund supports projects that benefit all residents — infrastructure, events, security, and facility upgrades. It is not your personal balance. Disbursed by the HOA Board per Schedule F Section F6.4.'
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-400">
                  {tx('dwallet.currentBalance', 'Current Balance')}
                </p>
                <p className="text-base font-semibold text-slate-700">—</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  {tx('dwallet.unclaimedTransfers', 'Unclaimed Transfers')}
                </p>
                <p className="text-base font-semibold text-slate-700">—</p>
                <p className="text-xs text-slate-400">
                  {tx('dwallet.fromExpiredRewards', 'from expired rewards after 12 months')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  {tx('dwallet.nextAllocation', 'Next Allocation')}
                </p>
                <p className="text-base font-semibold text-slate-700">—</p>
              </div>
            </div>
            <a href="#" className="inline-block mt-4 text-sm text-indigo-600 hover:text-indigo-700">
              {tx('dwallet.viewCommunityProjects', 'View Community Projects →')}
            </a>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          {tx('dwallet.revenueStreamBreakdown', 'Revenue Stream Contribution Breakdown')}
        </h4>
        {streams.length === 0 ? (
          <p className="text-sm text-slate-400">
            {tx('dwallet.noStreams', 'No active revenue streams yet.')}
          </p>
        ) : (
          <div className="space-y-2">
            {streams.map(stream => {
              const pct = Number(stream.residentSharePct) || 0;
              return (
                <div key={stream.key} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 flex-1">
                    {tx(getStreamLabelKey(stream.key), stream.label)}
                  </span>
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
          {tx(
            'dwallet.equalDistDesc',
            'Your share = total Resident Data Share pool ÷ all program participants. Equal distribution — all opt-in residents receive the same amount. Per-stream consent controls data usage, not payout calculation.'
          )}
        </p>
      </div>

      {streams.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {tx('dwallet.noImpactDataYet', 'No impact data yet.')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {tx(
              'dwallet.impactDataDesc',
              'Community impact metrics will appear once your data sharing generates community-wide contributions.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
