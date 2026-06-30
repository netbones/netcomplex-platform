'use client';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { PayoutRequestItem } from '../../model/types';
import { AdminEmptyState } from './shared';
import type { TxFn } from './shared';

interface PayoutsTableProps {
  payouts: PayoutRequestItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isActioning: boolean;
  actioningId: string | null;
  tx: TxFn;
}

export function PayoutsTable({
  payouts,
  onApprove,
  onReject,
  isActioning,
  actioningId: _actioningId,
  tx,
}: PayoutsTableProps) {
  void _actioningId;
  if (payouts.length === 0) {
    return <AdminEmptyState message={tx('dwalletAdmin.payouts.empty', 'No pending payouts')} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              {tx('dwalletAdmin.payouts.resident', 'Resident')}
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              {tx('dwalletAdmin.payouts.amount', 'Amount')}
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              {tx('dwalletAdmin.payouts.dateRequested', 'Date Requested')}
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
              {tx('dwalletAdmin.payouts.actions', 'Actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {payouts.map(payout => (
            <tr key={payout.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 px-3 text-slate-700">{payout.id.slice(0, 8)}</td>
              <td className="py-2 px-3 text-indigo-600 font-medium">
                R {Number(payout.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2 px-3 text-slate-500">
                {payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-ZA') : '—'}
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onApprove(payout.id)}
                    disabled={isActioning}
                    aria-label={tx('dwalletAdmin.payouts.approveLabel', 'Approve payout')}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {tx('dwalletAdmin.payouts.approve', 'Approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(payout.id)}
                    disabled={isActioning}
                    aria-label={tx('dwalletAdmin.payouts.rejectLabel', 'Reject payout')}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {tx('dwalletAdmin.payouts.reject', 'Reject')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
