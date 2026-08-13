'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '@shared/ui';
import { apiGet, apiPatch, apiPost, apiDelete, ApiClientError } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import {
  securityContactSchema,
  SECURITY_CONTACT_TYPE_OPTIONS,
  type SecurityContact,
  type SecurityContactInput,
} from '@entities/security';

const log = createComponentLogger('SecurityContactForm');

export function SecurityContactForm({ contactId }: { contactId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(contactId);
  const [loading, setLoading] = useState(isEdit);

  const form = useForm<SecurityContactInput>({
    resolver: zodResolver(securityContactSchema) as Resolver<SecurityContactInput>,
    defaultValues: {
      label: '',
      phone: '',
      contactType: 'INTERNAL_SECURITY',
      isDefaultCallTarget: false,
    },
  });

  useEffect(() => {
    if (!contactId) return;
    void (async () => {
      try {
        const { data } = await apiGet<SecurityContact>(`/api/admin/security/contacts/${contactId}`);
        form.reset({
          label: data.label,
          phone: data.phone,
          contactType: data.contactType,
          isDefaultCallTarget: data.isDefaultCallTarget,
        });
      } catch (error) {
        log.error({}, 'Load contact failed', error);
        toast.error('Contact not found');
        router.push('/admin/security/contacts');
      } finally {
        setLoading(false);
      }
    })();
  }, [contactId, form, router]);

  const onSubmit = form.handleSubmit(async values => {
    try {
      if (isEdit && contactId) {
        await apiPatch(`/api/admin/security/contacts/${contactId}`, values);
        toast.success('Contact updated');
      } else {
        await apiPost('/api/admin/security/contacts', values);
        toast.success('Contact created');
      }
      router.push('/admin/security/contacts');
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Save failed');
    }
  });

  const onDelete = async () => {
    if (!contactId) return;
    try {
      await apiDelete(`/api/admin/security/contacts/${contactId}`);
      toast.success('Contact deleted');
      router.push('/admin/security/contacts');
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Delete failed');
    }
  };

  if (loading) {
    return <p className="p-8 text-gray-500 text-sm">Loading…</p>;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-md mx-auto px-4 py-8">
        <Link
          href="/admin/security/contacts"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-xl font-semibold mt-4 mb-6">
          {isEdit ? 'Edit contact' : 'Add contact'}
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Label" error={form.formState.errors.label?.message}>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              {...form.register('label')}
            />
          </Field>
          <Field label="Phone" error={form.formState.errors.phone?.message}>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              {...form.register('phone')}
            />
          </Field>
          <Field label="Contact type">
            <div className="space-y-2">
              {SECURITY_CONTACT_TYPE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" value={opt.value} {...form.register('contactType')} />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isDefaultCallTarget')} />
            Set as default call target
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Save'
              )}
            </button>
            <Link
              href="/admin/security/contacts"
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-center"
            >
              Cancel
            </Link>
          </div>
          {isEdit && (
            <button
              type="button"
              className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg mt-2"
              onClick={() => void onDelete()}
            >
              Delete contact
            </button>
          )}
        </form>
      </div>
    </ErrorBoundary>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
