'use client';

import { useEffect, useState } from 'react';

/** Contact information interface for various departments */
interface ContactSettings {
  emergency?: string;
  security?: string;
  maintenance?: string;
  office?: string;
}

/** Default contact numbers for Soralia Village */
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

  useEffect(() => {
    fetch('/api/settings/contact')
      .then(res => res.json())
      .then(data => {
        if (Object.keys(data).length > 0) {
          setContacts(prev => ({ ...prev, ...data }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { contacts, loading };
}
