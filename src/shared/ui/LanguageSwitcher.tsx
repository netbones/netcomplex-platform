'use client';

import { useTranslation } from 'react-i18next';
import { useIsMounted } from 'usehooks-ts';
import { supportedLanguages, languageNames, type SupportedLanguage } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'dark' }: LanguageSwitcherProps) {
  const { i18n, ready } = useTranslation();
  const isMounted = useIsMounted();

  if (!isMounted || !ready) {
    return (
      <div className="relative group">
        <div
          className={`text-sm px-2 py-1 ${variant === 'dark' ? 'text-white/70' : 'text-lapis-mid'}`}
        >
          en
        </div>
      </div>
    );
  }

  const currentLang = (i18n.language || 'en') as SupportedLanguage;

  const baseClasses =
    variant === 'dark'
      ? 'bg-white/10 text-white border-white/20 hover:bg-white/20 focus:ring-white/50'
      : 'bg-white text-lapis-deep border-lapis-azure/30 hover:bg-lapis-azure/10 focus:ring-lapis-azure/50';

  const arrowSvg =
    variant === 'dark'
      ? '%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22/%3E%3C/svg%3E'
      : '%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%234F46E5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22/%3E%3C/svg%3E';

  const optionBg = variant === 'dark' ? 'bg-indigo-600' : 'bg-white';
  const optionText = variant === 'dark' ? 'text-white' : 'text-lapis-deep';

  return (
    <div className="relative group">
      <select
        value={currentLang}
        onChange={e => {
          i18n.changeLanguage(e.target.value);
        }}
        className={`appearance-none text-sm rounded px-3 py-1 pr-8 focus:outline-none focus:ring-2 cursor-pointer transition-colors bg-[url('data:image/svg+xml,${arrowSvg}')] bg-[length:16px] bg-[right_6px_center] bg-no-repeat ${baseClasses}`}
        aria-label="Select language"
      >
        {supportedLanguages.map(lang => (
          <option key={lang} value={lang} className={`${optionBg} ${optionText}`}>
            {lang.toUpperCase()}
          </option>
        ))}
      </select>
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 ${
          variant === 'dark' ? 'bg-amber-500 text-white' : 'bg-lapis-deep text-white'
        }`}
      >
        {languageNames[currentLang]}
      </div>
    </div>
  );
}
