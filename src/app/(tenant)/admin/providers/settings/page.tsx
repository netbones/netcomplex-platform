'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchApi, sendJson, statusBadgeClass } from '@/components/admin/adminApi';
import type { RegistrationModeResponse } from '@/components/admin/types';

export default function AdminProviderSettingsPage() {
  const queryClient = useQueryClient();
  const modeQuery = useQuery<RegistrationModeResponse>({
    queryKey: ['admin', 'provider-registration-mode'],
    queryFn: () =>
      fetchApi<RegistrationModeResponse>('/api/admin/tenant/provider-registration-mode'),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (mode: 'OPEN' | 'INVITATION_ONLY') =>
      sendJson<RegistrationModeResponse>('/api/admin/tenant/provider-registration-mode', {
        method: 'PATCH',
        body: JSON.stringify({ mode }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'provider-registration-mode'] });
    },
  });

  const mode = modeQuery.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-gray-900 to-slate-700 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-semibold">Provider registration settings</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Toggle self-service provider onboarding and confirm gateway readiness before opening
          billing-related settings to the tenant.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Current mode</h2>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(mode?.mode ?? 'INVITATION_ONLY')}`}
            >
              {(mode?.mode ?? 'INVITATION_ONLY').replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-500">
              Payment settings {mode?.paymentSettingsUnlocked ? 'unlocked' : 'locked'}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => mutation.mutate('OPEN')}
              disabled={mutation.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Set OPEN
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate('INVITATION_ONLY')}
              disabled={mutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Set INVITATION_ONLY
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Gateway readiness</h2>
          <p className="mt-1 text-sm text-gray-500">
            Payment settings are only considered ready when registration is open and gateway
            credentials are present.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Paystack</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {mode?.gatewayStatus.paystackConfigured ? 'Configured' : 'Missing credentials'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">PayPal</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {mode?.gatewayStatus.paypalConfigured ? 'Configured' : 'Missing credentials'}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
