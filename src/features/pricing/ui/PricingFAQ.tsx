'use client';

import { useTranslation } from 'react-i18next';
import { SectionLayout } from '@shared/ui';

export function PricingFAQ() {
  const { t } = useTranslation('platform');

  const faqs = [
    { q: t('pricingPage.faqs.q1'), a: t('pricingPage.faqs.a1') },
    { q: t('pricingPage.faqs.q2'), a: t('pricingPage.faqs.a2') },
    { q: t('pricingPage.faqs.q3'), a: t('pricingPage.faqs.a3') },
    { q: t('pricingPage.faqs.q4'), a: t('pricingPage.faqs.a4') },
  ];

  return (
    <SectionLayout size="xl" background="fieldstone">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-bark text-center mb-12">
          {t('pricingPage.faqTitle')}
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-sm transition-shadow"
            >
              <h3 className="text-lg font-semibold text-bark mb-2">{faq.q}</h3>
              <p className="text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionLayout>
  );
}
