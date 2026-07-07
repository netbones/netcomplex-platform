'use client';

import Link from 'next/link';
import { useSetupProgress } from '@/features/setup/model/useSetupProgress';
import { LoadingSkeleton } from '@shared/ui';

interface SetupProgressCardProps {
  tenantId: string;
}

/**
 * Compact dashboard card showing setup completion progress.
 *
 * Renders in the HomeLayer urgency zone when setup is incomplete
 * (completionPercent < 100). Returns null when fully complete
 * or when no setup data exists.
 */
export default function SetupProgressCard({ tenantId }: SetupProgressCardProps) {
  const { setup, isLoading } = useSetupProgress(tenantId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-soralia-primary/20">
        <LoadingSkeleton height="h-5" className="w-2/3 mb-2" />
        <LoadingSkeleton height="h-2.5" className="w-full mb-3" />
        <LoadingSkeleton height="h-8" className="w-36" />
      </div>
    );
  }

  // Hide when setup doesn't exist or is fully complete
  if (!setup || setup.completionPercent >= 100) {
    return null;
  }

  const percent = Math.min(100, Math.max(0, setup.completionPercent));

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-soralia-primary/20">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Community Setup</h3>
        <span className="text-sm font-bold text-soralia-primary">{percent}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className="bg-soralia-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Setup ${percent}% complete`}
        />
      </div>

      <Link
        href="/setup"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-soralia-primary hover:text-indigo-700 transition-colors"
      >
        Continue Setup
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
