'use client';

import { CreditCard, Shield, Plus } from 'lucide-react';
import type { TenantPaymentView } from '../model/types';

interface PaymentMethodFormProps {
  payments?: TenantPaymentView[];
}

export function PaymentMethodForm({ payments }: PaymentMethodFormProps) {
  const lastPayment = payments && payments.length > 0 ? payments[0] : null;

  return (
    <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-6 h-6 text-[#4F46E5]" />
        <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
      </div>

      {/* Info card */}
      <div className="rounded-md bg-blue-50 border border-blue-100 p-4 mb-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Secure payment processing</p>
            <p className="text-xs text-blue-600 mt-1">
              Payment methods are managed securely by Paystack and PayPal. Your card details are
              never stored on our servers.
            </p>
          </div>
        </div>
      </div>

      {/* Last used gateway */}
      {lastPayment && (
        <div className="mb-4 p-3 rounded-md border border-gray-100 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Last used: {lastPayment.gateway}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Amount: R{lastPayment.amount.toFixed(2)} —{' '}
            {new Date(lastPayment.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Add payment method — disabled for now */}
      <div className="relative">
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
          title="Available during checkout"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
        <span className="ml-3 text-xs text-gray-400">
          Available during checkout with Paystack or PayPal
        </span>
      </div>
    </div>
  );
}
