import type { AdminStats, PayoutRequestItem, BatchRecord, StreamConfig } from '../../model/types';
import type { StreamConfigInput, StreamUpdateInput } from '../../schema';

async function unwrapEnvelope<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch('/api/admin/dwallet/stats');
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return unwrapEnvelope<AdminStats>(res);
}

export async function fetchPayouts(): Promise<PayoutRequestItem[]> {
  const res = await fetch('/api/admin/dwallet/payouts');
  if (!res.ok) throw new Error('Failed to fetch payouts');
  return unwrapEnvelope<PayoutRequestItem[]>(res);
}

export async function fetchBatches(): Promise<BatchRecord[]> {
  const res = await fetch('/api/admin/dwallet/batches');
  if (!res.ok) throw new Error('Failed to fetch batches');
  return unwrapEnvelope<BatchRecord[]>(res);
}

export async function fetchStreams(): Promise<StreamConfig[]> {
  const res = await fetch('/api/admin/dwallet/streams');
  if (!res.ok) throw new Error('Failed to fetch streams');
  return unwrapEnvelope<StreamConfig[]>(res);
}

export async function createStream(data: StreamConfigInput): Promise<StreamConfig> {
  const res = await fetch('/api/admin/dwallet/streams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create stream');
  return unwrapEnvelope<StreamConfig>(res);
}

export async function updateStream(id: string, data: StreamUpdateInput): Promise<StreamConfig> {
  const res = await fetch(`/api/admin/dwallet/streams/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update stream');
  return unwrapEnvelope<StreamConfig>(res);
}

export async function patchPayoutStatus(
  payoutId: string,
  status: 'COMPLETED' | 'REJECTED',
  notes?: string
): Promise<void> {
  const res = await fetch(`/api/admin/dwallet/payouts/${payoutId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(notes ? { notes } : {}) }),
  });
  if (!res.ok) throw new Error(`Failed to ${status.toLowerCase()} payout`);
}
