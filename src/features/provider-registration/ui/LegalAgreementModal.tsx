'use client';

import { ModalOverlay } from '@shared/ui';
import type { ProviderLegalDocument } from '@shared/lib/providers/registration';

interface LegalAgreementModalProps {
  documents: ProviderLegalDocument[];
  onClose: () => void;
}

export function LegalAgreementModal({ documents, onClose }: LegalAgreementModalProps) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Provider legal agreements</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review the current agreement versions before submitting your registration.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close legal agreements"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {documents.map(document => (
            <section key={document.agreementType} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-slate-900">{document.label}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  v{document.version}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{document.summary}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{document.body}</p>
            </section>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-soralia-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Done reviewing
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
