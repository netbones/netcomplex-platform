'use client';

import Link from 'next/link';
import { formatDate } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';
import { LegalDocumentCard } from './LegalDocumentCard';

export function LegalTab({ data }: { data: ProviderDetailResponse }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Legal agreements</h2>
        <p className="mt-1 text-sm text-gray-500">
          Platform-governed documents that every provider must accept. Click to review full text.
        </p>
        <div className="mt-5 grid gap-4">
          {data.legalStatus.documents.map(document => (
            <LegalDocumentCard key={document.key} document={document} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Acceptance history</h2>
        <p className="mt-1 text-sm text-gray-500">
          Record of each agreement acceptance by this provider.
        </p>
        <div className="mt-4 space-y-2">
          {data.legalAgreements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              No legal agreements have been accepted by this provider yet.
            </div>
          ) : (
            data.legalAgreements.map(agreement => (
              <div
                key={agreement.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {agreement.agreementType.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-gray-500">
                    v{agreement.version} • {formatDate(agreement.acceptedAt)}
                  </div>
                </div>
                <div className="text-xs text-gray-400">{agreement.ipAddress ?? '—'}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900">
        <div className="font-semibold">Document management</div>
        <p className="mt-1">
          Legal agreements are managed through the platform content system. Create a{' '}
          <strong>LEGAL</strong> category resource per document — the provider portal reads the
          latest published version automatically.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/content"
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Manage documents
          </Link>
          <span className="text-xs text-indigo-600">
            Defaults from{' '}
            <code className="rounded bg-indigo-100 px-1 text-xs">PROVIDER_LEGAL_DOCUMENTS</code>{' '}
            serve as templates until tenant overrides are published.
          </span>
        </div>
      </div>
    </section>
  );
}
