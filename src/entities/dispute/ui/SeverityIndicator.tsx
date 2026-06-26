'use client';

import type { DisputeSeverity } from '../model/types';
import { SEVERITY_LABELS } from '../model/constants';

interface SeverityIndicatorProps {
  severity: DisputeSeverity;
  className?: string;
}

const severitySegmentColors: Record<DisputeSeverity, string> = {
  MINOR: 'bg-green-400',
  MODERATE: 'bg-amber-400',
  SERIOUS: 'bg-orange-500',
  URGENT: 'bg-red-500',
};

const severityOrder: DisputeSeverity[] = ['MINOR', 'MODERATE', 'SERIOUS', 'URGENT'];

export function SeverityIndicator({ severity, className = '' }: SeverityIndicatorProps) {
  const label = SEVERITY_LABELS[severity];
  const activeIndex = severityOrder.indexOf(severity);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div data-severity-bar className="flex h-2 w-20 gap-0.5 rounded-full overflow-hidden">
        {severityOrder.map((sev, idx) => {
          const isActive = idx <= activeIndex;
          const colorClass = isActive ? severitySegmentColors[sev] : 'bg-gray-200';

          return <div key={sev} className={`flex-1 transition-colors ${colorClass}`} />;
        })}
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
  );
}
