'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DWalletSummary, ConsentState, TransactionItem } from './types';
import type { ConsentInput, PayoutRequestInput } from '../schema';

async function fetchEnvelope<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const body = await res.json();
  return (body.success ? body.data : body) as T;
}

async function fetchWallet(): Promise<DWalletSummary> {
  return fetchEnvelope<DWalletSummary>('/api/v1/tenant/dwallet');
}

async function fetchConsents(): Promise<ConsentState[]> {
  return fetchEnvelope<ConsentState[]>('/api/v1/tenant/dwallet/consents');
}

async function fetchTransactions(): Promise<TransactionItem[]> {
  return fetchEnvelope<TransactionItem[]>('/api/v1/tenant/dwallet/transactions');
}

async function updateConsent(streamKey: string, input: ConsentInput): Promise<void> {
  const res = await fetch(`/api/v1/tenant/dwallet/consents/${streamKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update consent');
}

async function requestPayout(input: PayoutRequestInput): Promise<void> {
  const res = await fetch('/api/v1/tenant/dwallet/payout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Payout request failed' }));
    throw new Error(err.message || 'Payout request failed');
  }
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
