'use client';

import { useSafeTranslation } from '@shared/lib';
import { PageCTA } from '@shared/ui';

export function CTASection() {
  const { tx, ready } = useSafeTranslation('platform');

  if (!ready) {
    return null;
  }

  return (
    <PageCTA
      title={tx('cta.title', 'Get Started Today')}
      description={tx('cta.description', 'Join thousands of communities already on NetComplex')}
      primaryAction={{
        href: '/signup',
        text: tx('cta.primaryAction', 'Sign Up'),
      }}
      secondaryAction={{
        href: '/pricing',
        text: tx('cta.secondaryAction', 'View Pricing'),
      }}
      background="lapis"
      showAttribution={true}
    />
  );
}
