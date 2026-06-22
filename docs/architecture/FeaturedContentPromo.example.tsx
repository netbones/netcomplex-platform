'use client';

/**
 * Example usage — drop this in /dashboard or any other page.
 * Replace the dismiss/cta handlers with real ones once you wire
 * the persisted preference + navigation/modal trigger.
 */

import { PromoBanner } from '@/shared/ui/PromoBanner';
import { useRouter } from 'next/navigation';

export function FeaturedContentPromo() {
  const router = useRouter();

  const handleConfigure = () => {
    router.push('/dashboard/content/featured');
  };

  return (
    <PromoBanner
      message="You can also select some featured content to highlight at the top."
      ctaLabel="Configure now"
      onCtaClick={handleConfigure}
      onDismiss={handleDismiss}
    />
  );
}
