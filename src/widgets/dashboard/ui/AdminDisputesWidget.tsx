'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn, formatDate } from '@shared/lib';
import { LoadingSkeleton } from '@shared/ui';
import { DisputeStatusBadge, DisputeCategoryBadge, SeverityIndicator } from '@entities/dispute';
import type { DisputeCaseDTO, DisputeStatus } from '@entities/dispute';

// ── Constants ─────────────────────────────────────────────────

/** Number of days pending before showing urgent SLA indicator */
const URGENT_DAYS_THRESHOLD = 5;

// ── Helpers ───────────────────────────────────────────────────

function daysPending(dateStr: string): number {
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

function getComplainantLabel(_dispute: DisputeCaseDTO): string {
  return 'Resident';
}

function isUrgent(dispute: DisputeCaseDTO): boolean {
  return (
    daysPending(dispute.createdAt) > URGENT_DAYS_THRESHOLD &&
    (dispute.status === 'SUBMITTED' || dispute.status === 'UNDER_REVIEW')
  );
}

// ── Tab definitions ───────────────────────────────────────────

type TabId = 'pending' | 'mediation' | 'ruling';

interface TabDef {
  id: TabId;
  label: string;
  statuses: DisputeStatus[];
}

const TABS: TabDef[] = [
  {
    id: 'pending',
    label: 'Pending Assignment',
    statuses: ['SUBMITTED', 'UNDER_REVIEW'],
  },
  {
    id: 'mediation',
    label: 'In Mediation',
    statuses: ['MEDIATION_OFFERED', 'MEDIATION_ACTIVE'],
  },
  {
    id: 'ruling',
    label: 'Awaiting Ruling',
    statuses: ['FORMAL_RULING', 'ESCALATED_CSOS'],
  },
];

// ── Component ─────────────────────────────────────────────────

export function AdminDisputesWidget() {
  const [disputes, setDisputes] = useState<DisputeCaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pending');

  const activeTabDef = TABS.find(t => t.id === activeTab) ?? TABS[0];

  const fetchDisputes = useCallback(async (tab: TabId) => {
    setLoading(true);
    setError(null);
    try {
      const tabDef = TABS.find(t => t.id === tab);
      if (!tabDef) return;

      const params = new URLSearchParams();
      tabDef.statuses.forEach(s => params.append('status', s));

      const res = await fetch(`/api/disputes?${params}`);

      if (!res.ok) {
        setError('Unable to load disputes');
        toast.error('Failed to load moderation queue');
        return;
      }

      const data = await res.json();
      const list: DisputeCaseDTO[] = Array.isArray(data) ? data : (data?.data ?? []);

      setDisputes(list);
    } catch {
      setError('Unable to load disputes');
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes(activeTab);
  }, [activeTab, fetchDisputes]);

  // Compute per-tab counts (from currently loaded data)
  const tabCounts: Record<TabId, number> = {
    pending: disputes.filter(d => activeTabDef.statuses.includes(d.status)).length,
    mediation: disputes.filter(
      d => d.status === 'MEDIATION_OFFERED' || d.status === 'MEDIATION_ACTIVE'
    ).length,
    ruling: disputes.filter(d => d.status === 'FORMAL_RULING' || d.status === 'ESCALATED_CSOS')
      .length,
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col rounded-lg bg-white border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Dispute Moderation</h2>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 px-3 py-3 text-sm font-medium text-center transition-colors min-h-[44px]',
              activeTab === tab.id
                ? 'border-b-2 text-soralia-primary font-semibold border-soralia-primary'
                : 'text-gray-500 hover:text-gray-700'
            )}
            style={activeTab === tab.id ? { borderColor: '#4F46E5', color: '#4F46E5' } : undefined}
          >
            {tab.label} ({tabCounts[tab.id]})
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="p-4 space-y-3">
          <LoadingSkeleton height="h-10" className="w-full" />
          <LoadingSkeleton height="h-10" className="w-full" />
          <LoadingSkeleton height="h-10" className="w-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && disputes.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h3 className="text-2xl font-semibold text-gray-700 mb-2">No disputes in this queue</h3>
          <p className="text-sm text-gray-500">
            All disputes in this category have been handled. Check other tabs or wait for new
            filings.
          </p>
        </div>
      )}

      {/* Moderation queue rows */}
      {!loading && !error && disputes.length > 0 && (
        <div className="divide-y divide-gray-100">
          {disputes.map(dispute => (
            <div key={dispute.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
              {/* Row header: badges + date */}
              <div className="flex items-center gap-2 flex-wrap">
                <DisputeStatusBadge status={dispute.status} />
                <DisputeCategoryBadge category={dispute.category} />
                <SeverityIndicator severity={dispute.severity} />
                <span className="text-xs text-gray-500 ml-auto">
                  {formatDate(dispute.createdAt)}
                </span>
              </div>

              {/* Complainant + age */}
              <div className="flex items-center gap-4 text-gray-600">
                <span>{getComplainantLabel(dispute)}</span>
                <span className="text-xs">
                  {daysPending(dispute.createdAt)} days pending
                  {daysPending(dispute.createdAt) > URGENT_DAYS_THRESHOLD && (
                    <span className="text-amber-600"> ⚠</span>
                  )}
                </span>
              </div>

              {/* SLA urgent indicator */}
              {isUrgent(dispute) && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  URGENT — Pending {daysPending(dispute.createdAt)} days — Needs assignment
                </div>
              )}

              {/* Quick action */}
              <div className="mt-1">
                {activeTab === 'pending' ? (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors min-h-[44px]"
                    style={{ backgroundColor: '#4F46E5' }}
                  >
                    Assign Moderator
                  </button>
                ) : (
                  <Link
                    href={`/disputes/${dispute.id}`}
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-soralia-primary hover:underline min-h-[44px]"
                    style={{ color: '#4F46E5' }}
                  >
                    View Detail
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
