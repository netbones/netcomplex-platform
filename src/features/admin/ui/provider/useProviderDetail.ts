'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchApi, sendJson } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';

export type ProviderTab =
  | 'profile'
  | 'verification'
  | 'legal'
  | 'reputation'
  | 'payments'
  | 'actions';
export const PROVIDER_TABS: ProviderTab[] = [
  'profile',
  'verification',
  'legal',
  'reputation',
  'payments',
  'actions',
];

export interface DdItemState {
  key: string;
  status: string;
  notes?: string;
}

export function useProviderDetail(providerId: string) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProviderTab>('profile');
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [reputationReason, setReputationReason] = useState('');
  const [reputationDelta, setReputationDelta] = useState('0');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [ddItems, setDdItems] = useState<DdItemState[]>([]);
  const [vrNotes, setVrNotes] = useState('');
  const [ddSaving, setDdSaving] = useState(false);

  const queryKey = useMemo(() => ['admin', 'provider-detail', providerId], [providerId]);
  const providerQuery = useQuery<ProviderDetailResponse>({
    queryKey,
    queryFn: () => fetchApi<ProviderDetailResponse>(`/api/admin/providers/${providerId}`),
    staleTime: 30_000,
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      url: string;
      method: 'POST' | 'PATCH';
      body: Record<string, unknown>;
    }) =>
      sendJson<unknown>(payload.url, {
        method: payload.method,
        body: JSON.stringify(payload.body),
      }),
    onSuccess: async () => {
      setActionMessage('Provider moderation change saved.');
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
    },
  });

  const data = providerQuery.data;

  if (data && ddItems.length === 0 && data.dueDiligence.items.length > 0) {
    setDdItems(
      data.dueDiligence.items.map(i => ({ key: i.key, status: i.status, notes: i.notes ?? '' }))
    );
    setVrNotes(data.verification.notes ?? '');
  }

  return {
    data,
    isLoading: providerQuery.isLoading,
    activeTab,
    setActiveTab,
    rejectReason,
    setRejectReason,
    suspendReason,
    setSuspendReason,
    reputationReason,
    setReputationReason,
    reputationDelta,
    setReputationDelta,
    actionMessage,
    setActionMessage,
    ddItems,
    setDdItems,
    vrNotes,
    setVrNotes,
    ddSaving,
    setDdSaving,
    actionMutation,
  };
}
