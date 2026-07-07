'use client';

import { useTranslation } from 'react-i18next';
import { PageCTA } from '@shared/ui';

export function PricingCTA() {
  const { t } = useTranslation('platform');

  return (
    <PageCTA
      title={t('pricingPage.ctaTitle')}
      description={t('pricingPage.ctaDescription')}
      primaryAction={{
        href: '/contact',
        text: t('pricingPage.contactSales'),
      }}
      secondaryAction={{
        href: '/signup',
        text: t('pricingPage.startFreeTrial'),
      }}
      background="canopy"
    />
  );
}
