'use client';

import { Badge } from '@shared/ui/badge';
import type { Facility } from '../model/types';
import { FACILITY_LABELS } from '../model/constants';

interface FacilityBadgeProps {
  facility: Facility | string;
}

export function FacilityBadge({ facility }: FacilityBadgeProps) {
  const label = FACILITY_LABELS[facility] || facility;

  return (
    <Badge className="border-0 font-medium bg-soralia-primary/10 text-soralia-primary">
      {label}
    </Badge>
  );
}
