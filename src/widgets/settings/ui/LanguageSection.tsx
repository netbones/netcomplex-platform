'use client';

interface LanguageSectionProps {
  language: string;
  languages: readonly string[];
  languageNames: Record<string, string>;
  onLanguageChange: (lang: string) => Promise<void>;
  saving: boolean;
  saved: boolean;
}

export function LanguageSection({
  language,
  languages,
  languageNames,
  onLanguageChange,
  saving,
  saved,
}: LanguageSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Language</h2>
      <p className="text-sm text-gray-600 mb-4">
        Select your preferred language for the interface.
      </p>
      <div className="flex flex-wrap gap-3">
        {languages.map(lang => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            disabled={saving}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              language === lang
                ? 'bg-soralia-primary text-white border-soralia-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {languageNames[lang]}
          </button>
        ))}
      </div>
      {saved && <p className="mt-2 text-green-600 text-sm">Language saved!</p>}
    </div>
  );
}
