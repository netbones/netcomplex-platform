import { SectionLayout } from '@shared/ui';

export function PricingFAQ() {
  const faqs = [
    {
      q: 'Can I change plans later?',
      a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.',
    },
    {
      q: 'Is there a free trial?',
      a: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major credit cards and bank transfers for annual plans.',
    },
    {
      q: 'Can I get a refund?',
      a: 'We offer a 30-day money-back guarantee. If you are not satisfied, contact us for a full refund.',
    },
  ];

  return (
    <SectionLayout size="xl" background="fieldstone">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-bark text-center mb-12">
          Frequently Asked Questions
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
