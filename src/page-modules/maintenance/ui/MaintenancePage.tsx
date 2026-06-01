'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { MaintenanceForm } from '@features/maintenance';
import {
  MaintenanceRequest,
  MaintenanceCard,
  StatusBadge,
  PriorityBadge,
} from '@entities/maintenance';
import { usePageLoading } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Wrench,
  Users,
  Building2,
  CalendarDays,
} from 'lucide-react';

const log = createComponentLogger('maintenance-page');

/** Status timeline step labels and colors for the 7-status lifecycle */
const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

const STATUS_STEP_INDEX: Record<string, number> = {
  SUBMITTED: 0,
  ASSIGNED: 1,
  SCHEDULED: 2,
  IN_PROGRESS: 3,
  PENDING_PARTS: 3, // Same level as IN_PROGRESS (branch)
  COMPLETED: 4,
  CANCELLED: -1, // Special — not on the timeline
};

function getStatusStepIndex(status: string): number {
  return STATUS_STEP_INDEX[status] ?? 0;
}

// ---------------------------------------------------------------------------
// Expanded card with full details + status timeline
// ---------------------------------------------------------------------------

function ExpandedCard({ request }: { request: MaintenanceRequest }) {
  const stepIndex = getStatusStepIndex(request.status);
  const isCancelled = request.status === 'CANCELLED';
  const isPendingParts = request.status === 'PENDING_PARTS';

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
      {/* Full description */}
      <p className="text-gray-700 text-sm">{request.description}</p>

      {/* Assignment info */}
      {(request.assignedTeam || request.assignedProvider) && (
        <div className="flex flex-col gap-1.5">
          {request.assignedTeam && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="font-medium">Team:</span>
              <span>{request.assignedTeam.name}</span>
              <span className="text-xs text-gray-400">({request.assignedTeam.trade})</span>
            </div>
          )}
          {request.assignedProvider && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-purple-500" />
              <span className="font-medium">Provider:</span>
              <span>{request.assignedProvider.companyName}</span>
              <span className="text-xs text-gray-400">({request.assignedProvider.trade})</span>
            </div>
          )}
        </div>
      )}

      {/* Preferred date/time */}
      {(request.preferredDate || request.preferredTime) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Preferred:</span>
          {request.preferredDate && (
            <span>{new Date(request.preferredDate).toLocaleDateString()}</span>
          )}
          {request.preferredTime && <span>at {request.preferredTime}</span>}
        </div>
      )}

      {/* Status timeline (vertical) */}
      {!isCancelled ? (
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Status Timeline
          </h4>
          <div className="relative pl-4">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200" />

            {STATUS_STEPS.map((step, i) => {
              const isReached = i <= stepIndex;
              const isCurrent = i === stepIndex;
              const isPendingPartsStep = isPendingParts && i === 3;

              return (
                <div key={step.key} className="relative flex items-center gap-3 py-1.5">
                  {/* Dot */}
                  <div
                    className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 ${
                      isCurrent || isPendingPartsStep
                        ? 'bg-indigo-500 border-indigo-500'
                        : isReached
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300'
                    }`}
                  />
                  {/* Label */}
                  <span
                    className={`text-sm ${
                      isCurrent || isPendingPartsStep
                        ? 'font-semibold text-indigo-700'
                        : isReached
                          ? 'text-gray-700'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                    {isPendingPartsStep && ' (Pending Parts)'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
          <span className="font-medium text-gray-600">Cancelled</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MaintenancePage() {
  const { t } = useTranslation(['common', 'maintenance']);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Maintenance', href: '/maintenance' },
    ],
    { additionalLoading: loading }
  );

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance');
      const json = await res.json();
      // API returns { success, data } envelope — unwrap
      setRequests(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
    } catch (error) {
      log.error({}, 'Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // 30-second polling for near-real-time status updates
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchRequests();
    }, 30_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchRequests]);

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.maintenance') }]}
          />
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-soralia-primary">{t('maintenance:title')}</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-soralia-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              {showForm ? t('maintenance:viewMyRequests') : t('maintenance:newRequest')}
            </button>
          </div>

          {showForm ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">{t('maintenance:submitNewRequest')}</h2>
                <MaintenanceForm
                  onSubmit={async () => {
                    setShowForm(false);
                    fetchRequests();
                  }}
                />
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No maintenance requests yet.</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-soralia-primary hover:underline"
              >
                {t('maintenance:submitFirst')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(request => {
                const isExpanded = expandedId === request.id;

                return (
                  <div
                    key={request.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Clickable card header */}
                    <button
                      className="w-full text-left p-4 flex items-start gap-4"
                      onClick={() => setExpandedId(isExpanded ? null : request.id)}
                    >
                      {/* Left: ticket number (prominent) */}
                      <div className="flex-shrink-0 text-right min-w-[100px]">
                        {request.ticketNumber ? (
                          <span className="block text-sm font-mono text-indigo-600 font-semibold">
                            #{request.ticketNumber}
                          </span>
                        ) : (
                          <span className="block text-sm font-mono text-gray-400">#---</span>
                        )}
                        <span className="block text-xs text-gray-400 mt-1">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Center: category + description + assignment */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 capitalize truncate">
                            {request.category.replace('_', ' ')}
                          </h3>
                          <StatusBadge status={request.status} />
                          <PriorityBadge priority={request.priority} />
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {request.description}
                        </p>
                        {(request.assignedTeam || request.assignedProvider) && (
                          <p className="text-xs text-gray-500 mt-1.5">
                            <Wrench className="w-3 h-3 inline mr-1" />
                            Assigned to:{' '}
                            {request.assignedTeam?.name || request.assignedProvider?.companyName}
                          </p>
                        )}
                      </div>

                      {/* Right: expand indicator */}
                      <div className="flex-shrink-0 text-gray-400 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail section */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <ExpandedCard request={request} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Polling indicator */}
          {!showForm && requests.length > 0 && (
            <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-400 justify-center">
              <Clock className="w-3 h-3" />
              <span>Auto-refreshing every 30s</span>
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}
