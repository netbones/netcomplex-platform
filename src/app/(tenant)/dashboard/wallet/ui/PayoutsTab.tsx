'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSafeTranslation } from '@shared/lib';
import { LoadingSkeleton } from '@shared/ui';
import { CreditCard, Info } from 'lucide-react';
import type { PayoutRequestItem } from '@entities/dwallet';
import { formatZAR, formatDate, getPayoutStatusBadge } from '../model/helpers';

export function PayoutsTab({
  wallet,
  requestPayout,
  isRequestingPayout,
}: {
  wallet: { balance?: string } | null;
  requestPayout: (params: { amount: number }) => void;
  isRequestingPayout: boolean;
}) {
  const { tx } = useSafeTranslation();
  const [amount, setAmount] = useState('');
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const balanceStr = wallet?.balance || '0.00';
  const balanceNum = parseFloat(balanceStr);
  const isBelowThreshold = balanceNum < 50;

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
        setSubmitError(tx('dwallet.enterAmount', 'Please enter a valid amount'));
        return;
      }
      if (numAmount < 50) {
        setSubmitError(tx('dwallet.minPayout', 'Minimum payout amount is R50'));
        return;
      }
      requestPayout({ amount: numAmount });
    },
    [amount, requestPayout]
  );

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 rounded-lg p-5 bg-white">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          {tx('dwallet.requestPayout', 'Request Payout')}
        </h4>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="payout-amount" className="block text-xs text-slate-500 mb-1">
              {tx('dwallet.amountZar', 'Amount (ZAR)')}
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
            <p className="text-xs text-slate-400 mb-1">{tx('dwallet.method', 'Method')}</p>
            <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              {tx('dwallet.bankTransfer', 'Bank Transfer')}
            </p>
          </div>
          {submitError && <p className="text-xs text-red-600">{submitError}</p>}
          <button
            type="submit"
            disabled={isBelowThreshold || isRequestingPayout}
            title={
              isBelowThreshold
                ? tx(
                    'dwallet.minPayoutDesc',
                    'Minimum R50 community value required to request a payout'
                  )
                : undefined
            }
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
              isBelowThreshold
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            {isRequestingPayout
              ? tx('dwallet.requesting', 'Requesting...')
              : tx('dwallet.requestPayout', 'Request Payout')}
          </button>
        </form>
      </div>

      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <div className="flex items-start gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <h4 className="text-sm font-semibold text-slate-700">
            {tx('dwallet.payoutComplianceNotes', 'Payout Compliance Notes')}
          </h4>
        </div>
        <ul className="space-y-2 text-sm text-slate-500">
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>
              {tx(
                'dwallet.minPayoutNote',
                'Minimum payout: R50 threshold. Monthly or on request (Schedule G, G3).'
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>
              {tx(
                'dwallet.unclaimedRewardsNote',
                'Unclaimed rewards transfer to the Community Benefit Fund after 12 months from the credit date (Schedule G, G3).'
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>
              {tx(
                'dwallet.perResidentRewardNote',
                'Per-resident reward = total pool ÷ active opt-in participants (Schedule G, G3).'
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-medium shrink-0">•</span>
            <span>
              {tx(
                'dwallet.distributionsLoggedNote',
                'All distributions, payouts, and unclaimed transfers are logged and retained per Schedule G4 audit requirements.'
              )}
            </span>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          {tx('dwallet.payoutHistory', 'Payout History')}
        </h4>
        {isLoadingPayouts ? (
          <LoadingSkeleton className="h-24" />
        ) : payouts.length === 0 ? (
          <div className="text-center py-8 border border-slate-200 rounded-lg bg-white">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {tx('dwallet.noPayoutRequestsYet', 'No payout requests yet.')}
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      {tx('dwallet.dateRequested', 'Date Requested')}
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      {tx('dwallet.amountCol', 'Amount')}
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      {tx('dwallet.statusCol', 'Status')}
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      {tx('dwallet.processedDate', 'Processed Date')}
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                      {tx('dwallet.notes', 'Notes')}
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
