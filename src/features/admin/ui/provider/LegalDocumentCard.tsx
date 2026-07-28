'use client';

import { useState } from 'react';
import { formatDate } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';

export function LegalDocumentCard({
  document,
}: {
  document: ProviderDetailResponse['legalStatus']['documents'][number];
}) {
  const [expanded, setExpanded] = useState(false);
  const providerAccepted = document.accepted && document.acceptedAt;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-gray-900">{document.label}</div>
            <span className="text-xs text-gray-400">v{document.version}</span>
          </div>
          <div className="mt-1 text-sm text-gray-600 line-clamp-2">{document.summary}</div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {providerAccepted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4.5 8.5L2 6l.7-.7 1.8 1.8 4.8-4.8.7.7z" />
              </svg>
              Accepted {formatDate(document.acceptedAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              Not accepted
            </span>
          )}
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      {expanded ? (
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {document.body}
          </div>
          {!providerAccepted ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">
              <div className="font-semibold text-rose-900">Provider action required</div>
              <p className="mt-1 text-rose-700">
                This provider has not yet accepted the {document.label.toLowerCase()}. The provider
                must accept this agreement through their onboarding or legal settings before they
                can access the full provider platform features on the current version.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
