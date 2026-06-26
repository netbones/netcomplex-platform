'use client';

import { useState, useEffect } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { cn } from '@shared/lib';
import { ErrorBoundary } from '@shared/ui';
import { DisputeListTable } from '@entities/dispute';
import { DisputeIntakeWizard } from '@features/dispute';

// ── Component ──────────────────────────────────────────────────

export function MyDisputesWidget() {
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [activeCount, setActiveCount] = useState(0);

  const aiEnabled = true; // Resolved server-side; default true for client widget

  // Fetch active dispute count for breadcrumb
  useEffect(() => {
    let cancelled = false;

    async function fetchActiveCount() {
      try {
        const params = new URLSearchParams();
        params.set('status', 'SUBMITTED');
        // Append additional statuses via duplicate keys
        const statuses = ['UNDER_REVIEW', 'MEDIATION_ACTIVE', 'MEDIATION_OFFERED'];
        statuses.forEach(s => params.append('status', s));
        params.set('limit', '1');

        const res = await fetch(`/api/disputes?${params}`);

        if (!cancelled && res.ok) {
          // Read the count from response headers or parse the response
          // The API may return count via header or we use the response array length
          // For simplicity we just check if there are active disputes
          const data = await res.json();
          // Attempt to read total count from the response envelope
          if (Array.isArray(data)) {
            setActiveCount(data.length > 0 ? 1 : 0);
          } else if (data?.data && Array.isArray(data.data)) {
            // Envelope shape: { data: [...], meta: { total: N } }
            setActiveCount(data.meta?.total ?? data.data.length);
          }
        }
      } catch {
        // Graceful — count stays 0 on error
      }
    }

    if (view === 'wizard') {
      fetchActiveCount();
    }

    return () => {
      cancelled = true;
    };
  }, [view]);

  const handleWizardComplete = (_disputeId: string) => {
    // After wizard + form complete, return to list view
    // In a full implementation, this would navigate to /disputes/[id]
    setView('list');
  };

  const handleWizardCancel = () => {
    setView('list');
  };

  // ── Wizard View ────────────────────────────────────────────

  if (view === 'wizard') {
    return (
      <div
        className={cn(
          'flex flex-col rounded-lg bg-white border border-gray-200',
          // Mobile: full-width takeover, bypass widget grid
          'max-sm:fixed max-sm:inset-0 max-sm:z-50'
        )}
      >
        {/* Breadcrumb */}
        <button
          type="button"
          onClick={() => setView('list')}
          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:text-gray-900 border-b border-gray-100 self-start min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>
            &#8592; Back to My Disputes
            {activeCount > 0 ? ` (${activeCount} active)` : ''}
          </span>
        </button>

        {/* Wizard content */}
        <div className="flex-1 overflow-auto p-4">
          <DisputeIntakeWizard
            aiEnabled={aiEnabled}
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
          />
        </div>
      </div>
    );
  }

  // ── List View (default) ───────────────────────────────────

  return (
    <div className="flex flex-col rounded-lg bg-white border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">My Disputes</h2>
        <button
          type="button"
          onClick={() => setView('wizard')}
          className="inline-flex items-center gap-2 rounded-lg bg-soralia-primary px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors min-h-[44px]"
          style={{ backgroundColor: '#4F46E5' }}
          aria-label="File a new dispute"
        >
          <Plus className="h-4 w-4" />
          File a Dispute
        </button>
      </div>

      {/* Dispute list */}
      <div className="flex-1 p-4">
        <ErrorBoundary>
          <DisputeListTable />
        </ErrorBoundary>
      </div>
    </div>
  );
}
