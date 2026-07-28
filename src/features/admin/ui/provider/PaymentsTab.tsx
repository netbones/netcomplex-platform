'use client';

import { formatCurrency } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';

export function PaymentsTab({ data }: { data: ProviderDetailResponse }) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Revenue</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(data.revenueSummary.totalRevenue)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Platform fees</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(data.revenueSummary.totalPlatformFees)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Processor fees</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(data.revenueSummary.totalProcessorFees)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Net payout</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(data.revenueSummary.totalNetPayout)}
          </div>
        </div>
      </div>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Payment profile</h2>
        <p className="mt-2 text-sm text-gray-600">{data.paymentProfile.note}</p>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4">Gateway</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">Gross</th>
                <th className="pb-3 pr-4">Fees</th>
                <th className="pb-3">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.paymentHistory.map(payment => (
                <tr key={payment.id}>
                  <td className="py-4 pr-4 text-gray-700">{payment.gateway}</td>
                  <td className="py-4 pr-4 text-gray-700">{payment.tierName ?? '—'}</td>
                  <td className="py-4 pr-4 text-gray-700">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="py-4 pr-4 text-gray-700">
                    {formatCurrency(payment.platformFee + payment.processorFee, payment.currency)}
                  </td>
                  <td className="py-4 font-medium text-gray-900">
                    {formatCurrency(payment.netAmount, payment.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
