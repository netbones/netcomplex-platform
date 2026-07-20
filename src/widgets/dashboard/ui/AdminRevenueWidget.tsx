'use client';

import { TrendingUp } from 'lucide-react';
import { trpc } from '@api/client';
import { ErrorBoundary } from '@shared/ui';

interface MonthlyRevenue {
  month: string;
  gross: number;
  net: number;
  platformFees: number;
}

function BarChart({ data }: { data: MonthlyRevenue[] }) {
  const maxValue = Math.max(...data.map(d => d.gross), 1);

  return (
    <div className="flex items-end gap-2 h-32 mt-2">
      {data.map((item, i) => {
        const grossPct = (item.gross / maxValue) * 100;
        const netPct = (item.net / maxValue) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
              <div
                className="w-full bg-indigo-200 rounded-t transition-all duration-300"
                style={{ height: `${grossPct}%` }}
              >
                <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${netPct}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-gray-400">{item.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminRevenueWidget() {
  const { data, isLoading } = trpc.admin.billing.getRevenue.useQuery(undefined, {
    staleTime: 60_000,
  });

  const revenue = data?.data;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <TrendingUp className="w-4 h-4" />
          <span>Monthly Revenue (Last 6 Months)</span>
        </div>

        <BarChart data={revenue?.monthlyRevenues || []} />

        <div className="flex gap-1 items-center text-xs text-gray-400 mb-3">
          <div className="w-3 h-3 bg-indigo-200 rounded" />
          <span className="mr-2">Gross</span>
          <div className="w-3 h-3 bg-indigo-500 rounded" />
          <span>Net</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-lg font-bold text-gray-900">
              R {revenue?.totalRevenue.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Avg Monthly</p>
            <p className="text-lg font-bold text-gray-900">
              R {revenue?.averageMonthly.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Platform Fees</p>
            <p className="text-lg font-bold text-gray-900">
              R {revenue?.totalPlatformFees.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
