'use client';

import { useEffect, useState } from 'react';
import { logError } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

/** Contact information interface for various departments */
interface ContactSettings {
  emergency?: string;
  security?: string;
  maintenance?: string;
  office?: string;
}

/** Default contact numbers (fallback) */
const defaultContacts: ContactSettings = {
  emergency: '+27 21 555-HELP',
  security: '+27 21 555-SAFE',
  maintenance: '+27 21 555-FIXIT',
  office: '+27 21 555-0000',
};

/**
 * Custom hook that fetches and manages contact information.
 * Loads from /api/settings/contact, falls back to defaults.
 * @returns Contact settings and loading state
 */
export function useContactSettings() {
  const [contacts, setContacts] = useState<ContactSettings>(defaultContacts);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    apiGet<Record<string, string>>('/api/settings/contact')
      .then(({ data }) => {
        if (data && Object.keys(data).length > 0) {
          setContacts(prev => ({ ...prev, ...data }));
        }
      })
      .catch(error =>
        logError(
          { component: 'useContactSettings', operation: 'fetch' },
          'Failed to fetch contact settings',
          error
        )
      )
      .finally(() => setLoading(false));
  }, [mounted]);

  return { contacts, loading };
}
