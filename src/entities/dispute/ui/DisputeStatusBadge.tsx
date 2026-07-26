'use client';

import { Badge } from '@shared/ui/badge';
import type { DisputeStatus } from '../model/types';
import { STATUS_LABELS } from '../model/constants';

interface DisputeStatusBadgeProps {
  status: DisputeStatus;
  className?: string;
}

const statusColorMap: Record<DisputeStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-slate-200 text-slate-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  MEDIATION_OFFERED: 'bg-indigo-100 text-indigo-700',
  MEDIATION_ACTIVE: 'bg-indigo-200 text-indigo-800',
  MEDIATED_RESOLVED: 'bg-emerald-100 text-emerald-700',
  FORMAL_RULING: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  WITHDRAWN: 'bg-zinc-100 text-zinc-600',
  ESCALATED_CSOS: 'bg-red-100 text-red-700',
  CSOS_CLOSED: 'bg-rose-100 text-rose-700',
};

export function DisputeStatusBadge({ status, className = '' }: DisputeStatusBadgeProps) {
  const colorClasses = statusColorMap[status] ?? 'bg-gray-100 text-gray-700';
  const label = STATUS_LABELS[status];

  return <Badge className={`border-0 font-medium ${colorClasses} ${className}`}>{label}</Badge>;
}
