'use client';

import { PricingHeader } from '@shared/ui/PricingHeader';
import { PricingCards } from '@shared/ui/PricingCards';
import { PricingFAQ } from '@shared/ui/PricingFAQ';
import { PricingCTA } from '@shared/ui/PricingCTA';
import { PlatformFooter } from '@shared/ui/PlatformFooter';
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
