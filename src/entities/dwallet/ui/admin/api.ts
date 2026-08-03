import { apiGet, apiPost, apiPatch } from '@/shared/api/http-client';
import type { AdminStats, PayoutRequestItem, BatchRecord, StreamConfig } from '../../model/types';
import type { StreamConfigInput, StreamUpdateInput } from '../../schema';

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await apiGet<AdminStats>('/api/admin/dwallet/stats');
  return data;
}

export async function fetchPayouts(): Promise<PayoutRequestItem[]> {
  const { data } = await apiGet<PayoutRequestItem[]>('/api/admin/dwallet/payouts');
  return data;
}

export async function fetchBatches(): Promise<BatchRecord[]> {
  const { data } = await apiGet<BatchRecord[]>('/api/admin/dwallet/batches');
  return data;
}

export async function fetchStreams(): Promise<StreamConfig[]> {
  const { data } = await apiGet<StreamConfig[]>('/api/admin/dwallet/streams');
  return data;
}

export async function createStream(data: StreamConfigInput): Promise<StreamConfig> {
  const { data: stream } = await apiPost<StreamConfig>('/api/admin/dwallet/streams', data);
  return stream;
}

export async function updateStream(id: string, data: StreamUpdateInput): Promise<StreamConfig> {
  const { data: stream } = await apiPatch<StreamConfig>(`/api/admin/dwallet/streams/${id}`, data);
  return stream;
}

export async function patchPayoutStatus(
  payoutId: string,
  status: 'COMPLETED' | 'REJECTED',
  notes?: string
): Promise<void> {
  await apiPatch(`/api/admin/dwallet/payouts/${payoutId}`, {
    status,
    ...(notes ? { notes } : {}),
  });
}
