'use client';

import { formatDate } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';

export function ReputationTab({ data }: { data: ProviderDetailResponse }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Reputation snapshot</h2>
        <div className="mt-4 text-4xl font-semibold text-gray-900">
          {data.reputation?.totalScore ?? 0}
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Last calculated {formatDate(data.reputation?.lastCalculatedAt ?? null)}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Reputation history</h2>
        <div className="mt-4 space-y-3">
          {data.reputationHistory.map(item => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-medium text-gray-900">{item.meritType.replace('_', ' ')}</div>
              <div className="mt-1 text-sm text-gray-600">
                {item.description ?? 'No description provided'}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {item.points} points • {formatDate(item.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
