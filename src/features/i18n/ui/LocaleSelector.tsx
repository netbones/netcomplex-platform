'use client';

import { useCallback, useState } from 'react';
import { supportedLanguages, languageNames, type SupportedLanguage } from '@/shared/lib/i18n';
import { ChevronDown, Languages, Copy, Check } from 'lucide-react';

interface LocaleSelectorProps {
  currentLocale: SupportedLanguage;
  availableLocales?: readonly SupportedLanguage[];
  onLocaleChange: (locale: SupportedLanguage) => void;
  onCopyToLocale?: (targetLocale: SupportedLanguage) => void;
  disabled?: boolean;
}

export function LocaleSelector({
  currentLocale,
  availableLocales = supportedLanguages,
  onLocaleChange,
  onCopyToLocale,
  disabled = false,
}: LocaleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLocale, setCopiedLocale] = useState<SupportedLanguage | null>(null);

  const handleCopyToLocale = useCallback(
    (targetLocale: SupportedLanguage, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onCopyToLocale) {
        onCopyToLocale(targetLocale);
        setCopiedLocale(targetLocale);
        setTimeout(() => setCopiedLocale(null), 1500);
      }
    },
    [onCopyToLocale]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-colors border
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
          ${isOpen ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}
        `}
      >
        <Languages className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{languageNames[currentLocale]}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]">
            {availableLocales.map(locale => (
              <div key={locale} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    onLocaleChange(locale);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm
                    ${locale === currentLocale ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <span>{languageNames[locale]}</span>
                  <span className="text-xs text-gray-400 uppercase">{locale}</span>
                </button>

                {onCopyToLocale && locale !== currentLocale && (
                  <button
                    type="button"
                    onClick={e => handleCopyToLocale(locale, e)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-indigo-600"
                    title={`Copy ${languageNames[currentLocale]} content to ${languageNames[locale]}`}
                  >
                    {copiedLocale === locale ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface LocaleTabsProps {
  currentLocale: SupportedLanguage;
  availableLocales?: readonly SupportedLanguage[];
  onLocaleChange: (locale: SupportedLanguage) => void;
  showAddLocale?: boolean;
  onAddLocale?: () => void;
}

export function LocaleTabs({
  currentLocale,
  availableLocales = supportedLanguages,
  onLocaleChange,
  showAddLocale = false,
  onAddLocale,
}: LocaleTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {availableLocales.map(locale => (
        <button
          key={locale}
          type="button"
          onClick={() => onLocaleChange(locale)}
          className={`
            px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
            ${
              locale === currentLocale
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          {languageNames[locale]}
          <span className="ml-1 text-xs text-gray-400 uppercase">({locale})</span>
        </button>
      ))}

      {showAddLocale && onAddLocale && (
        <button
          type="button"
          onClick={onAddLocale}
          className="px-3 py-2 text-sm font-medium text-gray-400 hover:text-indigo-600"
        >
          + Add
        </button>
      )}
    </div>
  );
}

interface LocaleBadgeProps {
  locale: SupportedLanguage;
  size?: 'sm' | 'md';
}

export function LocaleBadge({ locale, size = 'sm' }: LocaleBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gray-100 text-gray-600 ${sizeClasses}`}
    >
      {locale.toUpperCase()}
    </span>
  );
}
