'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { authClient } from '@/lib/auth-client';
import { supportedLanguages, languageNames, type SupportedLanguage } from '@/lib/i18n';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function SettingsPage() {
  const { t: tCommon, t: tSettings } = useTranslation(['common', 'forms']);
  const { i18n } = useTranslation();

  const { isReady, LoadingComponent } = usePageLoading([
    { label: 'Home', href: '/' },
    { label: 'Settings', href: '/settings' },
  ]);
  const { data: session } = authClient.useSession();
  const [language, setLanguage] = useState<string>('en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);

  useEffect(() => {
    if (i18n.language) {
      setLanguage(i18n.language);
    }
  }, [i18n.language]);

  useEffect(() => {
    async function fetchUserSettings() {
      if (!session?.user?.id) return;
      const res = await fetch(`/api/users/${session.user.id}`);
      const data = await res.json();
      if (data.showEmail !== undefined) setShowEmail(data.showEmail);
      if (data.showPhone !== undefined) setShowPhone(data.showPhone);
    }
    fetchUserSettings();
  }, [session?.user?.id]);

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

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy</h2>
          <p className="text-sm text-gray-600 mb-4">
            Control what information is visible on your public profile.
          </p>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showEmail}
                onChange={e => setShowEmail(e.target.checked)}
                className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
              />
              <span className="text-gray-700">Show email on public profile</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={e => setShowPhone(e.target.checked)}
                className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
              />
              <span className="text-gray-700">Show phone number on public profile</span>
            </label>
          </div>
          <button
            onClick={async () => {
              if (!session?.user?.id) return;
              setSaving(true);
              try {
                const res = await fetch(`/api/users/${session.user.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ showEmail, showPhone }),
                });
                if (res.ok) {
                  toast.success('Privacy settings saved');
                } else {
                  toast.error('Failed to save settings');
                }
              } catch {
                toast.error('Failed to save settings');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className="mt-4 px-4 py-2 bg-soralia-primary text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Privacy Settings'}
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
