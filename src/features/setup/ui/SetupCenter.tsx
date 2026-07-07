'use client';

import { useTranslation } from 'react-i18next';
import SetupSection from './SetupSection';
import { useSetupProgress } from '../model/useSetupProgress';
import { SECTIONS, type SetupMission } from '@/entities/setup';

export interface SetupData {
  id: string;
  tenantId: string;
  completionPercent: number;
  completedSections: string[];
  launchedAt: string | null;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  missions: Record<string, SetupMission[]>;
}

interface SetupCenterProps {
  tenantId: string;
  initialData: SetupData | null;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-200 rounded w-72" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-36" />
        <div className="h-3 bg-gray-200 rounded-full w-full" />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-5 bg-gray-200 rounded w-32" />
        </div>
      ))}
    </div>
  );
}

export default function SetupCenter({ tenantId, initialData }: SetupCenterProps) {
  const { t } = useTranslation();
  const { setup, isLoading, error, refreshProgress, updateMission, updateSetting } =
    useSetupProgress(tenantId, initialData ?? undefined);

  // Loading state — only show skeleton when no initial data and hook is loading
  if (!initialData && isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error && !initialData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-red-700 mb-2">
          {t('setup.errorTitle', 'Unable to load setup')}
        </h1>
        <p className="text-gray-500 max-w-md mb-4">
          {error.message || t('setup.errorHint', 'An unexpected error occurred.')}
        </p>
        <button
          onClick={() => refreshProgress()}
          className="px-4 py-2 bg-soralia-primary text-white rounded-lg hover:opacity-90 transition"
        >
          {t('setup.retry', 'Try Again')}
        </button>
      </div>
    );
  }

  // Use hook data when available, fall back to initial data
  const data = setup ?? initialData;

  // Empty state — no TenantSetup record exists yet
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="text-6xl mb-4">🏗️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('setup.title', 'Community Setup')}
        </h1>
        <p className="text-gray-500 max-w-md">
          {t(
            'setup.emptyHint',
            'Your setup data is being prepared. This may take a moment after account creation.'
          )}
        </p>
      </div>
    );
  }

  const percent = Math.min(100, Math.max(0, data.completionPercent));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('setup.title', 'Community Setup')}</h1>
        <p className="text-gray-500 mt-1">
          {t('setup.subtitle', 'Complete missions to launch and grow your community.')}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t('setup.progress', '{{percent}}% Complete', { percent })}
          </span>
          <span className="text-xs text-gray-400">
            {data.completedSections.length} / {SECTIONS.length}{' '}
            {t('setup.sectionsComplete', 'sections completed')}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-soralia-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map(sectionDef => {
          const missions = (data.missions[sectionDef.key] ?? []) as SetupMission[];
          const completed = missions.filter(m => m.isCompleted).length;

          return (
            <SetupSection
              key={sectionDef.key}
              section={sectionDef.key}
              title={t(sectionDef.labelKey, sectionDef.key)}
              isRequired={sectionDef.isRequired}
              missions={missions}
              completedCount={completed}
              totalCount={missions.length}
            />
          );
        })}
      </div>

      {/* Expose mutation functions for consumer debugging — not rendered directly */}
      <span data-testid="setup-mutations" hidden>
        {JSON.stringify({
          hasUpdateMission: typeof updateMission === 'function',
          hasUpdateSetting: typeof updateSetting === 'function',
          hasRefreshProgress: typeof refreshProgress === 'function',
        })}
      </span>
    </div>
  );
}
