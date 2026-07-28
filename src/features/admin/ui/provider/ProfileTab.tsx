'use client';

import { formatDate, ddStepColor } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';

export function ProfileTab({ data }: { data: ProviderDetailResponse }) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Contact</dt>
              <dd className="font-medium text-gray-900">{data.provider.contactName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{data.provider.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900">{data.provider.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Trade</dt>
              <dd className="font-medium text-gray-900">{data.provider.trade ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium text-gray-900">{formatDate(data.provider.createdAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Activity timeline</h2>
          <div className="mt-4 space-y-3">
            {data.activityTimeline.map(item => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-500">{formatDate(item.createdAt)}</div>
                </div>
                <div className="mt-1 text-sm text-gray-600">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Due diligence summary</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use the <span className="font-medium text-indigo-600">verification</span> tab to
              review and update each item.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {(data.dueDiligence as { assignedTo?: string | null }).assignedTo ? (
              <span className="text-xs text-gray-500">
                Assigned to{' '}
                <span className="font-medium text-gray-700">
                  {(data.dueDiligence as { assignedTo?: string | null }).assignedTo}
                </span>
              </span>
            ) : null}
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                (data.dueDiligence as { workflowStatus?: string }).workflowStatus === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : (data.dueDiligence as { workflowStatus?: string }).workflowStatus === 'REJECTED'
                    ? 'bg-rose-100 text-rose-700'
                    : (data.dueDiligence as { workflowStatus?: string }).workflowStatus ===
                        'UNDER_REVIEW'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
              }`}
            >
              {(data.dueDiligence as { workflowStatus?: string }).workflowStatus ||
                'PENDING_REVIEW'}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {data.dueDiligence.items.map(item => {
            const c = ddStepColor(item.key);
            return (
              <div key={item.key} className={`rounded-xl border-l-4 bg-gray-50 p-4 ${c.border}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm text-gray-900">{item.label}</div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                {item.notes ? (
                  <div className="mt-2 text-xs text-gray-600 line-clamp-2">{item.notes}</div>
                ) : null}
                {(item as { reviewedBy?: string | null }).reviewedBy ? (
                  <div className="mt-1 text-xs text-gray-400">
                    Reviewed by {(item as { reviewedBy?: string | null }).reviewedBy}
                    {(item as { reviewedAt?: string | null }).reviewedAt
                      ? ` · ${formatDate((item as { reviewedAt?: string | null }).reviewedAt)}`
                      : ''}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
