'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DWalletSummary, ConsentState, TransactionItem } from './types';
import type { ConsentInput, PayoutRequestInput } from '../schema';

async function fetchWallet(): Promise<DWalletSummary> {
  const res = await fetch('/api/v1/tenant/dwallet');
  if (!res.ok) throw new Error('Failed to fetch wallet');
  return res.json();
}

async function fetchConsents(): Promise<ConsentState[]> {
  const res = await fetch('/api/v1/tenant/dwallet/consents');
  if (!res.ok) throw new Error('Failed to fetch consents');
  return res.json();
}

async function fetchTransactions(): Promise<TransactionItem[]> {
  const res = await fetch('/api/v1/tenant/dwallet/transactions');
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
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

export function useWallet() {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ['dwallet', 'summary'],
    queryFn: fetchWallet,
    staleTime: 30_000,
  });

  const consentsQuery = useQuery({
    queryKey: ['dwallet', 'consents'],
    queryFn: fetchConsents,
    staleTime: 60_000,
  });

  const transactionsQuery = useQuery({
    queryKey: ['dwallet', 'transactions'],
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
