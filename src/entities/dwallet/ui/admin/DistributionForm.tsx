'use client';

import React, { useState, useCallback } from 'react';
import type { StreamConfig } from '../../model/types';
import type { TxFn } from './shared';

interface DistributionFormProps {
  streams: StreamConfig[];
  onSubmit: (data: {
    streamKey: string;
    periodStart: string;
    periodEnd: string;
    totalRevenue: number;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  tx: TxFn;
}

export function DistributionForm({
  streams,
  onSubmit,
  onCancel,
  isSubmitting,
  tx,
}: DistributionFormProps) {
  const [streamKey, setStreamKey] = useState(streams[0]?.key ?? '');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        streamKey,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        totalRevenue: parseFloat(totalRevenue),
      });
    },
    [streamKey, periodStart, periodEnd, totalRevenue, onSubmit]
  );

  const isValid = streamKey && periodStart && periodEnd && parseFloat(totalRevenue) > 0;

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">
        {tx('dwalletAdmin.distribution.heading', 'Run Distribution')}
      </h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="batch-stream" className="block text-xs text-slate-500 mb-1">
            {tx('dwalletAdmin.distribution.revenueStream', 'Revenue Stream')}
          </label>
          <select
            id="batch-stream"
            value={streamKey}
            onChange={e => setStreamKey(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {streams.length === 0 ? (
              <option value="">
                {tx('dwalletAdmin.distribution.noStreams', 'No revenue streams configured')}
              </option>
            ) : (
              streams.map(s => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="batch-start" className="block text-xs text-slate-500 mb-1">
            {tx('dwalletAdmin.distribution.periodStart', 'Period Start')}
          </label>
          <input
            id="batch-start"
            type="date"
            value={periodStart}
            onChange={e => setPeriodStart(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="batch-end" className="block text-xs text-slate-500 mb-1">
            {tx('dwalletAdmin.distribution.periodEnd', 'Period End')}
          </label>
          <input
            id="batch-end"
            type="date"
            value={periodEnd}
            onChange={e => setPeriodEnd(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="batch-revenue" className="block text-xs text-slate-500 mb-1">
            {tx('dwalletAdmin.distribution.totalRevenue', 'Total Revenue (ZAR)')}
          </label>
          <input
            id="batch-revenue"
            type="number"
            min="0"
            step="0.01"
            value={totalRevenue}
            onChange={e => setTotalRevenue(e.target.value)}
            placeholder={tx('dwalletAdmin.distribution.amountPlaceholder', '0.00')}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-white transition-colors"
          >
            {tx('dwalletAdmin.distribution.goBack', 'Go Back')}
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? tx('dwalletAdmin.distribution.processing', 'Processing...')
              : tx('dwalletAdmin.distribution.runDistribution', 'Run Distribution')}
          </button>
        </div>
      </form>
    </div>
  );
}
