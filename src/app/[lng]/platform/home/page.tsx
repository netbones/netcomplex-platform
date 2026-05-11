'use client';

import { HeroSection, MissionSection, FeaturesSection, CTASection } from '@features/marketing/ui';

import { PlatformFooter, PlatformHeader } from '@features/platform/ui';

export default function PlatformHomePage() {
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
