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
        message="You can also select some featured content to highlight at the top."
        ctaLabel="Configure now"
        onCtaClick={() => router.push('/dashboard/content/featured')}
        onDismiss={handleDismiss}
      />
      <HomeLayer />
      <MyHomeSpaceWithErrorBoundary />
    </div>
  );
}
