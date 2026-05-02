'use client';

import { HeroSection } from '@shared/ui/HeroSection';
import { MissionSection } from '@shared/ui/MissionSection';
import { FeaturesSection } from '@shared/ui/FeaturesSection';
import { CTASection } from '@shared/ui/CTASection';
import { PlatformFooter } from '@shared/ui/PlatformFooter';
import { PlatformHeader } from '@shared/ui/PlatformHeader';

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
