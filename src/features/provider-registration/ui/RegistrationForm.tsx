'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  PROVIDER_LEGAL_DOCUMENTS,
  providerRegistrationSchema,
  type ProviderRegistrationInput,
} from '@shared/lib/providers/registration';
import { cn } from '@shared/lib';

import { LegalAgreementModal } from './LegalAgreementModal';

interface RegistrationFormProps {
  initialEmail: string;
  initialContactName: string;
}

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

function Field({ label, error, required, children, hint }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-900">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </label>
  );
}

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-soralia-primary focus:ring-2 focus:ring-soralia-primary/20';

export function RegistrationForm({ initialEmail, initialContactName }: RegistrationFormProps) {
  const router = useRouter();
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProviderRegistrationInput>({
    resolver: zodResolver(providerRegistrationSchema),
    defaultValues: {
      companyName: '',
      contactName: initialContactName,
      email: initialEmail,
      phone: '',
      trade: '',
      website: '',
      legalAgreements: {
        tos: false,
        privacy: false,
        codeOfConduct: false,
      },
    },
  });

  const onSubmit = handleSubmit(async values => {
    setFormError(null);

    try {
      const response = await fetch('/api/providers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: { message?: string; code?: string; details?: unknown };
      };

      if (!response.ok || !payload.success) {
        const message = payload.error?.message || 'Failed to submit provider registration';
        setFormError(message);
        if (response.status === 409) {
          toast.error('Company already registered');
        } else {
          toast.error(message);
        }
        return;
      }

      toast.success('Registration submitted — awaiting verification');
      router.push('/dashboard/providers');
      router.refresh();
    } catch {
      const message = 'Failed to submit provider registration';
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <>
      {isLegalOpen ? (
        <LegalAgreementModal
          documents={PROVIDER_LEGAL_DOCUMENTS}
          onClose={() => setIsLegalOpen(false)}
        />
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Provider registration</h2>
          <p className="text-sm text-slate-600">
            Submit your provider profile for tenant review. New registrations start in probation
            until due diligence is completed.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company name" required error={errors.companyName?.message}>
            <input
              {...register('companyName')}
              className={inputClassName}
              autoComplete="organization"
            />
          </Field>

          <Field label="Contact name" required error={errors.contactName?.message}>
            <input {...register('contactName')} className={inputClassName} autoComplete="name" />
          </Field>

          <Field
            label="Account email"
            required
            error={errors.email?.message}
            hint="This must match the email on your signed-in account so the provider dashboard can be linked correctly."
          >
            <input {...register('email')} className={inputClassName} autoComplete="email" />
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <input {...register('phone')} className={inputClassName} autoComplete="tel" />
          </Field>

          <Field
            label="Trade"
            error={errors.trade?.message}
            hint="Optional. Defaults to GENERAL if left blank."
          >
            <input {...register('trade')} className={inputClassName} />
          </Field>

          <Field
            label="Website"
            error={errors.website?.message}
            hint="Optional. Included in the initial due diligence notes for the review team."
          >
            <input
              {...register('website')}
              className={inputClassName}
              placeholder="https://example.com"
            />
          </Field>
        </div>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Legal acceptance</h3>
              <p className="mt-1 text-sm text-slate-600">
                You must accept all current legal documents before submitting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLegalOpen(true)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Review legal agreements
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                {...register('legalAgreements.tos')}
                className={cn(
                  'mt-1 h-4 w-4 rounded border-slate-300 text-soralia-primary focus:ring-soralia-primary'
                )}
              />
              <span>
                I accept the Terms of Service <span className="text-slate-500">(v2026-06)</span>
              </span>
            </label>
            {errors.legalAgreements?.tos ? (
              <p className="text-sm text-rose-600">{errors.legalAgreements.tos.message}</p>
            ) : null}

            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                {...register('legalAgreements.privacy')}
                className={cn(
                  'mt-1 h-4 w-4 rounded border-slate-300 text-soralia-primary focus:ring-soralia-primary'
                )}
              />
              <span>
                I accept the Privacy Policy <span className="text-slate-500">(v2026-06)</span>
              </span>
            </label>
            {errors.legalAgreements?.privacy ? (
              <p className="text-sm text-rose-600">{errors.legalAgreements.privacy.message}</p>
            ) : null}

            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                {...register('legalAgreements.codeOfConduct')}
                className={cn(
                  'mt-1 h-4 w-4 rounded border-slate-300 text-soralia-primary focus:ring-soralia-primary'
                )}
              />
              <span>
                I accept the Code of Conduct <span className="text-slate-500">(v2026-06)</span>
              </span>
            </label>
            {errors.legalAgreements?.codeOfConduct ? (
              <p className="text-sm text-rose-600">
                {errors.legalAgreements.codeOfConduct.message}
              </p>
            ) : null}
          </div>
        </section>

        {formError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-soralia-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Submit registration'}
          </button>
        </div>
      </form>
    </>
  );
}
