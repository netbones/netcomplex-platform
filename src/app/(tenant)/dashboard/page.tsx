'use client';

import { useState, useEffect } from 'react';
import { HomeLayer } from '@widgets/dashboard';
import { MyHomeSpaceWithErrorBoundary } from '@widgets/dashboard';
import { AchievementsWidget } from '@widgets/dashboard';
import { PromoBanner, HeaderImagePicker } from '@shared/ui';
import { useRouter } from 'next/navigation';
import { authClient } from '@api/client';

export default function DashboardHome() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (role === 'PROVIDER') router.replace('/dashboard/providers');
  }, [role, router]);

  useEffect(() => {
    if (!userId) return;
    setProfileLoading(true);
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(d => {
        const h = d?.profileData?.headerImage || null;
        setHeaderImage(h);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [userId]);

  const handleHeaderSelect = async (url: string) => {
    if (!userId) return;
    setHeaderImage(url);
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileData: { headerImage: url },
      }),
    });
  };

  const handleDismiss = async () => {
    if (!userId) return;
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileData: { featuredContentPromoDismissed: true },
      }),
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {headerImage && (
        <div className="relative -mx-6 -mt-6 mb-0 h-48 sm:h-64 rounded-t-none overflow-hidden">
          <img src={headerImage} alt="Dashboard header" className="w-full h-full object-cover" />
          <button
            onClick={() => setShowPicker(true)}
            className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium bg-white/90 rounded-lg shadow hover:bg-white transition"
          >
            Change
          </button>
        </div>
      )}

      {!headerImage && !profileLoading && (
        <PromoBanner
          message="Customise your dashboard with a header image or choose from the gallery."
          ctaLabel="Customise"
          onCtaClick={() => setShowPicker(true)}
          onDismiss={handleDismiss}
        />
      )}

      <HomeLayer />
      <AchievementsWidget />
      <MyHomeSpaceWithErrorBoundary />

      <HeaderImagePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        currentImage={headerImage || undefined}
        onSelect={handleHeaderSelect}
      />
    </div>
  );
}
