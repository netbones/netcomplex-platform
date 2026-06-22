'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditProgressWidget } from './CreditProgressWidget';
import { PaymentSetupModal } from './PaymentSetupModal';
import type { BillingResponse, CreditsResponse } from './types';

interface QueryError extends Error {
  status?: number;
}

async function fetchApi<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      body?.error?.message ?? body?.message ?? `Request failed with status ${response.status}`
    ) as QueryError;
    error.status = response.status;
    throw error;
  }

  return (body?.data ?? body) as T;
}

async function cancelSubscription(): Promise<void> {
  const response = await fetch('/api/providers/billing/cancel', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error?.message ?? body?.message ?? 'Failed to cancel provider subscription.'
    );
  }
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CurrencyValue({ amount, currency }: { amount: number; currency: string }) {
  return (
    <>
      {new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}
    </>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-800',
    FAILED: 'bg-rose-100 text-rose-700',
    CANCELLED: 'bg-gray-200 text-gray-700',
    EXPIRED: 'bg-gray-200 text-gray-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {value.toLowerCase()}
    </span>
  );
}

export function BillingDashboard() {
  const queryClient = useQueryClient();
  const [isPaymentSetupOpen, setPaymentSetupOpen] = useState(false);

  const billingQuery = useQuery<BillingResponse, QueryError>({
    queryKey: ['providers', 'billing'],
    queryFn: () => fetchApi<BillingResponse>('/api/providers/billing'),
    staleTime: 60_000,
  });

  const creditsQuery = useQuery<CreditsResponse, QueryError>({
    queryKey: ['providers', 'credits'],
    queryFn: () => fetchApi<CreditsResponse>('/api/providers/credits'),
    staleTime: 60_000,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['providers', 'billing'] }),
        queryClient.invalidateQueries({ queryKey: ['providers', 'credits'] }),
      ]);
    },
  });

  if (billingQuery.isLoading || creditsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-gray-100" />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-72 rounded-2xl bg-gray-100" />
          <div className="h-72 rounded-2xl bg-gray-100" />
          <div className="h-72 rounded-2xl bg-gray-100" />
          <div className="h-72 rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (billingQuery.error || creditsQuery.error || !billingQuery.data || !creditsQuery.data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          Unable to load provider billing right now.{' '}
          {billingQuery.error?.message ?? creditsQuery.error?.message}
        </div>
      </div>
    );
  }

  const billing = billingQuery.data;
  const credits = creditsQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-medium text-indigo-100">Provider billing</div>
            <h1 className="mt-2 text-3xl font-semibold">{billing.companyName}</h1>
            <p className="mt-2 max-w-3xl text-sm text-indigo-100">
              Manage subscriptions, review fee breakdowns, and track how community credits support
              provider verification.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPaymentSetupOpen(true)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Change plan
            </button>
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={!billing.currentSubscription || cancelMutation.isPending}
              className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          </div>
        </div>
      </section>

      {billing.notices.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-medium">Environment notes</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {billing.notices.map(notice => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {cancelMutation.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {cancelMutation.error.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Current subscription</h2>
              <p className="mt-1 text-sm text-gray-500">
                Tier access, billing cadence, and gateway details for the provider account.
              </p>
            </div>
            <StatusBadge value={billing.currentSubscription?.status ?? 'PENDING'} />
          </div>

          {billing.currentSubscription ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Tier</div>
                <div className="mt-2 text-xl font-semibold text-gray-900">
                  {billing.currentSubscription.tierName}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {billing.currentSubscription.formattedPrice}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Next billing date</div>
                <div className="mt-2 text-xl font-semibold text-gray-900">
                  {formatDate(billing.currentSubscription.nextBillingDate)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Gateway {billing.currentSubscription.paymentGateway ?? 'not linked'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Started</div>
                <div className="mt-2 text-xl font-semibold text-gray-900">
                  {formatDate(billing.currentSubscription.startDate)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Ends {formatDate(billing.currentSubscription.endDate)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Verification status</div>
                <div className="mt-2 text-xl font-semibold text-gray-900">
                  {billing.verificationStatus}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Threshold {billing.verification.verificationThreshold} credits
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              No subscription is active yet. Use “Change plan” to initialize provider billing.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Fee summary</h2>
          <p className="mt-1 text-sm text-gray-500">
            Platform fee sharing and processor deductions recorded against completed transactions.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Gross billed</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                <CurrencyValue amount={billing.feeSummary.totalGross} currency="ZAR" />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Net after fees</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                <CurrencyValue amount={billing.feeSummary.totalNet} currency="ZAR" />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Platform fees</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                <CurrencyValue amount={billing.feeSummary.totalPlatformFees} currency="ZAR" />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Processor fees</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                <CurrencyValue amount={billing.feeSummary.totalProcessorFees} currency="ZAR" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Available provider plans</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tier eligibility is determined by the provider verification lifecycle.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {billing.availableTiers.map(tier => (
            <div key={tier.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{tier.name}</div>
                  <div className="mt-1 text-sm text-gray-500">{tier.description}</div>
                </div>
                <StatusBadge value={tier.allowedForProvider ? 'ACTIVE' : 'EXPIRED'} />
              </div>
              <div className="mt-4 text-3xl font-semibold text-gray-900">{tier.formattedPrice}</div>
              <div className="mt-1 text-sm text-gray-500">
                Platform fee {tier.platformFeePercent}%
              </div>
              <div className="mt-4 text-sm text-gray-600">
                {tier.maxListings !== null
                  ? `${tier.maxListings} listings included`
                  : 'Unlimited listings'}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Analytics {(tier.features.analytics as string | undefined) ?? 'standard'}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Promotion{' '}
                {(tier.features.promotion as boolean | undefined) ? 'enabled' : 'not included'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <CreditProgressWidget data={credits} />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Invoices</h2>
          <p className="mt-1 text-sm text-gray-500">
            Completed billing records. Invoice PDF storage is deferred until document storage is
            wired.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Invoice</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billing.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-gray-500">
                      No invoices have been generated yet.
                    </td>
                  </tr>
                ) : (
                  billing.invoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">
                          {invoice.tierName ?? 'Provider tier'}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        <CurrencyValue amount={invoice.total} currency={invoice.currency} />
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge value={invoice.status} />
                      </td>
                      <td className="py-3 text-gray-700">
                        <div>{formatDate(invoice.createdAt)}</div>
                        {invoice.downloadUrl ? (
                          <a
                            href={invoice.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Download invoice
                          </a>
                        ) : (
                          <div className="mt-1 text-xs text-gray-400">PDF storage pending</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Charges & payment history</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pending and completed billing attempts with platform and processor fee visibility.
          </p>
          <div className="mt-5 space-y-3">
            {billing.paymentHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No billing transactions have been recorded yet.
              </div>
            ) : (
              billing.paymentHistory.map(item => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{item.gateway} transaction</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Reference {item.externalRef ?? '—'}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Created {formatDate(item.createdAt)}
                      </div>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div>
                      <div className="text-xs text-gray-500">Gross</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        <CurrencyValue amount={item.amount} currency={item.currency} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Platform fee</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        <CurrencyValue amount={item.platformFee} currency={item.currency} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Processor fee</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        <CurrencyValue amount={item.processorFee} currency={item.currency} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Net</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        <CurrencyValue amount={item.netAmount} currency={item.currency} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {isPaymentSetupOpen ? (
        <PaymentSetupModal
          tiers={billing.availableTiers}
          verificationStatus={billing.verificationStatus}
          gatewayConfiguration={billing.gatewayConfiguration}
          onClose={() => setPaymentSetupOpen(false)}
          onSubscribed={() => {
            void queryClient.invalidateQueries({ queryKey: ['providers', 'billing'] });
            void queryClient.invalidateQueries({ queryKey: ['providers', 'credits'] });
          }}
        />
      ) : null}
    </div>
  );
}
