'use client';

import { useSetupProgress } from '@/features/setup/model/useSetupProgress';
import { LoadingSkeleton } from '@shared/ui';

interface HealthSectionProps {
  tenantId: string;
}

interface HealthRow {
  label: string;
  missionKeys: string[];
  /** Human-readable status suffix when complete, e.g. "Complete", "Configured". */
  doneLabel: string;
  /** Human-readable status suffix when incomplete, e.g. "Not Enabled". */
  pendingLabel: string;
}

const HEALTH_ROWS: HealthRow[] = [
  {
    label: 'Branding',
    missionKeys: ['launch.branding'],
    doneLabel: 'Complete',
    pendingLabel: 'Not Set',
  },
  {
    label: 'Residents',
    missionKeys: ['populate.invite-residents', 'populate.import'],
    doneLabel: 'Configured',
    pendingLabel: 'Not Invited',
  },
  {
    label: 'Maintenance',
    missionKeys: ['configure.maintenance'],
    doneLabel: 'Configured',
    pendingLabel: 'Not Enabled',
  },
  {
    label: 'Bookings',
    missionKeys: ['configure.bookings'],
    doneLabel: 'Configured',
    pendingLabel: 'Not Enabled',
  },
  {
    label: 'Payments',
    missionKeys: ['configure.wallet'],
    doneLabel: 'Configured',
    pendingLabel: 'Not Enabled',
  },
  {
    label: 'AI Assistant',
    missionKeys: [],
    doneLabel: 'Available',
    pendingLabel: 'Available',
  },
  {
    label: 'Achievements',
    missionKeys: ['grow.merits'],
    doneLabel: 'Available',
    pendingLabel: 'Not Enabled',
  },
];

/**
 * Post-launch Community Health dashboard.
 *
 * Shows a readiness breakdown after the tenant has launched.
 * Each row reflects the completion state of related setup missions.
 * Returns null when the tenant hasn't launched yet or no setup data exists.
 */
export default function HealthSection({ tenantId }: HealthSectionProps) {
  const { setup, isLoading } = useSetupProgress(tenantId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <LoadingSkeleton height="h-5" className="w-1/3 mb-4" />
        <LoadingSkeleton lines={7} height="h-5" className="mb-2" />
      </div>
    );
  }

  // Only show after launch
  if (!setup || !setup.launchedAt) {
    return null;
  }

  // Flatten all missions into a lookup map by missionKey
  const missionMap = new Map<string, { isCompleted: boolean }>();
  for (const sectionMissions of Object.values(setup.missions)) {
    for (const m of sectionMissions) {
      missionMap.set(m.missionKey, { isCompleted: m.isCompleted });
    }
  }

  return (
    <section aria-label="Community Health" className="mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Community Health</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Readiness breakdown across platform features
          </p>
        </div>

        {/* Health rows */}
        <ul className="divide-y divide-gray-100">
          {HEALTH_ROWS.map(row => {
            const hasMissions = row.missionKeys.length > 0;
            const allComplete = hasMissions
              ? row.missionKeys.every(k => missionMap.get(k)?.isCompleted)
              : true; // No missions = always "available"

            return (
              <li
                key={row.label}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{row.label}</span>
                <span className="flex items-center gap-1.5">
                  {allComplete ? (
                    <>
                      <svg
                        className="w-4 h-4 text-green-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">{row.doneLabel}</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-gray-300 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                      <span className="text-sm text-gray-500">{row.pendingLabel}</span>
                    </>
                  )}
                </span>
              </li>
            );
          })}

          {/* Overall Readiness */}
          <li className="flex items-center justify-between px-4 py-3 bg-gray-50 font-semibold">
            <span className="text-sm text-gray-900">Overall Readiness</span>
            <span className="text-sm text-soralia-primary">{setup.completionPercent}%</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
