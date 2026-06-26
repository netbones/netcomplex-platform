'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumbs, ErrorBoundary, PageLayout } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import type { DisputeCaseDTO, DisputeEventDTO } from '@entities/dispute';
import { DisputeStatusBadge } from '@entities/dispute';
import { DisputeCategoryBadge } from '@entities/dispute';
import { SeverityIndicator } from '@entities/dispute';
import { DisputeTimeline } from '@entities/dispute';
import { MediationThread } from '@entities/dispute';
import { AIFrivolityCheckPanel } from '@entities/dispute';
import { CoolingOffTimer } from '@entities/dispute';
import { EvidencePreviewGrid } from '@entities/dispute';
import { DisputeActionsBar } from '@entities/dispute';

interface DetailState {
  dispute: DisputeCaseDTO | null;
  events: DisputeEventDTO[];
  loading: boolean;
  error: string | null;
}

export default function AdminDisputeDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [state, setState] = useState<DetailState>({
    dispute: null,
    events: [],
    loading: true,
    error: null,
  });

  const [userRole, setUserRole] = useState('RESIDENT');
  const [userId, setUserId] = useState('');

  const BREADCRUMBS: Array<{ label: string; href: string }> = [
    { label: 'Admin', href: '/admin' },
    { label: 'Disputes', href: '/admin/disputes' },
    { label: state.dispute?.referenceNumber ?? 'Loading...', href: '' },
  ];

  const { isReady, LoadingComponent } = usePageLoading(BREADCRUMBS, {
    title: 'Dispute Detail',
    contentHeight: 'h-96',
    additionalLoading: state.loading,
  });

  useEffect(() => {
    async function fetchDispute() {
      try {
        const res = await fetch(`/api/disputes/${id}`);
        if (!res.ok) {
          if (res.status === 403) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: "You don't have permission to view this dispute.",
            }));
            return;
          }
          if (res.status === 404) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: 'Dispute not found.',
            }));
            return;
          }
          throw new Error(`Failed to load dispute: ${res.status}`);
        }
        const json = await res.json();
        const dispute = (json.data ?? json) as DisputeCaseDTO;

        // Extract role info from response metadata or headers
        setUserRole(json._role ?? 'RESIDENT');
        setUserId(json._userId ?? '');

        // Fetch events - use dispute events from the response or a separate endpoint
        let events: DisputeEventDTO[] = [];
        try {
          const evRes = await fetch(`/api/disputes/${id}?include=events`);
          if (evRes.ok) {
            const evJson = await evRes.json();
            const data = evJson.data ?? evJson;
            events = Array.isArray(data.events) ? data.events : Array.isArray(data) ? data : [];
          }
        } catch {
          // events are optional
        }

        setState({ dispute, events, loading: false, error: null });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load dispute. Please try again.',
        }));
      }
    }

    if (id) {
      fetchDispute();
    }
  }, [id]);

  if (!isReady) {
    return LoadingComponent;
  }

  if (state.error) {
    return (
      <ErrorBoundary>
        <PageLayout background="white">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Dispute Unavailable</h3>
              <p className="text-sm text-amber-700">{state.error}</p>
            </div>
          </div>
        </PageLayout>
      </ErrorBoundary>
    );
  }

  if (!state.dispute) {
    return LoadingComponent;
  }

  const dispute = state.dispute;

  return (
    <ErrorBoundary>
      <PageLayout background="white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Breadcrumbs items={BREADCRUMBS} />

          {/* Top Section — Title + Badges + Description */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{dispute.title}</h1>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-sm font-mono text-gray-500">{dispute.referenceNumber}</span>
              <DisputeStatusBadge status={dispute.status} />
              <DisputeCategoryBadge category={dispute.category} />
              <SeverityIndicator severity={dispute.severity} />
            </div>
            {dispute.description && (
              <p className="text-sm text-gray-600 max-w-3xl">{dispute.description}</p>
            )}
            {dispute.desiredOutcome && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-xs font-medium text-gray-500 block mb-1">
                  Desired Outcome
                </span>
                <p className="text-sm text-gray-700">{dispute.desiredOutcome}</p>
              </div>
            )}
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Timeline + Evidence (placeholder for Task 3) */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Timeline</h2>
                <DisputeTimeline events={state.events} />
              </div>

              {/* Evidence grid */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Evidence
                </h3>
                <EvidencePreviewGrid disputeId={dispute.id} userId={userId} />
              </div>
            </div>

            {/* Right Column — AI + Timer + Actions + Thread */}
            <div className="lg:col-span-2 space-y-5">
              <AIFrivolityCheckPanel disputeId={dispute.id} description={dispute.description} />

              <CoolingOffTimer
                coolingOffEndsAt={dispute.coolingOffEndsAt}
                status={dispute.status}
              />

              <DisputeActionsBar dispute={dispute} userRole={userRole} userId={userId} />

              <MediationThread disputeId={dispute.id} userRole={userRole} userId={userId} />
            </div>
          </div>
        </div>
      </PageLayout>
    </ErrorBoundary>
  );
}
