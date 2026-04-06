'use client';

import { PricingHeader } from '@/components/platform/PricingHeader';
import { PricingCards } from '@/components/platform/PricingCards';
import { PricingFAQ } from '@/components/platform/PricingFAQ';
import { PricingCTA } from '@/components/platform/PricingCTA';
import { PlatformFooter } from '@/components/platform/PlatformFooter';
import { PageLayout } from '@/components/layout/PageLayout';

export default function PricingPage() {
  return (
    <PageLayout>
      <PricingHeader />
      <PricingCards />
      <PricingFAQ />
      <PricingCTA />
      <PlatformFooter />
    </PageLayout>
  );
}
