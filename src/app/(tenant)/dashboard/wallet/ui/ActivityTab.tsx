'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSafeTranslation } from '@shared/lib';
import { LoadingSkeleton } from '@shared/ui';
import { Activity as ActivityIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TransactionItem } from '@entities/dwallet';
import { formatZAR, formatDate, getTypeBadge } from '../model/helpers';
import { apiGet } from '@/shared/api/http-client';

export function ActivityTab() {
  const { tx } = useSafeTranslation();
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

      const { data, meta } = await apiGet<TransactionItem[]>(
        `/api/v1/tenant/dwallet/transactions?${params}`
      );
      const items = data ?? [];
      setTransactions(items);
      const m = (meta ?? {}) as { total?: number; hasMore?: boolean };
      setTotal(m.total ?? items.length);
      setHasMore(m.hasMore ?? false);
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={e => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">{tx('dwallet.allTypes', 'All Types')}</option>
          <option value="CREDIT">{tx('dwallet.valueEarnedLabel', 'Value Earned')}</option>
          <option value="DEBIT">{tx('dwallet.valueUsedLabel', 'Value Used')}</option>
          <option value="ROLLOVER">{tx('dwallet.valueRolledLabel', 'Value Rolled')}</option>
          <option value="ADJUSTMENT">{tx('dwallet.adjustmentLabel', 'Adjustment')}</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={tx('dwallet.startDate', 'Start date')}
        />
        <input
          type="date"
          value={endDate}
          onChange={e => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={tx('dwallet.endDate', 'End date')}
        />
      </div>

      {isLoading && <LoadingSkeleton className="space-y-2" />}

      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchTransactions}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
          >
            {tx('dwallet.retryBtn', 'Retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && transactions.length === 0 && (
        <div className="text-center py-12">
          <ActivityIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {tx('dwallet.noActivity', 'No community activity yet')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {tx('dwallet.noActivityTabDesc', 'Value earned through data sharing will appear here.')}
          </p>
        </div>
      )}

      {!isLoading && !error && transactions.length > 0 && (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwallet.dateCol', 'Date')}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwallet.typeCol', 'Type')}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwallet.sourceCol', 'Source')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwallet.amountCol', 'Amount')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwallet.valueBeforeCol', 'Value Before')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwallet.valueAfterCol', 'Value After')}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                {tx('dwallet.pageOf', 'Page {page} of {total}', {
                  page: String(page),
                  total: String(totalPages),
                })}{' '}
                ({tx('dwallet.records', '{count} records', { count: String(total) })})
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
