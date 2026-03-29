'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { authClient } from '@/lib/auth-client';
import { supportedLanguages, languageNames, type SupportedLanguage } from '@/lib/i18n';

export default function SettingsPage() {
  const { t: tCommon, t: tSettings, ready } = useTranslation(['common', 'forms']);
  const { i18n } = useTranslation();
  const { data: session } = authClient.useSession();
  const [language, setLanguage] = useState<string>('en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (i18n.language) {
      setLanguage(i18n.language);
    }
  }, [i18n.language]);

  const handleLanguageChange = async (newLang: string) => {
    setSaving(true);
    setSaved(false);
    try {
      await i18n.changeLanguage(newLang);
      setLanguage(newLang);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[{ label: tCommon('nav.home'), href: '/' }, { label: tCommon('nav.settings') }]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-gray-900">{session?.user?.name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{session?.user?.email || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Language</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select your preferred language for the interface.
        </p>
        <div className="flex flex-wrap gap-3">
          {supportedLanguages.map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
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

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-gray-900 capitalize">
              {session?.user?.role?.toLowerCase() || 'resident'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
