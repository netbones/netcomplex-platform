'use client';

import { PageCTA } from '@/components/ui/PageCTA';

export function CTASection() {
  return (
    <PageCTA
      title="Your Complex, Connected"
      description="Join communities that are transforming from managed populations into informed, engaged, and self-expressive, sustainable  networks."
      primaryAction={{
        href: '/signup',
        text: 'Start Free Trial',
      }}
      secondaryAction={{
        href: '/pricing',
        text: 'View Plans',
      }}
      background="lapis"
    />
  );
}
