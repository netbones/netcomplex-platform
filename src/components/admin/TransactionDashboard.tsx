'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchApi, formatCurrency, formatDate, sendJson, statusBadgeClass } from './adminApi';
import { RefundModal } from './RefundModal';
import type { RefundResponse, TransactionItem, TransactionsResponse } from './types';

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function TransactionDashboard() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [gateway, setGateway] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    if (gateway) params.set('gateway', gateway);
    return params.toString();
  }, [gateway, page, status]);

  const transactionsQuery = useQuery<TransactionsResponse>({
    queryKey: ['admin', 'transactions', queryString],
    queryFn: () => fetchApi<TransactionsResponse>(`/api/admin/transactions?${queryString}`),
    staleTime: 60_000,
  });

  const refundMutation = useMutation({
    mutationFn: (payload: { transactionId: string; amount?: number; reason: string }) =>
      sendJson<RefundResponse>(`/api/admin/transactions/${payload.transactionId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: payload.amount, reason: payload.reason }),
      }),
    onSuccess: async result => {
      setRefundMessage(`${result.message} Reference: ${result.refundReference}`);
      setSelectedTransaction(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    },
  });

  const data = transactionsQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white shadow-lg">
        <h1 className="flex items-center gap-3 text-3xl font-semibold">
          <img src="/platform/providers.svg" alt="" className="h-8 w-8" />
          Provider transactions
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Inspect transaction status, refundable exposure, and execute gateway refunds across
          provider billing.
        </p>
      </section>

      {refundMessage ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          {refundMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Transactions in view" value={String(data?.pagination.total ?? 0)} />
        <SummaryCard title="Total value" value={formatCurrency(data?.summary.totalAmount ?? 0)} />
        <SummaryCard
          title="Refundable exposure"
          value={formatCurrency(data?.summary.totalRefundable ?? 0)}
        />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Transaction queue</h2>
            <p className="mt-1 text-sm text-gray-500">
              Filter payment records before opening provider detail pages.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={status}
              onChange={event => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <select
              value={gateway}
              onChange={event => {
                setGateway(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All gateways</option>
              <option value="PAYSTACK">Paystack</option>
              <option value="PAYPAL">PayPal</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4">Provider</th>
                <th className="pb-3 pr-4">Gateway</th>
                <th className="pb-3 pr-4">Amounts</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactionsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Loading transactions…
                  </td>
                </tr>
              ) : data?.transactions.length ? (
                data.transactions.map(transaction => (
                  <tr key={transaction.id} className="align-top">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900">
                        {transaction.providerCompanyName ?? 'Unknown provider'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {transaction.externalRef ?? transaction.id}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-gray-700">{transaction.gateway}</td>
                    <td className="py-4 pr-4 text-gray-700">
                      <div>{formatCurrency(transaction.amount, transaction.currency)}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Refundable{' '}
                        {formatCurrency(transaction.refundableAmount, transaction.currency)}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(transaction.status)}`}
                      >
                        {transaction.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-gray-700">{formatDate(transaction.createdAt)}</td>
                    <td className="py-4">
                      <button
                        type="button"
                        disabled={transaction.status !== 'COMPLETED'}
                        onClick={() => setSelectedTransaction(transaction)}
                        className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Refund
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {data?.pagination.page ?? 1} of {data?.pagination.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(current => Math.max(1, current - 1))}
              disabled={(data?.pagination.page ?? 1) <= 1}
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPage(current => Math.min(data?.pagination.totalPages ?? current, current + 1))
              }
              disabled={(data?.pagination.page ?? 1) >= (data?.pagination.totalPages ?? 1)}
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <RefundModal
        transaction={selectedTransaction}
        open={Boolean(selectedTransaction)}
        pending={refundMutation.isPending}
        onClose={() => setSelectedTransaction(null)}
        onSubmit={async payload => {
          if (!selectedTransaction) return;
          await refundMutation.mutateAsync({ transactionId: selectedTransaction.id, ...payload });
        }}
      />
    </div>
  );
}
