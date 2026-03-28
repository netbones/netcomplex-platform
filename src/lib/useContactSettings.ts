'use client';

import { useEffect, useState } from 'react';

interface ContactSettings {
  emergency?: string;
  security?: string;
  maintenance?: string;
  office?: string;
}

const defaultContacts: ContactSettings = {
  emergency: '+27 21 555-HELP',
  security: '+27 21 555-SAFE',
  maintenance: '+27 21 555-FIXIT',
  office: '+27 21 555-0000',
};

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
