'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CheckoutResult } from '../model/types';

interface CheckoutButtonProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess?: () => void;
}

export function CheckoutButton({ planId, planName, amount, onSuccess }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tenant/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          paymentGateway: 'PAYSTACK',
        }),
      });

      const body = await response.json();

      if (!response.ok || !body.success) {
        const message = body?.error?.message ?? 'Checkout failed. Please try again.';
        setError(message);
        toast.error(message);
        return;
      }

      const result: CheckoutResult = body.data;

      // Free plan — activated immediately
      if (!result.paymentUrl) {
        toast.success('Plan activated!');
        onSuccess?.();
        return;
      }

      // Paid plan — redirect to gateway
      toast.success('Redirecting to payment gateway...');
      window.location.href = result.paymentUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isFree = amount <= 0;

  return (
    <div>
      {loading ? (
        <button
          disabled
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#4F46E5]/70 px-4 py-2.5 text-sm font-medium text-white cursor-wait"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </button>
      ) : error ? (
        <div>
          <button
            type="button"
            onClick={handleCheckout}
            className="w-full rounded-md border-2 border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            Retry Checkout
          </button>
          <p className="mt-1 text-xs text-red-500 text-center">{error}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCheckout}
          className="w-full rounded-md bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors"
        >
          {isFree ? 'Get Started Free' : `Subscribe — R${amount}/mo`}
        </button>
      )}
    </div>
  );
}
