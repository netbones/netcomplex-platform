import type { ReactNode } from 'react';
import Link from 'next/link';

import { RegistrationForm } from '@features/provider-registration';
import { getSessionAndRole } from '@api/server';
import { withTenant, getProviderRegistrationMode } from '@entities/tenant/server';
import { getProviderRecordForUser, getProviderVerificationSnapshot } from '@shared/api';

function StatusCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export default async function ProviderRegistrationPage() {
  const auth = await getSessionAndRole();
  const { tenantId } = await withTenant();
  const registrationMode = await getProviderRegistrationMode(tenantId);
  const providerRecord = auth
    ? await getProviderRecordForUser(tenantId, auth.session.user.email)
    : null;
  const verification = providerRecord
    ? await getProviderVerificationSnapshot(tenantId, providerRecord.id)
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Provider platform
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Register as a community provider
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Providers can onboard through a controlled tenant flow with legal acceptance and a due
          diligence review before activation.
        </p>
      </div>

      <div className="space-y-6">
        {!auth ? (
          <StatusCard
            title="Sign in required"
            description="Provider registration is tied to your tenant account so we can link dashboard access, legal acceptance, and verification status correctly."
          >
            <Link
              href="/sign-in"
              className="inline-flex rounded-md bg-soralia-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Sign in to continue
            </Link>
          </StatusCard>
        ) : providerRecord ? (
          <StatusCard
            title="Provider profile already linked"
            description={`Your account is already linked to ${providerRecord.companyName}.`}
          >
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                Verification status: <strong>{verification?.displayStatus ?? 'PROBATION'}</strong>
              </p>
              <Link
                href="/dashboard/providers"
                className="inline-flex rounded-md bg-soralia-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Open provider dashboard
              </Link>
            </div>
          </StatusCard>
        ) : registrationMode !== 'OPEN' ? (
          <StatusCard
            title="Invitation-only registration"
            description="This tenant is currently accepting provider onboarding by invitation only. Contact the community office or an administrator to request onboarding access."
          >
            <p className="text-sm text-slate-600">
              Once registration is opened for your tenant, this page will show the full self-service
              onboarding form.
            </p>
          </StatusCard>
        ) : (
          <RegistrationForm
            initialEmail={auth.session.user.email}
            initialContactName={auth.session.user.name}
          />
        )}
      </div>
    </main>
  );
}
