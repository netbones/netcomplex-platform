'use client';

import { useState, useCallback } from 'react';
import { RichTextEditor } from '@shared/ui';
import { LocaleSelector, LocaleTabs, LocaleBadge } from './LocaleSelector';
import {
  supportedLanguages,
  languageNames,
  defaultLanguage,
  type SupportedLanguage,
} from '@/shared/lib/i18n';

interface LocaleContent {
  [locale: string]: string;
}

interface LocaleAwareEditorProps {
  content: LocaleContent;
  onChange: (content: LocaleContent) => void;
  placeholder?: string;
  currentLocale?: SupportedLanguage;
  onLocaleChange?: (locale: SupportedLanguage) => void;
}

export function LocaleAwareEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  currentLocale = defaultLanguage as SupportedLanguage,
  onLocaleChange,
}: LocaleAwareEditorProps) {
  const [activeLocale, setActiveLocale] = useState<SupportedLanguage>(currentLocale);

  const handleLocaleChange = useCallback(
    (locale: SupportedLanguage) => {
      setActiveLocale(locale);
      onLocaleChange?.(locale);
    },
    [onLocaleChange]
  );

  const handleContentChange = useCallback(
    (html: string) => {
      onChange({
        ...content,
        [activeLocale]: html,
      });
    },
    [content, activeLocale, onChange]
  );

  const handleCopyToLocale = useCallback(
    (targetLocale: SupportedLanguage) => {
      const sourceContent = content[activeLocale] || '';
      onChange({
        ...content,
        [targetLocale]: sourceContent,
      });
    },
    [content, activeLocale, onChange]
  );

  const currentContent = content[activeLocale] || '';

  const availableLocales = supportedLanguages.filter(
    lang => lang in content || lang === activeLocale
  ) as readonly SupportedLanguage[];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <LocaleTabs
          currentLocale={activeLocale}
          availableLocales={availableLocales}
          onLocaleChange={handleLocaleChange}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Copy to:</span>
          <LocaleSelector
            currentLocale={activeLocale}
            onLocaleChange={handleLocaleChange}
            onCopyToLocale={handleCopyToLocale}
          />
        </div>
      </div>

      <div className="p-4">
        <RichTextEditor
          content={currentContent}
          onChange={handleContentChange}
          placeholder={`${placeholder} (${languageNames[activeLocale]})`}
        />
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <span>Editing:</span>
        <LocaleBadge locale={activeLocale} />
        {Object.keys(content).length > 1 && (
          <span className="ml-2">{Object.keys(content).length} translations available</span>
        )}
      </div>
    </div>
  );
}

interface LocaleAwareInputProps {
  value: LocaleContent;
  onChange: (value: LocaleContent) => void;
  placeholder?: string;
  label?: string;
  currentLocale?: SupportedLanguage;
  onLocaleChange?: (locale: SupportedLanguage) => void;
}

export function LocaleAwareInput({
  value,
  onChange,
  placeholder = 'Enter title...',
  label = 'Title',
  currentLocale = defaultLanguage as SupportedLanguage,
  onLocaleChange,
}: LocaleAwareInputProps) {
  const [activeLocale, setActiveLocale] = useState<SupportedLanguage>(currentLocale);

  const handleLocaleChange = useCallback(
    (locale: SupportedLanguage) => {
      setActiveLocale(locale);
      onLocaleChange?.(locale);
    },
    [onLocaleChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...value,
        [activeLocale]: e.target.value,
      });
    },
    [value, activeLocale, onChange]
  );

  const currentValue = value[activeLocale] || '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <LocaleSelector currentLocale={activeLocale} onLocaleChange={handleLocaleChange} />
      </div>

      <input
        type="text"
        value={currentValue}
        onChange={handleInputChange}
        placeholder={`${placeholder} (${languageNames[activeLocale]})`}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />

      {Object.keys(value).length > 1 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(value).map(([locale, val]) => (
            <div
              key={locale}
              className={`text-xs px-2 py-1 rounded ${
                locale === activeLocale
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {languageNames[locale as SupportedLanguage]}: {val?.substring(0, 30)}
              {val && val.length > 30 ? '...' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { LocaleSelector, LocaleTabs, LocaleBadge };
export type { SupportedLanguage };
