'use client';

import { HeroSection } from '@/components/platform/HeroSection';
import { MissionSection } from '@/components/platform/MissionSection';
import { FeaturesSection } from '@/components/platform/FeaturesSection';
import { CTASection } from '@/components/platform/CTASection';
import { PlatformFooter } from '@/components/platform/PlatformFooter';
import { PlatformHeader } from '@/components/layout/PlatformHeader';

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
