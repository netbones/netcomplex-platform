'use client';

import { PricingHeader, PricingCards, PricingFAQ, PricingCTA } from '@features/pricing';

import { PlatformFooter } from '@features/platform';
import { PageLayout } from '@shared/ui';

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
