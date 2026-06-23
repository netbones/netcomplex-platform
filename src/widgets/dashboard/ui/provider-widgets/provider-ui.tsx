'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import type { ProviderVerification } from './provider-queries';

const STATUS_STYLES: Record<ProviderVerification['displayStatus'], string> = {
  UNVERIFIED: 'bg-red-100 text-red-700 border border-red-200',
  PROBATION: 'bg-amber-100 text-amber-800 border border-amber-200',
  VERIFIED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  SUSPENDED: 'bg-rose-100 text-rose-700 border border-rose-200',
};

export function ProviderStatusBadge({ status }: { status: ProviderVerification['displayStatus'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status === 'UNVERIFIED' ? 'Unverified' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function ProviderStatusSummary({
  verification,
  remainingToVerification,
}: {
  verification: ProviderVerification;
  remainingToVerification: number;
}) {
  if (verification.displayStatus === 'VERIFIED') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Verified provider</p>
          <p className="text-sm">
            Your provider profile has full analytics access for community performance monitoring.
          </p>
        </div>
      </div>
    );
  }

  if (verification.displayStatus === 'SUSPENDED') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-rose-800">
        <ShieldAlert className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Provider account suspended</p>
          <p className="text-sm">
            Analytics are hidden while the account is suspended. Contact support or the community
            administrators for review.
          </p>
        </div>
      </div>
    );
  }

  if (verification.displayStatus === 'PROBATION') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
        <Clock3 className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Probationary provider</p>
          <p className="text-sm">
            You are building toward verification. {remainingToVerification} more reputation points
            are needed to unlock the full provider analytics view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800">
      <AlertTriangle className="mt-0.5 h-5 w-5" />
      <div>
        <p className="font-semibold">Verification not complete</p>
        <p className="text-sm">
          Your provider profile is still awaiting verification. Complete onboarding and build
          service reputation to graduate into probation or verified access.
        </p>
      </div>
    </div>
  );
}

export function ProviderSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProviderMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

export function ProviderProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full rounded-full bg-indigo-600 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function EmptyProviderState({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function formatProviderDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
