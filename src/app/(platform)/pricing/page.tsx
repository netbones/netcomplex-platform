'use client';

import { PricingHeader, PricingCards, PricingFAQ, PricingCTA } from '@features/pricing/ui';

import { PlatformFooter } from '@features/platform/ui';
import { PageLayout } from '@shared/ui/PageLayout';

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
