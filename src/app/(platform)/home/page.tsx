'use client';

import { HeroSection } from '@/components/platform/HeroSection';
import { FeaturesSection } from '@/components/platform/FeaturesSection';
import { CTASection } from '@/components/platform/CTASection';
import { PlatformFooter } from '@/components/platform/PlatformFooter';
import { PageLayout } from '@/components/layout/PageLayout';

export default function PlatformHomePage() {
  return (
    <PageLayout>
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <PlatformFooter />
    </PageLayout>
  );
}
