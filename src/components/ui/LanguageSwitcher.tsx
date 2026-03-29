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
      <div className="relative group">
        <div className="text-sm text-white/70 px-2 py-1">en</div>
      </div>
    );
  }

  const currentLang = (i18n.language || 'en') as SupportedLanguage;

  return (
    <div className="relative group">
      <select
        value={currentLang}
        onChange={e => {
          i18n.changeLanguage(e.target.value);
        }}
        className="appearance-none bg-white/10 text-sm text-white border border-white/20 rounded px-3 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer hover:bg-white/20 transition-colors bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22/%3E%3C/svg%3E')] bg-[length:16px] bg-[right_6px_center] bg-no-repeat"
        aria-label="Select language"
      >
        {supportedLanguages.map(lang => (
          <option key={lang} value={lang} className="bg-indigo-600 text-white">
            {lang.toUpperCase()}
          </option>
        ))}
      </select>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-amber-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {languageNames[currentLang]}
      </div>
    </div>
  );
}
