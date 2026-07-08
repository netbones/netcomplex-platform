'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchApi, formatCurrency, statusBadgeClass } from './adminApi';
import { RevenueChart } from './RevenueChart';
import Image from 'next/image';
import type { RevenueDetailsResponse, RevenueSummaryResponse } from './types';

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function RevenueDashboard() {
  const [grouping, setGrouping] = useState('monthly');
  const [gateway, setGateway] = useState('');
  const filters = useMemo(() => {
    const params = new URLSearchParams({ grouping });
    if (gateway) params.set('gateway', gateway);
    return params.toString();
  }, [gateway, grouping]);

  const summaryQuery = useQuery<RevenueSummaryResponse>({
    queryKey: ['admin', 'revenue', 'summary', filters],
    queryFn: () => fetchApi<RevenueSummaryResponse>(`/api/admin/revenue/summary?${filters}`),
    staleTime: 60_000,
  });

  const detailsQuery = useQuery<RevenueDetailsResponse>({
    queryKey: ['admin', 'revenue', 'details', filters],
    queryFn: () =>
      fetchApi<RevenueDetailsResponse>(`/api/admin/revenue/details?${filters}&limit=10`),
    staleTime: 60_000,
  });

  const summary = summaryQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-semibold">
              <Image
                src="/platform/providers.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8"
              />
              Provider revenue analytics
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-emerald-50">
              Monitor platform fees, processor deductions, gateway mix, and payout visibility from
              provider billing.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={grouping}
              onChange={event => setGrouping(event.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <select
              value={gateway}
              onChange={event => setGateway(event.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="">All gateways</option>
              <option value="PAYSTACK">Paystack</option>
              <option value="PAYPAL">PayPal</option>
            </select>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total revenue" value={formatCurrency(summary?.totals.totalRevenue ?? 0)} />
        <KpiCard
          title="Platform fees"
          value={formatCurrency(summary?.totals.totalPlatformFees ?? 0)}
        />
        <KpiCard
          title="Processor fees"
          value={formatCurrency(summary?.totals.totalProcessorFees ?? 0)}
        />
        <KpiCard
          title="Net provider payouts"
          value={formatCurrency(summary?.totals.totalNetPayout ?? 0)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RevenueChart
          title="Revenue by gateway"
          description="Completed revenue grouped by payment processor."
          data={(summary?.byGateway ?? []).map((item, index) => ({
            label: item.gateway,
            value: item.totalRevenue,
            color: index % 2 === 0 ? 'bg-emerald-500' : 'bg-cyan-500',
          }))}
        />
        <RevenueChart
          title="Revenue by tier"
          description="Subscription tiers generating the most provider billing volume."
          data={(summary?.byTier ?? []).map((item, index) => ({
            label: item.tierName,
            value: item.totalRevenue,
            color: index % 2 === 0 ? 'bg-indigo-500' : 'bg-violet-500',
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <RevenueChart
          title="Revenue over time"
          description="Platform revenue trend over the active date range."
          data={(summary?.timeline ?? []).map(item => ({
            label: item.label,
            value: item.totalRevenue,
            color: 'bg-sky-500',
          }))}
        />
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Gateway health</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configuration-aware signal from recent billing outcomes.
          </p>
          <div className="mt-5 space-y-3">
            {Object.entries(summary?.gatewayHealth ?? {}).map(([gatewayName, gatewayHealth]) => (
              <div key={gatewayName} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-gray-900">{gatewayName}</div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(gatewayHealth.status.toUpperCase())}`}
                  >
                    {gatewayHealth.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{gatewayHealth.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Recent revenue transactions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Latest billing events with platform-fee and processor-fee breakdown.
        </p>

        {detailsQuery.isLoading ? (
          <p className="mt-5 py-8 text-center text-sm text-gray-500">Loading transactions…</p>
        ) : detailsQuery.data?.transactions.length ? (
          <>
            {/* Desktop table */}
            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-3 pr-4">Provider</th>
                    <th className="pb-3 pr-4">Gateway</th>
                    <th className="pb-3 pr-4">Gross</th>
                    <th className="pb-3 pr-4">Platform fee</th>
                    <th className="pb-3 pr-4">Processor fee</th>
                    <th className="pb-3">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailsQuery.data.transactions.map(row => (
                    <tr key={row.id}>
                      <td className="py-4 pr-4">
                        <div className="font-medium text-gray-900">
                          {row.providerCompanyName ?? 'Unknown provider'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {row.tierName ?? 'Unassigned tier'}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-gray-700">{row.gateway}</td>
                      <td className="py-4 pr-4 text-gray-700">
                        {formatCurrency(row.amount, row.currency)}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">
                        {formatCurrency(row.platformFee, row.currency)}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">
                        {formatCurrency(row.processorFee, row.currency)}
                      </td>
                      <td className="py-4 font-medium text-gray-900">
                        {formatCurrency(row.netAmount, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mt-5 space-y-3 md:hidden">
              {detailsQuery.data.transactions.map(row => (
                <div key={row.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {row.providerCompanyName ?? 'Unknown provider'}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {row.tierName ?? 'Unassigned tier'}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                      {row.gateway}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div>
                      <span className="text-gray-500">Gross</span>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(row.amount, row.currency)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Net</span>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(row.netAmount, row.currency)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Platform fee</span>
                      <div className="text-gray-700">
                        {formatCurrency(row.platformFee, row.currency)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Processor fee</span>
                      <div className="text-gray-700">
                        {formatCurrency(row.processorFee, row.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-5 py-8 text-center text-sm text-gray-500">
            No revenue data is available for the selected filters.
          </p>
        )}
      </section>

      {summary?.licenseCompliance ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900">
          <div className="font-semibold">{summary.licenseCompliance.reference}</div>
          <div className="mt-2">{summary.licenseCompliance.trackedBasis}</div>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {summary.licenseCompliance.notes.map(note => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
