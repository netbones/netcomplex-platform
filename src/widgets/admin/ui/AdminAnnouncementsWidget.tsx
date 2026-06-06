'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@shared/ui';
import { logError } from '@shared/lib';
import {
  PRIORITY_TAXONOMY,
  type AnnouncementPriority,
} from '@features/announcements';

interface AdminAnnouncementItem {
  id: string;
  title: string;
  priority: AnnouncementPriority;
  targetFilter: string;
  targetRoles: string[];
  createdAt: string;
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
  if (!targetRoles || targetRoles.length === 0) return filterLabel;
  const roleLabels = targetRoles.map(r => ROLE_LABELS[r] || r).join(', ');
  return `${filterLabel} \u2192 ${roleLabels}`;
}

export function AdminAnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const res = await fetch('/api/announcements?limit=5');
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        logError(
          { component: 'AdminAnnouncementsWidget', operation: 'fetch' },
          'Failed to fetch announcements',
          err
        );
        setError('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetch('/api/announcements?limit=5')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.json();
      })
      .then(data => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(err => {
        logError(
          { component: 'AdminAnnouncementsWidget', operation: 'retry' },
          'Failed to retry fetch announcements',
          err
        );
        setError('Failed to load announcements');
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4">
          <i className="fas fa-exclamation-circle text-2xl text-red-500 mb-2"></i>
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  if (announcements.length === 0) {
    return (
      <ErrorBoundary>
        <div className="text-center py-6">
          <i className="fas fa-bullhorn text-3xl text-gray-400 mb-3"></i>
          <p className="text-sm text-gray-600 mb-3">No announcements yet</p>
          <a
            href="/admin/announcements"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <i className="fas fa-plus"></i>
            Create Announcement
          </a>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <ul className="space-y-3">
          {announcements.map(announcement => {
            const tax = PRIORITY_TAXONOMY[announcement.priority] || PRIORITY_TAXONOMY.normal;
            return (
              <li
                key={announcement.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <i className="fas fa-bullhorn text-indigo-500"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {announcement.title}
                    </p>
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap ${tax.color}`}
                    >
                      {tax.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>
                      {formatTargetSummary(announcement.targetFilter, announcement.targetRoles)}
                    </span>
                    <span>
                      {new Date(announcement.createdAt).toLocaleDateString('en-ZA', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <a
                  href={`/admin/announcements`}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex-shrink-0"
                >
                  Manage
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 pt-3 border-t border-gray-200">
          <a
            href="/admin/announcements"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View All Announcements &rarr;
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
}
