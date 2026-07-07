'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchApi, formatCurrency, formatPercent } from './adminApi';
import { RevenueChart } from './RevenueChart';
import Image from 'next/image';
import type { ProviderAnalyticsResponse } from './types';

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export function ProviderAnalyticsDashboard() {
  const [grouping, setGrouping] = useState('monthly');
  const queryString = useMemo(() => new URLSearchParams({ grouping }).toString(), [grouping]);

  const analyticsQuery = useQuery<ProviderAnalyticsResponse>({
    queryKey: ['admin', 'provider-analytics', queryString],
    queryFn: () =>
      fetchApi<ProviderAnalyticsResponse>(`/api/admin/analytics/providers?${queryString}`),
    staleTime: 60_000,
  });

  const analytics = analyticsQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
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
              Provider ecosystem analytics
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-violet-50">
              Track registration velocity, verification conversion, reputation, suspensions, and
              revenue mix for the provider ecosystem.
            </p>
          </div>
          <select
            value={grouping}
            onChange={event => setGrouping(event.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total providers"
          value={String(analytics?.metrics.totalProviders ?? 0)}
        />
        <MetricCard
          title="Verification rate"
          value={formatPercent(analytics?.metrics.verificationRate ?? 0)}
        />
        <MetricCard
          title="Average reputation score"
          value={String(analytics?.metrics.averageReputationScore ?? 0)}
        />
        <MetricCard
          title="Revenue tracked"
          value={formatCurrency(analytics?.metrics.revenueMetrics.totalRevenue ?? 0)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RevenueChart
          title="Registration timeline"
          description="New provider registrations within the selected window."
          data={(analytics?.registrationTimeline ?? []).map(item => ({
            label: item.label,
            value: item.value,
            color: 'bg-violet-500',
          }))}
          formatAsCurrency={false}
        />
        <RevenueChart
          title="Payment method distribution"
          description="Revenue concentration across supported gateways."
          data={(analytics?.paymentMethodDistribution ?? []).map((item, index) => ({
            label: item.gateway,
            value: item.revenue,
            color: index % 2 === 0 ? 'bg-fuchsia-500' : 'bg-pink-500',
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Status distribution</h2>
          <p className="mt-1 text-sm text-gray-500">Current moderation states across providers.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries(analytics?.statusCounts ?? {}).map(([status, total]) => (
              <div key={status} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">{status}</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{total}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Top providers by reputation</h2>
          <p className="mt-1 text-sm text-gray-500">
            Operators leading on trust and participation scores.
          </p>
          <div className="mt-5 space-y-3">
            {(analytics?.topProviders ?? []).map(provider => (
              <div key={provider.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="font-medium text-gray-900">{provider.companyName}</div>
                <div className="mt-1 text-sm text-gray-600">
                  {provider.reputationScore} points • {provider.status.toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {(analytics?.suspendedReasons ?? []).length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="font-semibold">Suspended providers requiring follow-up</div>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {analytics?.suspendedReasons.map(item => (
              <li key={item.companyName}>
                {item.companyName}: {item.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
