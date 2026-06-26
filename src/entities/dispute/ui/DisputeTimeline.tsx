'use client';

import type { DisputeEventDTO, DisputeEventType, DisputeStatus } from '../model/types';
import { EVENT_TYPE_LABELS } from '../model/constants';

interface DisputeTimelineProps {
  events: DisputeEventDTO[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function eventDotColor(eventType: DisputeEventType): string {
  switch (eventType) {
    case 'CREATED':
    case 'SUBMITTED':
      return 'bg-slate-400';
    case 'ASSIGNED':
    case 'MEDIATION_OFFERED':
      return 'bg-blue-400';
    case 'MEDIATION_ACCEPTED':
      return 'bg-indigo-400';
    case 'MEDIATION_DECLINED':
      return 'bg-amber-400';
    case 'MEDIATION_CONCLUDED':
      return 'bg-emerald-400';
    case 'RULING_ISSUED':
      return 'bg-amber-500';
    case 'RESOLVED':
      return 'bg-green-500';
    case 'WITHDRAWN':
      return 'bg-zinc-400';
    case 'ESCALATED_CSOS':
    case 'CSOS_CLOSED':
      return 'bg-red-400';
    case 'NOTE_ADDED':
    case 'EVIDENCE_ADDED':
    case 'STATUS_CHANGED':
      return 'bg-gray-400';
    default:
      return 'bg-gray-300';
  }
}

export function DisputeTimeline({ events }: DisputeTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-500">No events recorded yet.</p>
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="relative pl-6 space-y-0" role="list" aria-label="Dispute event timeline">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200" aria-hidden="true" />

      {sorted.map((event, idx) => {
        const isStatusChange =
          event.eventType === 'STATUS_CHANGED' && event.fromStatus && event.toStatus;

        return (
          <div key={event.id} className="relative pb-4 last:pb-0" role="listitem">
            {/* Dot */}
            <div
              className={`absolute left-[-0.75rem] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${eventDotColor(event.eventType)}`}
              aria-hidden="true"
            />

            {/* Content */}
            <div className="ml-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-600">
                  {EVENT_TYPE_LABELS[event.eventType]}
                </span>
                {isStatusChange && (
                  <span className="text-xs text-gray-400">
                    {event.fromStatus?.replace(/_/g, ' ')} → {event.toStatus?.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 block mt-0.5">
                {formatDateTime(event.createdAt)}
              </span>
              {event.note && (
                <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-md p-2 border border-gray-100">
                  {event.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
