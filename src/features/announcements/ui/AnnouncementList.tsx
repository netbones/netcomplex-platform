'use client';

import { PRIORITY_TAXONOMY, type AnnouncementPriority } from '../model/priority-taxonomy';
import type { AnnouncementWithResource } from '../model/types';

interface AnnouncementListProps {
  announcements: AnnouncementWithResource[];
  loading: boolean;
  error: string | null;
  onEdit: (announcement: AnnouncementWithResource) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
}

const TARGET_FILTER_LABELS: Record<string, string> = {
  ALL: 'All Residents',
  OWNERS_ONLY: 'Owners Only',
  RENTERS_ONLY: 'Renters Only',
};

const ROLE_LABELS: Record<string, string> = {
  RESIDENT: 'Resident',
  GROUP_ADMIN: 'Group Admin',
  COMMITTEE: 'Committee',
  BOARD: 'Board',
  ADMIN: 'Admin',
  AGENT: 'Agent',
  MANAGER: 'Manager',
  ASSOCIATE: 'Associate',
};

function formatTargetSummary(targetFilter: string, targetRoles: string[]): string {
  const filterLabel = TARGET_FILTER_LABELS[targetFilter] || targetFilter;
  if (!targetRoles || targetRoles.length === 0) {
    return filterLabel;
  }
  const roleLabels = targetRoles.map(r => ROLE_LABELS[r] || r).join(', ');
  return `${filterLabel} \u2192 ${roleLabels}`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AnnouncementList({
  announcements,
  loading,
  error,
  onEdit,
  onDelete,
  onRetry,
}: AnnouncementListProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-exclamation-circle text-2xl text-red-500 mb-2"></i>
        <p className="text-sm text-gray-600 mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-bullhorn text-3xl text-gray-400 mb-3"></i>
        <p className="text-sm text-gray-600">No announcements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {announcements.map(announcement => {
        const priority = announcement.priority as AnnouncementPriority;
        const tax = PRIORITY_TAXONOMY[priority] || PRIORITY_TAXONOMY.normal;

        return (
          <div
            key={announcement.id}
            id={`announcement-${announcement.id}`}
            className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${tax.borderColor}`}
          >
            {/* Priority badge */}
            <span
              className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${tax.color}`}
            >
              {tax.label}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{announcement.title}</p>
                {announcement.resourceId && (
                  <span className="flex-shrink-0 text-gray-400" title="Has attached document">
                    <i className="fas fa-paperclip text-xs"></i>
                  </span>
                )}
                {announcement.resource?.title && (
                  <span className="text-xs text-gray-500 truncate">
                    {announcement.resource.title}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>
                  {formatTargetSummary(announcement.targetFilter, announcement.targetRoles)}
                </span>
                <span>{formatDate(announcement.createdAt)}</span>
                {announcement.expiresAt && (
                  <span className="text-amber-600">
                    Expires {formatDate(announcement.expiresAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onEdit(announcement)}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(announcement.id)}
                className="text-red-600 hover:text-red-800 text-xs font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
