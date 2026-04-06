'use client';

import { HeroSection } from '@/components/platform/HeroSection';
import { FeaturesSection } from '@/components/platform/FeaturesSection';
import { CTASection } from '@/components/platform/CTASection';
import { PlatformFooter } from '@/components/platform/PlatformFooter';

export default function PlatformHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <PlatformFooter />
    </div>
  );
}
