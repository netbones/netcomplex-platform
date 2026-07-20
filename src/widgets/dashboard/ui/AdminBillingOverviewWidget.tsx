'use client';

import { DollarSign, Users, TrendingUp, Percent } from 'lucide-react';
import { trpc } from '@api/client';
import { ErrorBoundary } from '@shared/ui';

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminBillingOverviewWidget() {
  const { data, isLoading } = trpc.admin.billing.getBillingOverview.useQuery(undefined, {
    staleTime: 60_000,
  });

  const overview = data?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-24" />
        ))}
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    STANDARD: 'bg-blue-100 text-blue-700',
    PREMIUM: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
  };

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={DollarSign}
          label="MRR"
          value={`R ${(overview?.mrr || 0).toLocaleString()}`}
          sub="Estimated monthly"
        />
        <StatCard icon={Users} label="Active Subs" value={overview?.activeCount ?? 0} />
        <StatCard
          icon={TrendingUp}
          label="Conversions"
          value={overview?.trialConversions ?? 0}
          sub="Trial to paid"
        />
        <StatCard icon={Percent} label="Churn" value={`${overview?.churnRate ?? 0}%`} />
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Tier Distribution</h4>
        <div className="flex gap-2">
          {overview?.tierDistribution &&
            Object.entries(overview.tierDistribution).map(([tier, count]) => (
              <span
                key={tier}
                className={`px-3 py-1 rounded-full text-xs font-medium ${tierColors[tier] || 'bg-gray-100 text-gray-600'}`}
              >
                {tier}: {count}
              </span>
            ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
