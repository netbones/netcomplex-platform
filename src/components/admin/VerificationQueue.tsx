'use client';

import Link from 'next/link';

import type { PendingProviderItem } from './types';
import { formatDate, statusBadgeClass, ddStepColor } from './adminApi';

export function VerificationQueue({ providers }: { providers: PendingProviderItem[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Verification queue</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pending and probation providers waiting for due diligence review.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {providers.length} in queue
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {providers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
            No pending providers are waiting in the moderation queue.
          </div>
        ) : (
          providers.map(provider => (
            <div key={provider.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{provider.companyName}</h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(provider.verificationStatus ?? 'PENDING')}`}
                    >
                      {(provider.verificationStatus ?? 'PENDING').toLowerCase()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {provider.contactName ?? 'No contact name'} •{' '}
                    {provider.trade ?? 'Trade not provided'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Registered {formatDate(provider.createdAt)} • Legal agreements{' '}
                    {provider.legalStatus.acceptedAgreementCount}/3
                  </div>
                </div>
                <Link
                  href={`/dashboard/admin/providers/${provider.id}`}
                  className="inline-flex rounded-lg bg-soralia-primary px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Review provider
                </Link>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {provider.dueDiligence.items.map(item => {
                  const c = ddStepColor(item.key);
                  return (
                    <div
                      key={item.key}
                      className={`rounded-lg border-l-4 bg-white p-3 ${c.border}`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {item.label}
                      </div>
                      <div className="mt-1 text-sm text-gray-700">{item.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
