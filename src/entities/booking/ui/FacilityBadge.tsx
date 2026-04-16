'use client';

import type { Facility } from '../model/types';
import { FACILITY_LABELS } from '../model/constants';

interface FacilityBadgeProps {
  facility: Facility | string;
}

export function FacilityBadge({ facility }: FacilityBadgeProps) {
  const label = FACILITY_LABELS[facility] || facility;

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-soralia-primary/10 text-soralia-primary">
      {label}
    </span>
  );
}
