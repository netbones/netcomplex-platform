'use client';

import { useMemo, useState } from 'react';
import { ModalOverlay } from '@shared/ui';
import type { BillingTier } from './types';

interface SubscribeResult {
  subscriptionId: string;
  transactionId: string | null;
  status: string;
  paymentUrl: string | null;
  reference: string | null;
  gatewayStatus: 'ready' | 'configuration_required' | 'degraded' | 'not_required';
  message: string;
}

interface PaymentSetupModalProps {
  tiers: BillingTier[];
  verificationStatus: 'UNVERIFIED' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';
  gatewayConfiguration: {
    paystackConfigured: boolean;
    paypalConfigured: boolean;
  };
  onClose: () => void;
  onSubscribed: () => void;
}

async function submitSubscription(input: {
  tierId: string;
  paymentGateway: 'PAYSTACK' | 'PAYPAL';
  callbackUrl?: string;
}): Promise<SubscribeResult> {
  const response = await fetch('/api/providers/billing/subscribe', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error?.message ?? body?.message ?? 'Failed to initialize provider billing.'
    );
  }

  return (body?.data ?? body) as SubscribeResult;
}

export function PaymentSetupModal({
  tiers,
  verificationStatus,
  gatewayConfiguration,
  onClose,
  onSubscribed,
}: PaymentSetupModalProps) {
  const allowedTiers = useMemo(() => tiers.filter(tier => tier.allowedForProvider), [tiers]);
  const [tierId, setTierId] = useState(allowedTiers[0]?.id ?? '');
  const [paymentGateway, setPaymentGateway] = useState<'PAYSTACK' | 'PAYPAL'>('PAYSTACK');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubscribeResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const nextResult = await submitSubscription({
        tierId,
        paymentGateway,
        callbackUrl: window.location.href,
      });
      setResult(nextResult);
      onSubscribed();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to initialize billing.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Set up provider billing</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose an eligible subscription tier and payment gateway for this provider account.
          </p>
        </div>

        {verificationStatus === 'SUSPENDED' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Suspended providers cannot start or change paid subscriptions until the account is
            reinstated.
          </div>
        ) : null}

        {allowedTiers.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No subscription tiers are currently available for this provider verification status.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Subscription tier
              </label>
              <div className="space-y-2">
                {allowedTiers.map(tier => (
                  <label
                    key={tier.id}
                    className={`block cursor-pointer rounded-xl border p-3 transition ${
                      tierId === tier.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tierId"
                      value={tier.id}
                      checked={tierId === tier.id}
                      onChange={() => setTierId(tier.id)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-gray-900">{tier.name}</div>
                        <div className="mt-1 text-sm text-gray-500">{tier.description}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          Platform fee {tier.platformFeePercent}%
                          {tier.maxListings !== null
                            ? ` · ${tier.maxListings} listings max`
                            : ' · unlimited listings'}
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold text-gray-900">
                        {tier.formattedPrice}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment gateway
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentGateway('PAYSTACK')}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    paymentGateway === 'PAYSTACK'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <div className="font-medium">Paystack</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {gatewayConfiguration.paystackConfigured
                      ? 'Configured for live/sandbox initialization'
                      : 'Not configured here — billing will stay pending until gateway setup is completed'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentGateway('PAYPAL')}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    paymentGateway === 'PAYPAL'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <div className="font-medium">PayPal</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {gatewayConfiguration.paypalConfigured
                      ? 'Configured for live/sandbox initialization'
                      : 'Not configured here — billing will stay pending until gateway setup is completed'}
                  </div>
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {result ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="font-medium">{result.message}</div>
                {result.reference ? (
                  <div className="mt-1 text-xs">Reference: {result.reference}</div>
                ) : null}
                {result.paymentUrl ? (
                  <a
                    href={result.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Continue to payment
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || verificationStatus === 'SUSPENDED' || !tierId}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isSubmitting ? 'Starting billing…' : 'Start subscription'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
}
