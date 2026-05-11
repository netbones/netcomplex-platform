'use client';

import { MaintenancePriority } from '../model/types';

interface PriorityBadgeProps {
  priority: MaintenancePriority;
  size?: 'sm' | 'md';
}

const priorityConfig: Record<MaintenancePriority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-green-100 text-green-800' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  EMERGENCY: { label: 'Emergency', color: 'bg-red-100 text-red-800' },
};

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.color}`}
    >
      {config.label}
    </span>
  );
}
