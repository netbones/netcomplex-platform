'use client';

import { statusBadgeClass } from '../../api/adminApi';
import type { ProviderDetailResponse } from '../../api/types';

export function ActionsTab({
  data,
  rejectReason,
  suspendReason,
  reputationReason,
  reputationDelta,
  actionPending,
  onRejectReasonChange,
  onSuspendReasonChange,
  onReputationReasonChange,
  onReputationDeltaChange,
  onReject,
  onSuspendToggle,
  onReputationAdjust,
}: {
  data: ProviderDetailResponse;
  rejectReason: string;
  suspendReason: string;
  reputationReason: string;
  reputationDelta: string;
  actionPending: boolean;
  onRejectReasonChange: (v: string) => void;
  onSuspendReasonChange: (v: string) => void;
  onReputationReasonChange: (v: string) => void;
  onReputationDeltaChange: (v: string) => void;
  onReject: (e: React.FormEvent) => Promise<void>;
  onSuspendToggle: (e: React.FormEvent) => Promise<void>;
  onReputationAdjust: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Verification workflow</h2>
        <p className="text-sm text-gray-600">
          Use the verification tab to complete the due diligence checklist — tick each item, add
          admin notes, and save. The provider status updates automatically when all items are
          approved.
        </p>
        <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-3">
          <div>
            <div className="font-medium text-gray-900">Verification status</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(data.provider.verificationStatus)}`}
              >
                {data.provider.verificationStatus.toLowerCase()}
              </span>
              <span className="text-gray-500">
                {data.dueDiligence.items.filter(i => i.status === 'APPROVED').length}/
                {data.dueDiligence.items.length} items approved
              </span>
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900">Workflow status</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  (data.dueDiligence as { workflowStatus?: string }).workflowStatus === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : (data.dueDiligence as { workflowStatus?: string }).workflowStatus ===
                        'REJECTED'
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
              {(data.dueDiligence as { assignedTo?: string | null }).assignedTo ? (
                <span className="text-gray-500">
                  Assigned to{' '}
                  <span className="font-medium text-gray-700">
                    {(data.dueDiligence as { assignedTo?: string | null }).assignedTo}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <form
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
        onSubmit={onReject}
      >
        <h2 className="text-base font-semibold text-gray-900">Reject application</h2>
        <textarea
          required
          value={rejectReason}
          onChange={e => onRejectReasonChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Reason for rejection"
        />
        <button
          type="submit"
          disabled={actionPending}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Reject provider
        </button>
      </form>

      <form
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
        onSubmit={onSuspendToggle}
      >
        <h2 className="text-base font-semibold text-gray-900">Suspend or reinstate</h2>
        <textarea
          value={suspendReason}
          onChange={e => onSuspendReasonChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Suspension or reinstatement notes"
        />
        <button
          type="submit"
          disabled={actionPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {data.provider.verificationStatus === 'SUSPENDED'
            ? 'Reinstate provider'
            : 'Suspend provider'}
        </button>
      </form>

      <form
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
        onSubmit={onReputationAdjust}
      >
        <h2 className="text-base font-semibold text-gray-900">Adjust reputation</h2>
        <input
          value={reputationDelta}
          onChange={e => onReputationDeltaChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          inputMode="numeric"
        />
        <textarea
          required
          value={reputationReason}
          onChange={e => onReputationReasonChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Reason for manual reputation adjustment"
        />
        <button
          type="submit"
          disabled={actionPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Save reputation override
        </button>
      </form>
    </section>
  );
}
