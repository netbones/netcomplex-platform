'use client';

import { useTranslation } from 'react-i18next';
import { PageCTA } from '@/components/ui/PageCTA';

export function CTASection() {
  const { t, ready } = useTranslation('platform');

  if (!ready) {
    return null;
  }

  return (
    <PageCTA
      title={t('cta.title')}
      description={t('cta.description')}
      primaryAction={{
        href: '/signup',
        text: t('cta.primaryAction'),
      }}
      secondaryAction={{
        href: '/pricing',
        text: t('cta.secondaryAction'),
      }}
      background="lapis"
      showAttribution={true}
    />
  );
}
