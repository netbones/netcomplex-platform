'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { authClient, trpc } from '@api/client';
import { supportedLanguages, languageNames } from '@/shared/lib/i18n';
import Image from 'next/image';
import { usePageLoading } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { apiPatch } from '@/shared/api/http-client';
import { useUserProfile } from '@shared/lib/hooks';
import {
  ProfileSection,
  LanguageSection,
  PropertySection,
  AccountSection,
  NotificationSection,
  PrivacySection,
} from '@widgets/settings';

const log = createComponentLogger('profile-page');

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
    { label: 'Profile', href: '/profile' },
  ]);
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const tToast = (key: string, entity: string) => tCommon(`toast.${key}`, { entity });

  const [language, setLanguage] = useState<string>('en');
  const [langSaving, setLangSaving] = useState(false);
  const [langSaved, setLangSaved] = useState(false);
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
  const [privacySaving, setPrivacySaving] = useState(false);

  const { data: userData, isLoading: loadingHousehold } = useUserProfile(session?.user?.id);

  useEffect(() => {
    if (!userData) return;
    const data = userData;

    if (data.showEmail !== undefined) setShowEmail(data.showEmail);
    if (data.showPhone !== undefined) setShowPhone(data.showPhone);
    if (data.avatar || data.image) setUserAvatar(data.avatar || data.image || '');
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
    setLangSaving(true);
    setLangSaved(false);
    try {
      await i18n.changeLanguage(newLang);
      setLanguage(newLang);
      setLangSaved(true);
      setTimeout(() => setLangSaved(false), 2000);
    } catch (error) {
      log.error({}, 'Failed to change language', error);
    } finally {
      setLangSaving(false);
    }
  };

  const handleAvatarChange = async (url: string) => {
    setUserAvatar(url);
    try {
      try {
        await apiPatch(`/api/users/${session?.user?.id}`, { avatar: url, image: url });
      } catch {
        toast.error(tToast('failedToUpload', 'profile image'));
        return;
      }
      try {
        await authClient.updateUser({ image: url });
      } catch (e) {
        log.error({}, 'Failed to update better-auth session image', e);
      }
      toast.success(tToast('uploaded', 'Profile image'));
    } catch {
      toast.error(tToast('failedToUpload', 'profile image'));
    }
  };

  const updateHouseholdMutation = trpc.households.updateHousehold.useMutation();

  const handleHouseholdImageChange = async (url: string) => {
    setHouseholdImage(url);
    try {
      await updateHouseholdMutation.mutateAsync({ id: householdId!, homeImage: url });
      toast.success(tToast('uploaded', 'Property image'));
    } catch {
      toast.error(tToast('failedToUpload', 'property image'));
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

  const saveNotificationPrefs = async () => {
    if (!session?.user?.id) return;
    setNotifSaving(true);
    try {
      await apiPatch(`/api/users/${session.user.id}`, {
        notificationPreferences: notificationPrefs,
      });
      toast.success(tToast('updated', 'Notification preferences'));
    } catch {
      toast.error(tToast('failedToSave', 'notification preferences'));
    } finally {
      setNotifSaving(false);
    }
  };

  const savePrivacySettings = async () => {
    if (!session?.user?.id) return;
    setPrivacySaving(true);
    try {
      await apiPatch(`/api/users/${session.user.id}`, { showEmail, showPhone });
      toast.success(tToast('updated', 'Privacy settings'));
    } catch {
      toast.error(tToast('failedToSave', 'settings'));
    } finally {
      setPrivacySaving(false);
    }
  };

  if (sessionLoading || !isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: tCommon('nav.home'), href: '/' }, { label: 'Profile' }]} />

        <div className="flex items-center gap-3 mb-8">
          <Image src="/platform/settings.svg" alt="" width={40} height={40} />
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        </div>

        <ProfileSection
          userName={session?.user?.name ?? ''}
          userEmail={session?.user?.email ?? ''}
          userAvatar={userAvatar}
          onAvatarChange={handleAvatarChange}
          isSafeImageUrl={isSafeImageUrl}
        />

        <LanguageSection
          language={language}
          languages={supportedLanguages}
          languageNames={languageNames}
          onLanguageChange={handleLanguageChange}
          saving={langSaving}
          saved={langSaved}
        />

        <PropertySection
          householdId={householdId}
          householdImage={householdImage}
          isOwner={isOwner}
          loading={loadingHousehold}
          onImageChange={handleHouseholdImageChange}
          isSafeImageUrl={isSafeImageUrl}
        />

        <AccountSection
          role={session?.user?.role?.toLowerCase() || 'resident'}
          planType={planType}
        />

        <NotificationSection
          notificationPrefs={notificationPrefs}
          onToggle={toggleNotifPref}
          onSave={saveNotificationPrefs}
          saving={notifSaving}
        />

        <PrivacySection
          showEmail={showEmail}
          showPhone={showPhone}
          onToggleEmail={setShowEmail}
          onTogglePhone={setShowPhone}
          onSave={savePrivacySettings}
          saving={privacySaving}
        />
      </div>
    </ErrorBoundary>
  );
}
