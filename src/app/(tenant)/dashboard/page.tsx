'use client';

import { HomeLayer } from '@widgets/dashboard';
import { MyHomeSpaceWithErrorBoundary } from '@widgets/dashboard';
import { PromoBanner } from '@shared/ui';
import { useRouter } from 'next/navigation';

export default function DashboardHome() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PromoBanner
        message="You can also select some featured content to highlight at the top."
        ctaLabel="Configure now"
        onCtaClick={() => router.push('/dashboard/content/featured')}
      />
      <HomeLayer />
      <MyHomeSpaceWithErrorBoundary />
    </div>
  );
}
