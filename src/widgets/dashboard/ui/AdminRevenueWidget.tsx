'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { ErrorBoundary } from '@shared/ui';

interface PaymentRow {
  amount: string;
  platformFee: string;
  netAmount: string;
  createdAt: string;
}

interface ApiResponse {
  data: PaymentRow[];
}

interface MonthlyRevenue {
  month: string;
  gross: number;
  net: number;
  platformFees: number;
}

async function fetchRevenue(): Promise<{
  monthlyRevenues: MonthlyRevenue[];
  totalRevenue: number;
  averageMonthly: number;
  totalPlatformFees: number;
}> {
  const res = await fetch('/api/admin/platform/billing/payments?status=COMPLETED&limit=100');
  if (!res.ok) throw new Error('Failed to fetch payment data');
  const json: ApiResponse = await res.json();
  const payments = json.data || [];

  const monthlyMap = new Map<string, { gross: number; net: number; fees: number }>();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthLabels.push(key);
    monthlyMap.set(key, { gross: 0, net: 0, fees: 0 });
  }

  for (const p of payments) {
    const d = new Date(p.createdAt);
    if (d < sixMonthsAgo) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      const gross = parseFloat(p.amount || '0');
      const net = parseFloat(p.netAmount || '0');
      const fees = parseFloat(p.platformFee || '0');
      entry.gross += gross;
      entry.net += net;
      entry.fees += fees;
    }
  }

  const monthlyRevenues: MonthlyRevenue[] = monthLabels.map(key => {
    const entry = monthlyMap.get(key)!;
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = d.toLocaleDateString('en-ZA', { month: 'short' });
    return {
      month: monthName,
      gross: entry.gross,
      net: entry.net,
      platformFees: entry.fees,
    };
  });

  let totalRevenue = 0;
  let totalPlatformFees = 0;
  for (const m of monthlyRevenues) {
    totalRevenue += m.gross;
    totalPlatformFees += m.platformFees;
  }

  const activeMonths = monthlyRevenues.filter(m => m.gross > 0).length || 1;

  return {
    monthlyRevenues,
    totalRevenue,
    averageMonthly: Math.round(totalRevenue / activeMonths),
    totalPlatformFees,
  };
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
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: fetchRevenue,
    staleTime: 60_000,
  });

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

        <BarChart data={data?.monthlyRevenues || []} />

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
              R {data?.totalRevenue.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Avg Monthly</p>
            <p className="text-lg font-bold text-gray-900">
              R {data?.averageMonthly.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Platform Fees</p>
            <p className="text-lg font-bold text-gray-900">
              R {data?.totalPlatformFees.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
