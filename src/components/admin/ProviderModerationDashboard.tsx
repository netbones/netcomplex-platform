'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchApi, formatCurrency, formatDate, statusBadgeClass } from './adminApi';
import { VerificationQueue } from './VerificationQueue';
import Image from 'next/image';
import type {
  PendingProvidersResponse,
  ProviderListResponse,
  RegistrationModeResponse,
} from './types';

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export function ProviderModerationDashboard() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const listQueryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return params.toString();
  }, [page, search, status]);

  const providersQuery = useQuery<ProviderListResponse>({
    queryKey: ['admin', 'providers', listQueryString],
    queryFn: () => fetchApi<ProviderListResponse>(`/api/admin/providers?${listQueryString}`),
    staleTime: 60_000,
  });

  const queueQuery = useQuery<PendingProvidersResponse>({
    queryKey: ['admin', 'providers', 'pending'],
    queryFn: () => fetchApi<PendingProvidersResponse>('/api/admin/providers/pending'),
    staleTime: 60_000,
  });

  const modeQuery = useQuery<RegistrationModeResponse>({
    queryKey: ['admin', 'provider-registration-mode'],
    queryFn: () =>
      fetchApi<RegistrationModeResponse>('/api/admin/tenant/provider-registration-mode'),
    staleTime: 60_000,
  });

  const data = providersQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 to-sky-700 p-6 text-white shadow-lg">
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
              Provider moderation
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-indigo-50">
              Review onboarding submissions, manage verification status, and monitor provider
              revenue performance from a single admin surface.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 text-sm">
            <div className="text-indigo-100">Registration mode</div>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(modeQuery.data?.mode ?? 'INVITATION_ONLY')}`}
              >
                {(modeQuery.data?.mode ?? 'INVITATION_ONLY').replace('_', ' ')}
              </span>
              <Link
                href="/dashboard/admin/settings"
                className="text-white underline underline-offset-4"
              >
                Manage setting
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total providers" value={String(data?.summary.totalProviders ?? 0)} />
        <StatCard title="Pending" value={String(data?.summary.pendingProviders ?? 0)} />
        <StatCard title="Verified" value={String(data?.summary.verifiedProviders ?? 0)} />
        <StatCard title="Suspended" value={String(data?.summary.suspendedProviders ?? 0)} />
        <StatCard
          title="Monthly revenue"
          value={formatCurrency(data?.summary.monthlyRevenue ?? 0)}
        />
      </div>

      <VerificationQueue providers={queueQuery.data?.providers ?? []} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">All providers</h2>
            <p className="mt-1 text-sm text-gray-500">
              Filter by moderation status, search by company, and drill into detail views.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search company, contact, trade…"
              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
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
              <option value="PROBATION">Probation</option>
              <option value="VERIFIED">Verified</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4">Company</th>
                <th className="pb-3 pr-4">Contact</th>
                <th className="pb-3 pr-4">Trade</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Reputation</th>
                <th className="pb-3 pr-4">Revenue</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {providersQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading providers…
                  </td>
                </tr>
              ) : data?.providers.length ? (
                data.providers.map(provider => (
                  <tr key={provider.id}>
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900">{provider.companyName}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Joined {formatDate(provider.createdAt)}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-gray-700">
                      <div>{provider.contactName ?? 'No contact'}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {provider.email ?? 'No email'}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-gray-700">{provider.trade ?? '—'}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(provider.verificationStatus)}`}
                      >
                        {provider.verificationStatus.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-gray-700">{provider.reputationScore}</td>
                    <td className="py-4 pr-4 text-gray-700">
                      {formatCurrency(provider.revenueTotal)}
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/dashboard/admin/providers/${provider.id}`}
                        className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Open detail
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No providers match the selected filters.
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
    </div>
  );
}
