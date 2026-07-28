'use client';

import { statusBadgeClass } from '../api/adminApi';
import { useProviderDetail, PROVIDER_TABS } from './provider/useProviderDetail';
import { ProfileTab } from './provider/ProfileTab';
import { VerificationTab } from './provider/VerificationTab';
import { LegalTab } from './provider/LegalTab';
import { ReputationTab } from './provider/ReputationTab';
import { PaymentsTab } from './provider/PaymentsTab';
import { ActionsTab } from './provider/ActionsTab';

export function ProviderDetailView({ providerId }: { providerId: string }) {
  const h = useProviderDetail(providerId);

  if (h.isLoading || !h.data) {
    return (
      <div className="mx-auto max-w-7xl p-6 text-sm text-gray-500">Loading provider detail…</div>
    );
  }

  const data = h.data;

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    await h.actionMutation.mutateAsync({
      url: `/api/admin/providers/${providerId}/reject`,
      method: 'PATCH',
      body: { reason: h.rejectReason },
    });
    h.setRejectReason('');
  };

  const handleSuspendToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    await h.actionMutation.mutateAsync({
      url: `/api/admin/providers/${providerId}/suspend`,
      method: 'PATCH',
      body: {
        action: data.provider.verificationStatus === 'SUSPENDED' ? 'REINSTATE' : 'SUSPEND',
        reason: h.suspendReason,
        restoreStatus: 'PROBATION',
      },
    });
    h.setSuspendReason('');
  };

  const handleReputationAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    await h.actionMutation.mutateAsync({
      url: `/api/admin/providers/${providerId}/reputation`,
      method: 'PATCH',
      body: {
        reason: h.reputationReason,
        reputationDelta: Number.parseInt(h.reputationDelta, 10) || 0,
      },
    });
    h.setReputationReason('');
    h.setReputationDelta('0');
  };

  const handleDdSave = async () => {
    h.setDdSaving(true);
    try {
      const allApproved = h.ddItems.every(i => i.status === 'APPROVED');
      await h.actionMutation.mutateAsync({
        url: `/api/admin/providers/${providerId}/due-diligence`,
        method: 'PATCH',
        body: {
          items: h.ddItems.map(i => ({ key: i.key, status: i.status, notes: i.notes })),
          verificationNotes: h.vrNotes.trim() || undefined,
          workflowStatus: allApproved ? 'APPROVED' : 'UNDER_REVIEW',
        },
      });
    } finally {
      h.setDdSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-slate-300">Provider moderation detail</div>
            <h1 className="mt-2 text-3xl font-semibold">{data.provider.companyName}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-200">
              Review legal acceptance, due diligence, reputation, payments, and apply admin
              overrides with audit-backed APIs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(data.provider.verificationStatus)}`}
            >
              {data.provider.verificationStatus.toLowerCase()}
            </span>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {data.reputation?.totalScore ?? 0} points
            </span>
          </div>
        </div>
      </section>

      {h.actionMessage ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          {h.actionMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {PROVIDER_TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => h.setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${h.activeTab === tab ? 'bg-soralia-primary text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {h.activeTab === 'profile' && <ProfileTab data={data} />}
      {h.activeTab === 'verification' && (
        <VerificationTab
          data={data}
          ddItems={h.ddItems}
          vrNotes={h.vrNotes}
          ddSaving={h.ddSaving}
          onDdItemsChange={h.setDdItems}
          onVrNotesChange={h.setVrNotes}
          onSave={handleDdSave}
        />
      )}
      {h.activeTab === 'legal' && <LegalTab data={data} />}
      {h.activeTab === 'reputation' && <ReputationTab data={data} />}
      {h.activeTab === 'payments' && <PaymentsTab data={data} />}
      {h.activeTab === 'actions' && (
        <ActionsTab
          data={data}
          rejectReason={h.rejectReason}
          suspendReason={h.suspendReason}
          reputationReason={h.reputationReason}
          reputationDelta={h.reputationDelta}
          actionPending={h.actionMutation.isPending}
          onRejectReasonChange={h.setRejectReason}
          onSuspendReasonChange={h.setSuspendReason}
          onReputationReasonChange={h.setReputationReason}
          onReputationDeltaChange={h.setReputationDelta}
          onReject={handleReject}
          onSuspendToggle={handleSuspendToggle}
          onReputationAdjust={handleReputationAdjust}
        />
      )}
    </div>
  );
}
