'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@api/client';
import { HeroSection, MissionSection, FeaturesSection, CTASection } from '@features/marketing';
import { PlatformFooter, PlatformHeader, NullTenantLanding } from '@features/platform';

const VISITED_LANDING_KEY = 'visited-landing';

export default function PlatformHomePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  // Return-visit detection via localStorage
  const isReturnVisit =
    typeof window !== 'undefined' && localStorage.getItem(VISITED_LANDING_KEY) === 'true';

  // Mark landing as visited on first render
  useEffect(() => {
    if (typeof window !== 'undefined' && !isReturnVisit) {
      localStorage.setItem(VISITED_LANDING_KEY, 'true');
    }
  }, [isReturnVisit]);

  // Loading state — show skeleton while session is checked
  if (isPending) {
    return <NullTenantLanding loading />;
  }

  // Unauthenticated — show public marketing page
  if (!session) {
    return (
      <div className="min-h-screen bg-vellum">
        <PlatformHeader variant="light" />
        <main>
          <HeroSection />
          <MissionSection />
          <FeaturesSection />
          <CTASection />
        </main>
        <PlatformFooter />
      </div>
    );
  }

  // Authenticated user with an existing tenant — redirect to dashboard
  if (session.user.tenantId !== null) {
    router.push('/dashboard');
    return null;
  }

  // Authenticated user with tenantId: null — show null-tenant landing
  // TODO(G2): wire to feature flag enable-demo-tenant when demo tenant exists
  return (
    <div className="min-h-screen bg-vellum">
      <PlatformHeader variant="light" />
      <main>
        <NullTenantLanding showDemo={false} isReturnVisit={isReturnVisit} />
      </main>
      <PlatformFooter />
    </div>
  );
}
