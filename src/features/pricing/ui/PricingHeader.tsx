'use client';

import { useTranslation } from 'react-i18next';
import { SectionLayout } from '@shared/ui';

export function PricingHeader() {
  const { t } = useTranslation('platform');

  return (
    <SectionLayout size="lg" background="transparent" className="bg-lapis-deep text-white">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          {t('pricingPage.heroTitle')}
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mx-auto">{t('pricingPage.heroSubtitle')}</p>
      </div>
    </SectionLayout>
  );
}
