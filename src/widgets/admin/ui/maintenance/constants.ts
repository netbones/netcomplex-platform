import type { HistoryEntry } from './types';

export const statusOptions = [
  'SUBMITTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
] as const;

export const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const;

export const priorityColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

export const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  PENDING_PARTS: 'bg-orange-100 text-orange-800',
  SCHEDULED: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export const statusDotColors: Record<string, string> = {
  SUBMITTED: 'bg-yellow-500',
  ASSIGNED: 'bg-purple-500',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_PARTS: 'bg-orange-500',
  SCHEDULED: 'bg-indigo-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-500',
};

export const workflowTransitions: Record<string, string[]> = {
  SUBMITTED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['PENDING_PARTS', 'COMPLETED', 'CANCELLED'],
  PENDING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getDaysOld(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function friendlyStatus(status: string): string {
  return status.replace('_', ' ');
}

export function getStatusTimeline(history: HistoryEntry[]): HistoryEntry[] {
  return history
    .filter(entry => entry.field === 'status')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
