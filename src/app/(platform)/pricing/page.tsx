'use client';

import { PricingHeader, PricingCards, PricingFAQ, PricingCTA } from '@features/pricing';

import { PlatformFooter, PlatformHeader } from '@features/platform';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-vellum">
      <PlatformHeader variant="light" />
      <main>
        <PricingHeader />
        <PricingCards />
        <PricingFAQ />
        <PricingCTA />
      </main>
      <PlatformFooter />
    </div>
  );
}
