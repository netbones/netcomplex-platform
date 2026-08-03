'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/shared/api/http-client';
import type { DWalletSummary, ConsentState, TransactionItem } from './types';
import type { ConsentInput, PayoutRequestInput } from '../schema';

async function fetchWallet(): Promise<DWalletSummary> {
  const { data } = await apiGet<DWalletSummary>('/api/v1/tenant/dwallet');
  return data;
}

async function fetchConsents(): Promise<ConsentState[]> {
  const { data } = await apiGet<ConsentState[]>('/api/v1/tenant/dwallet/consents');
  return data;
}

async function fetchTransactions(): Promise<TransactionItem[]> {
  const { data } = await apiGet<TransactionItem[]>('/api/v1/tenant/dwallet/transactions');
  return data;
}

async function updateConsent(streamKey: string, input: ConsentInput): Promise<void> {
  await apiPost(`/api/v1/tenant/dwallet/consents/${streamKey}`, input);
}

async function requestPayout(input: PayoutRequestInput): Promise<void> {
  await apiPost('/api/v1/tenant/dwallet/payout', input);
}

export function useWallet(tenantId?: string) {
  const queryClient = useQueryClient();
  // Tenant-namespaced key scope. When `tenantId` is supplied the cache is
  // partitioned per-tenant (ADVISORY-037 §Query Keys). When omitted (the
  // common case today — server-side `withTenant()` scopes `/api/v1/tenant/dwallet`)
  // we fall back to a sentinel so the cache remains isolated by tenantId
  // slot within the global space, even if the slot itself is shared.
  // Threading tenantId into callers is tracked in bd-y9v0 / bd-cqs3.
  const tenantKey = tenantId ?? '__current__';

  const walletQuery = useQuery({
    queryKey: ['dwallet', tenantKey, 'summary'],
    queryFn: fetchWallet,
    // Wallet balance must never be cached (ADVISORY-037 §Wallet,
    // Reality Audit Never-Cache Compliance). 0 = always fetch fresh
    // when the component is mounted, matching the server's uncached path.
    staleTime: 0,
  });

  const consentsQuery = useQuery({
    queryKey: ['dwallet', tenantKey, 'consents'],
    queryFn: fetchConsents,
    staleTime: 60_000,
  });

  const transactionsQuery = useQuery({
    queryKey: ['dwallet', tenantKey, 'transactions'],
    queryFn: fetchTransactions,
    staleTime: 120_000,
  });

  const consentMutation = useMutation({
    mutationFn: ({ streamKey, ...input }: { streamKey: string } & ConsentInput) =>
      updateConsent(streamKey, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dwallet'] });
    },
  });

  const payoutMutation = useMutation({
    mutationFn: requestPayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dwallet'] });
    },
  });

  return {
    wallet: walletQuery.data ?? null,
    consents: consentsQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    isLoading: walletQuery.isLoading || consentsQuery.isLoading,
    error: walletQuery.error || consentsQuery.error,
    updateConsent: consentMutation.mutate,
    isUpdatingConsent: consentMutation.isPending,
    requestPayout: payoutMutation.mutate,
    isRequestingPayout: payoutMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['dwallet'] }),
  };
}
