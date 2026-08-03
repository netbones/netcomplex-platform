'use client';

import { useState, useEffect } from 'react';
import { apiGet, ApiClientError } from '@/shared/api/http-client';

// ponytail: Widget receives tenantId from the dashboard shell via WidgetRenderer context.
// For MVP, accept it as an optional prop. The WidgetRenderer will pass it when tenant
// context plumbing is wired (separate plan). Until then, the widget renders a skeleton
// if no tenantId is provided.
//
// Upgrade path: Replace prop with useTenant() hook when tenant context is available.

interface UsageData {
  tokensUsed: number;
  tokensAllotted: number;
  overageTokens: number;
  usagePercent: number;
  billingMonth: string;
  tierName: string;
  features: Array<{ capability: string; tokens: number; percent: number }>;
}

interface AdminAiUsageWidgetProps {
  tenantId?: string;
}

function formatCapabilityName(capability: string): string {
  const parts = capability.split('.');
  const last = parts[parts.length - 1];
  // Convert camelCase to Title Case
  return last.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function SkeletonBar() {
  return (
    <div className="p-4 border rounded-lg bg-white animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-full bg-gray-200 rounded-full mb-3" />
      <div className="space-y-1">
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function AdminAiUsageWidget({ tenantId }: AdminAiUsageWidgetProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // TODO: Wire tenantId from dashboard shell context instead of prop.
    // The API route resolves tenant from session — tenantId is for future plumbing.
    apiGet<UsageData>(`/api/admin/platform/ai-pool/usage/${encodeURIComponent(tenantId)}`)
      .then(({ data }) => {
        if (!cancelled) {
          setUsage(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          let message: string;
          if (err instanceof ApiClientError) {
            message = err.statusCode === 404 ? 'No usage data' : 'Failed to load';
          } else {
            message = err instanceof Error ? err.message : 'Could not load AI usage';
          }
          setError(message || 'Could not load AI usage');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!tenantId) {
    return (
      <div className="p-4 border rounded-lg bg-white">
        <p className="text-sm text-gray-500">AI Usage — tenant context not available</p>
      </div>
    );
  }

  if (loading) return <SkeletonBar />;

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-white">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!usage) return <SkeletonBar />;

  const { tokensUsed, tokensAllotted, usagePercent, billingMonth, tierName, features } = usage;

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-sm font-semibold mb-2">AI Usage — {billingMonth}</h3>
      <div className="text-2xl font-bold">
        {tokensUsed.toLocaleString()} / {tokensAllotted.toLocaleString()} tokens
      </div>
      <div className="text-xs text-gray-500 mb-2">{usagePercent}% used</div>
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full ${usagePercent > 80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>
      {/* Feature breakdown */}
      {features.length > 0 && (
        <div className="space-y-1 text-xs text-gray-600">
          {features.map(f => (
            <div key={f.capability} className="flex justify-between">
              <span>{formatCapabilityName(f.capability)}</span>
              <span>
                {f.tokens.toLocaleString()} tok · {f.percent}%
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-400 mt-2">
        Resets: next month · Plan: {tierName} ({tokensAllotted.toLocaleString()} tokens/month)
      </div>
    </div>
  );
}
