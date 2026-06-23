'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary, ImageUpload } from '@shared/ui';
import { authClient } from '@api/client';
import { supportedLanguages, languageNames } from '@/shared/lib/i18n';
import { usePageLoading } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { useSettings } from '@shared/lib/hooks';

const log = createComponentLogger('settings-page');

const SAFE_IMAGE_PROTOCOLS = ['https:', 'http:'];

function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SAFE_IMAGE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const { t: tCommon } = useTranslation(['common', 'forms']);
  const { i18n } = useTranslation();

  const { isReady, LoadingComponent } = usePageLoading([
    { label: 'Home', href: '/' },
    { label: 'Settings', href: '/settings' },
  ]);
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [language, setLanguage] = useState<string>('en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdImage, setHouseholdImage] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [planType, setPlanType] = useState<string>('');
  const [notificationPrefs, setNotificationPrefs] = useState<
    Record<string, { inApp: boolean; email: boolean }>
  >({});
  const [notifSaving, setNotifSaving] = useState(false);

  const NOTIF_TYPES = ['info', 'warning', 'success', 'error'] as const;
  const NOTIF_LABELS: Record<string, string> = {
    info: 'General updates',
    warning: 'Warnings & alerts',
    success: 'Success confirmations',
    error: 'Error notices',
  };

  const { data: userData, isLoading: loadingHousehold } = useSettings(session?.user?.id);

  useEffect(() => {
    if (!userData) return;
    const data = userData?.data ?? userData;

    if (data.showEmail !== undefined) setShowEmail(data.showEmail);
    if (data.showPhone !== undefined) setShowPhone(data.showPhone);
    if (data.avatar || data.image) setUserAvatar(data.avatar || data.image);
    if (data.notificationPreferences) setNotificationPrefs(data.notificationPreferences);

    if (data.premiumSeat) {
      setPlanType('Premium');
    } else if (data.standardSeats?.length > 0) {
      setPlanType('Standard Seat');
    } else if (data.soloSeats?.length > 0) {
      setPlanType('Solo Seat');
    } else {
      setPlanType('Basic');
    }

    const seat = data.standardSeats?.[0];
    if (seat?.household?.id) {
      setHouseholdId(seat.household.id);
      setIsOwner(seat.isPrimaryOwner === true);
      if (seat.household.homeImage) setHouseholdImage(seat.household.homeImage);
    }
  }, [userData]);

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
      log.error({}, 'Failed to change language', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifPref = useCallback((type: string, channel: 'inApp' | 'email') => {
    setNotificationPrefs(prev => ({
      ...prev,
      [type]: {
        ...(prev[type] || { inApp: true, email: true }),
        [channel]: !(prev[type]?.[channel] ?? true),
      },
    }));
  }, []);

  if (sessionLoading || !isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[{ label: tCommon('nav.home'), href: '/' }, { label: tCommon('nav.settings') }]}
        />

        <div className="flex items-center gap-3 mb-8">
          <img src="/platform/settings.svg" alt="" className="w-10 h-10" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {userAvatar && isSafeImageUrl(userAvatar) ? (
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-2xl">
                      {session?.user?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <ImageUpload
                  value={userAvatar}
                  onChange={async url => {
                    setUserAvatar(url);
                    try {
                      const res = await fetch(`/api/users/${session?.user?.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ avatar: url, image: url }),
                      });

                      // Update better-auth session so the header updates instantly
                      try {
                        await authClient.updateUser({ image: url });
                      } catch (e) {
                        log.error({}, 'Failed to update better-auth session image', e);
                      }

                      if (res.ok) {
                        toast.success('Profile image saved!');
                      } else {
                        toast.error('Failed to save profile image');
                      }
                    } catch {
                      toast.error('Failed to save profile image');
                    }
                  }}
                  label="Change profile photo"
                />
              </div>
            </div>
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

        {householdId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Image</h2>
            <p className="text-sm text-gray-600 mb-4">
              {isOwner
                ? 'Upload a photo of your property. This will be displayed in the directory.'
                : 'Your property photo (managed by property owner).'}
            </p>
            {loadingHousehold ? (
              <p className="text-gray-500">Loading...</p>
            ) : isOwner ? (
              <ImageUpload
                value={householdImage}
                onChange={async url => {
                  setHouseholdImage(url);
                  try {
                    const res = await fetch(`/api/households/${householdId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ homeImage: url }),
                    });
                    if (res.ok) {
                      toast.success('Property image saved!');
                    } else {
                      toast.error('Failed to save property image');
                    }
                  } catch {
                    toast.error('Failed to save property image');
                  }
                }}
                label=""
              />
            ) : householdImage && isSafeImageUrl(householdImage) ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                <img src={householdImage} alt="Property" className="w-full h-full object-cover" />
              </div>
            ) : (
              <p className="text-gray-400 italic">No property image available</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-gray-900 capitalize">
                {session?.user?.role?.toLowerCase() || 'resident'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan</label>
              <p className="mt-1 text-gray-900 capitalize">{planType || 'Loading...'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose which types of notifications you receive and how.
          </p>
          <div className="space-y-3">
            {NOTIF_TYPES.map(type => {
              const pref = notificationPrefs[type] || { inApp: true, email: true };
              return (
                <div
                  key={type}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm font-medium text-gray-700 capitalize w-32">
                    {NOTIF_LABELS[type]}
                  </span>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.inApp}
                        onChange={() => toggleNotifPref(type, 'inApp')}
                        className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
                      />
                      In-app
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.email}
                        onChange={() => toggleNotifPref(type, 'email')}
                        className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
                      />
                      Email
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={async () => {
              if (!session?.user?.id) return;
              setNotifSaving(true);
              try {
                const res = await fetch(`/api/users/${session.user.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notificationPreferences: notificationPrefs }),
                });
                if (res.ok) {
                  toast.success('Notification preferences saved');
                } else {
                  toast.error('Failed to save notification preferences');
                }
              } catch {
                toast.error('Failed to save notification preferences');
              } finally {
                setNotifSaving(false);
              }
            }}
            disabled={notifSaving}
            className="mt-4 px-4 py-2 bg-soralia-primary text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {notifSaving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
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
