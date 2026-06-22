'use client';

import { useState } from 'react';

import type { TransactionItem } from './types';
import { formatCurrency } from './adminApi';

interface RefundModalProps {
  transaction: TransactionItem | null;
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onSubmit: (payload: { amount?: number; reason: string }) => Promise<void>;
}

export function RefundModal({ transaction, open, pending = false, onClose, onSubmit }: RefundModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  if (!open || !transaction) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Review refund request</h2>
            <p className="mt-1 text-sm text-gray-500">
              This phase validates refund eligibility and logs manual reconciliation for gateway follow-up.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="font-medium text-gray-900">{transaction.providerCompanyName ?? 'Provider transaction'}</div>
          <div className="mt-1">Gateway: {transaction.gateway}</div>
          <div className="mt-1">Maximum refundable: {formatCurrency(transaction.refundableAmount, transaction.currency)}</div>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={async event => {
            event.preventDefault();
            await onSubmit({
              amount: amount.trim() ? Number.parseFloat(amount) : undefined,
              reason,
            });
            setAmount('');
            setReason('');
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Refund amount (optional)</label>
            <input
              value={amount}
              onChange={event => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder={transaction.refundableAmount.toFixed(2)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              required
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Describe the dispute or refund rationale"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-soralia-primary px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Submitting…' : 'Log refund review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
