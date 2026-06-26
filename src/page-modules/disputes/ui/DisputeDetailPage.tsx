'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@api/client';
import { LoadingSkeleton, ErrorBoundary } from '@shared/ui';
import { useDisputeThread } from '@features/dispute';
import {
  MediationThread,
  DisputeActionsBar,
  DisputeTimeline,
  EvidenceUploadZone,
  EvidencePreviewGrid,
  AIFrivolityCheckPanel,
  DisputeStatusBadge,
  DisputeCategoryBadge,
  SeverityIndicator,
  CSOSExportButton,
  CoolingOffTimer,
} from '@entities/dispute';
import type { DisputeCaseDTO, DisputeEventDTO, DisputeStatus } from '@entities/dispute';

interface DisputeDetailPageProps {
  disputeId: string;
}

type MobileTab = 'timeline' | 'thread' | 'evidence';

export function DisputeDetailPage({ disputeId }: DisputeDetailPageProps) {
  // ── Hooks (all called unconditionally, before any returns) ──
  const { data: sessionData, isPending: sessionLoading } = useSession();
  const { threadState, error: threadError } = useDisputeThread(disputeId);

  const [dispute, setDispute] = useState<DisputeCaseDTO | null>(null);
  const [events, setEvents] = useState<DisputeEventDTO[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MobileTab>('thread');

  const userId = sessionData?.user?.id || '';
  const userRole = sessionData?.user?.role || 'RESIDENT';

  useEffect(() => {
    let cancelled = false;

    async function fetchDispute() {
      try {
        const res = await fetch(`/api/disputes/${disputeId}`);
        if (!cancelled) {
          if (!res.ok) {
            if (res.status === 404) {
              setFetchError('Dispute not found');
            } else {
              setFetchError('Unable to load dispute');
            }
          } else {
            const json = await res.json();
            setDispute(json.data as DisputeCaseDTO);
          }
        }
      } catch {
        if (!cancelled) {
          setFetchError('Network error — please check your connection');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (disputeId && threadState === 'ready') {
      fetchDispute();
    }

    return () => {
      cancelled = true;
    };
  }, [disputeId, threadState]);

  const handleEvidenceUploadComplete = () => {
    setEvents(prev => [...prev]);
  };

  const status = dispute ? (dispute.status as DisputeStatus) : 'DRAFT';

  // ── Loading state ──
  if (sessionLoading || threadState === 'loading' || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6" data-testid="loading-skeleton-container">
        <LoadingSkeleton className="h-16 mb-6" />
        <div className="md:grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <LoadingSkeleton className="h-96" height="h-96" lines={1} />
          </div>
          <div className="md:col-span-1">
            <LoadingSkeleton className="h-64" height="h-64" lines={1} />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (threadState === 'error' || fetchError) {
    const errorMessage = threadError || fetchError || 'Dispute not found';
    return (
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            {errorMessage === 'Dispute not found'
              ? "The dispute you're looking for doesn't exist or you don't have permission to view it."
              : errorMessage}
          </p>
        </div>
      </ErrorBoundary>
    );
  }

  // ── No dispute data yet ──
  if (!dispute) {
    return null;
  }

  // ── Ready state ──
  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Header ── */}
        <header className="mb-8">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <DisputeTimeline events={events} />
          </div>
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <DisputeStatusBadge status={status} />
            <DisputeCategoryBadge category={dispute.category} />
            <SeverityIndicator severity={dispute.severity} />
            <div className="ml-auto">
              <CSOSExportButton disputeId={disputeId} userId={userId} />
            </div>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Dispute #{dispute.referenceNumber}</h1>
          <p className="text-sm text-gray-600 mt-2 line-clamp-3">{dispute.description}</p>
        </header>

        {/* ── Desktop Layout (md+) ── */}
        <div className="hidden md:grid md:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex-1 min-h-[600px]">
              <MediationThread disputeId={disputeId} userRole={userRole} userId={userId} />
            </div>
            <div className="border-t pt-4">
              <DisputeActionsBar dispute={dispute} userRole={userRole} userId={userId} />
            </div>
          </div>

          {/* Right column */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <EvidenceUploadZone
              disputeId={disputeId}
              userId={userId}
              onUploadComplete={handleEvidenceUploadComplete}
            />
            <EvidencePreviewGrid disputeId={disputeId} userId={userId} />
            <AIFrivolityCheckPanel disputeId={disputeId} description={dispute.description} />
            <CoolingOffTimer coolingOffEndsAt={dispute.coolingOffEndsAt} status={status} />
          </div>
        </div>

        {/* ── Mobile Layout (<md) ── */}
        <div className="md:hidden">
          {/* Tab bar */}
          <div className="sticky top-0 bg-white border-b z-10 flex">
            {(['timeline', 'thread', 'evidence'] as MobileTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500'
                }`}
                style={{ minHeight: 44 }}
              >
                {tab === 'timeline' ? 'Timeline' : tab === 'thread' ? 'Thread' : 'Evidence'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="py-4">
            {activeTab === 'timeline' && (
              <div className="flex flex-col gap-3">
                <DisputeTimeline events={events} />
                <DisputeStatusBadge status={status} />
                <DisputeCategoryBadge category={dispute.category} />
                <SeverityIndicator severity={dispute.severity} />
              </div>
            )}
            {activeTab === 'thread' && (
              <MediationThread disputeId={disputeId} userRole={userRole} userId={userId} />
            )}
            {activeTab === 'evidence' && (
              <div className="flex flex-col gap-4">
                <EvidenceUploadZone
                  disputeId={disputeId}
                  userId={userId}
                  onUploadComplete={handleEvidenceUploadComplete}
                />
                <EvidencePreviewGrid disputeId={disputeId} userId={userId} />
              </div>
            )}
          </div>

          {/* Bottom sticky bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-10 p-3 flex gap-2 items-center">
            <div className="flex-1">
              <DisputeActionsBar dispute={dispute} userRole={userRole} userId={userId} />
            </div>
            <CoolingOffTimer coolingOffEndsAt={dispute.coolingOffEndsAt} status={status} />
            <CSOSExportButton disputeId={disputeId} userId={userId} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
