'use client';

import { Badge } from '@shared/ui/badge';
import { MaintenanceStatus } from '../model/types';

interface StatusBadgeProps {
  status: MaintenanceStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<MaintenanceStatus, { label: string; color: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
  ASSIGNED: { label: 'Assigned', color: 'bg-purple-100 text-purple-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  PENDING_PARTS: { label: 'Pending Parts', color: 'bg-orange-100 text-orange-800' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <Badge className={`border-0 font-medium ${sizeClasses} ${config.color}`}>{config.label}</Badge>
  );
}
