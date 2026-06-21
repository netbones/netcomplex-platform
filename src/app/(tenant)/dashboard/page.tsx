'use client';

import { HomeLayer } from '@widgets/dashboard';
import { MyHomeSpaceWithErrorBoundary } from '@widgets/dashboard';
import { PromoBanner } from '@shared/ui';
import { useRouter } from 'next/navigation';
import { authClient } from '@api/client';

export default function DashboardHome() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

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
      <PromoBanner
        message="Customise your dashboard with a header image or choose from the gallery."
        ctaLabel="Customise"
        onCtaClick={() => router.push('/dashboard')}
        onDismiss={handleDismiss}
      />
      <HomeLayer />
      <MyHomeSpaceWithErrorBoundary />
    </div>
  );
}
