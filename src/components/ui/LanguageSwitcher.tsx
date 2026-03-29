'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { supportedLanguages, languageNames, type SupportedLanguage } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { i18n, ready } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !ready) {
    return (
      <select
        className="bg-transparent text-sm text-white border border-white/30 rounded px-2 py-1"
        disabled
      >
        <option value="en">Loading...</option>
      </select>
    );
  }

  const currentLang = (i18n.language || 'en') as SupportedLanguage;

  return (
    <select
      value={currentLang}
      onChange={e => {
        i18n.changeLanguage(e.target.value);
      }}
      className="bg-transparent text-sm text-white border border-white/30 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/50"
      aria-label="Select language"
    >
      {supportedLanguages.map(lang => (
        <option key={lang} value={lang} className="text-gray-800">
          {languageNames[lang]}
        </option>
      ))}
    </select>
  );
}
