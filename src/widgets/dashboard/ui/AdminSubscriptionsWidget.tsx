'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { ErrorBoundary } from '@shared/ui';

interface SubscriptionView {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  startDate: string | null;
  nextBillingDate: string | null;
  tenantName: string | null;
  planName: string | null;
  planTier: string | null;
}

interface ApiResponse {
  data: SubscriptionView[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
  TRIALING: 'bg-blue-100 text-blue-700',
  PAST_DUE: 'bg-orange-100 text-orange-700',
};

async function fetchSubscriptions(status: string, search: string): Promise<SubscriptionView[]> {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.set('status', status.toUpperCase());
  if (search) params.set('search', search);
  const res = await fetch(`/api/admin/platform/billing/subscriptions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch subscriptions');
  const json: ApiResponse = await res.json();
  return json.data || [];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(tier: string | null): string {
  switch (tier) {
    case 'STANDARD':
      return 'Free';
    case 'PREMIUM':
      return 'R299/mo';
    case 'ENTERPRISE':
      return 'R999/mo';
    default:
      return '—';
  }
}

export function AdminSubscriptionsWidget() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', statusFilter, debouncedSearch],
    queryFn: () => fetchSubscriptions(statusFilter, debouncedSearch),
    staleTime: 30_000,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  };

  const statuses = ['All', 'Active', 'Pending', 'Cancelled', 'Trialing', 'Expired'];

  return (
    <ErrorBoundary>
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant or plan..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {statuses.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && !subscriptions?.length && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No subscriptions found</p>
          </div>
        )}

        {!isLoading && subscriptions && subscriptions.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr className="text-left text-gray-500">
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Start</th>
                  <th className="pb-2 font-medium">Next Bill</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-gray-900">{sub.tenantName || '—'}</td>
                    <td className="py-2 text-gray-700">{sub.planName || '—'}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{formatDate(sub.startDate)}</td>
                    <td className="py-2 text-gray-500">{formatDate(sub.nextBillingDate)}</td>
                    <td className="py-2 text-right text-gray-700">{formatAmount(sub.planTier)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
