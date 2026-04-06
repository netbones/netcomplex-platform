'use client';

import { PricingHeader } from '@/components/platform/PricingHeader';
import { PricingCards } from '@/components/platform/PricingCards';
import { PricingFAQ } from '@/components/platform/PricingFAQ';
import { PricingCTA } from '@/components/platform/PricingCTA';
import { PlatformFooter } from '@/components/platform/PlatformFooter';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PricingHeader />
      <PricingCards />
      <PricingFAQ />
      <PricingCTA />
      <PlatformFooter />
    </div>
  );
}
