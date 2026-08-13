'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { apiGet, apiPatch } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import type { SecurityContact } from '@entities/security';
import { contactTypeLabel } from '@entities/security';

const log = createComponentLogger('ManageSecurityContacts');

interface ListResponse {
  contacts: SecurityContact[];
}

export function ManageSecurityContacts({ backHref = '/security' }: { backHref?: string }) {
  const router = useRouter();
  const [contacts, setContacts] = useState<SecurityContact[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await apiGet<ListResponse>('/api/admin/security/contacts');
      setContacts(data.contacts ?? []);
    } catch (error) {
      log.error({}, 'Failed to load contacts', error);
      toast.error('Failed to load security contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDefault = async (id: string) => {
    try {
      await apiPatch(`/api/admin/security/contacts/${id}`, { setDefault: true });
      toast.success('Default contact updated');
      void load();
    } catch {
      toast.error('Failed to set default');
    }
  };

  const defaultContact = contacts.find(c => c.isDefaultCallTarget);
  const others = contacts.filter(c => !c.isDefaultCallTarget);

  return (
    <ErrorBoundary>
      <div className="max-w-md mx-auto px-4 py-8">
        <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-800">
          &larr; Back to security
        </Link>
        <div className="flex items-center justify-between mt-4 mb-5">
          <h1 className="text-xl font-semibold m-0">Security contacts</h1>
          <Link
            href="/admin/security/contacts/new"
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">Default call target</p>
            {defaultContact ? (
              <ContactCard
                contact={defaultContact}
                isDefault
                onEdit={() => router.push(`/admin/security/contacts/${defaultContact.id}`)}
              />
            ) : (
              <p className="text-sm text-amber-700 mb-4">No default contact set.</p>
            )}

            <p className="text-sm text-gray-600 mb-2 mt-5">Other contacts</p>
            <div className="flex flex-col gap-2.5">
              {others.map(c => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  onSetDefault={() => void setDefault(c.id)}
                  onEdit={() => router.push(`/admin/security/contacts/${c.id}`)}
                />
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-center text-gray-500 mt-8">
          Only management or the primary account holder can edit security contacts.
        </p>
      </div>
    </ErrorBoundary>
  );
}

function ContactCard({
  contact,
  isDefault,
  onEdit,
  onSetDefault,
}: {
  contact: SecurityContact;
  isDefault?: boolean;
  onEdit: () => void;
  onSetDefault?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-xl border ${
        isDefault ? 'border-indigo-400 border-2 bg-white' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{contact.label}</div>
        <div className="text-xs text-gray-500 truncate">
          {contact.phone} · {contactTypeLabel(contact.contactType)}
        </div>
      </div>
      {isDefault && (
        <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
          Default
        </span>
      )}
      {!isDefault && onSetDefault && (
        <button
          type="button"
          className="p-1.5 text-gray-500 hover:text-amber-600"
          aria-label="Set as default"
          onClick={onSetDefault}
        >
          <Star className="w-4 h-4" />
        </button>
      )}
      <button type="button" className="p-1.5 text-gray-500 hover:text-gray-800" onClick={onEdit}>
        <Edit className="w-4 h-4" />
      </button>
    </div>
  );
}
