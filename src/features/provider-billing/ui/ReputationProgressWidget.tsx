'use client';

import type { ReputationResponse } from '../model/types';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MeritRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function ReputationProgressWidget({ data }: { data: ReputationResponse }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Community reputation</h2>
          <p className="mt-1 text-sm text-gray-500">
            Reputation measures provider trust, responsiveness, and platform participation.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {data.band.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-950">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-indigo-700">Total reputation score</div>
                <div className="mt-2 text-4xl font-semibold">{data.reputationScore}</div>
              </div>
              <div className="text-right text-sm text-indigo-700">
                <div>{data.progress.progressPercentage}% to verification</div>
                <div>Last calculated {formatDate(data.progress.lastCalculatedAt)}</div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-indigo-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, data.progress.progressPercentage))}%`,
                }}
              />
            </div>
            <div className="mt-3 text-sm text-indigo-800">
              {data.eligibleForVerification
                ? 'This provider has reached the verification threshold.'
                : `${data.progress.remainingToVerification} points remain before automatic verification review eligibility.`}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MeritRow label="Response" value={data.progress.responseTimeScore} />
            <MeritRow label="Quality" value={data.progress.qualityScore} />
            <MeritRow label="Reviews" value={data.progress.reviewScore} />
            <MeritRow label="Compliance" value={data.progress.complianceScore} />
            <MeritRow label="Engagement" value={data.progress.engagementScore} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent merit events</h3>
            <span className="text-xs text-gray-500">Last {data.merits.length}</span>
          </div>
          <div className="mt-3 space-y-3">
            {data.merits.length === 0 ? (
              <p className="text-sm text-gray-500">
                No merit events have been recorded for this provider yet.
              </p>
            ) : (
              data.merits.map(merit => (
                <div key={merit.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {merit.meritType.replace('_', ' ')}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {merit.description ?? 'No description provided'}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      +{merit.points}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">{formatDate(merit.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
