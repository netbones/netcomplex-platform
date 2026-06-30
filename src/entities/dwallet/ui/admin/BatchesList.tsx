'use client';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { BatchRecord } from '../../model/types';
import { AdminEmptyState } from './shared';
import type { TxFn } from './shared';

interface BatchesListProps {
  batches: BatchRecord[];
  tx: TxFn;
}

export function BatchesList({ batches, tx }: BatchesListProps) {
  if (batches.length === 0) {
    return (
      <AdminEmptyState message={tx('dwalletAdmin.batches.empty', 'No distribution batches')} />
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
            <CheckCircle className="w-3 h-3" /> {tx('dwalletAdmin.batches.completed', 'Completed')}
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">
            <XCircle className="w-3 h-3" /> {tx('dwalletAdmin.batches.failed', 'Failed')}
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
            {tx('dwalletAdmin.batches.processing', 'Processing')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-1">
      {batches.map(batch => (
        <div
          key={batch.id}
          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">{batch.streamKey}</p>
            <p className="text-xs text-slate-400">
              {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('en-ZA') : '—'}
            </p>
          </div>
          <div className="ml-3">{statusBadge(batch.status)}</div>
        </div>
      ))}
    </div>
  );
}
