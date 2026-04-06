'use client';

import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: 'R299',
      period: '/month',
      description: 'Perfect for small communities up to 50 units',
      features: [
        'Up to 50 units',
        'Resident directory',
        'Basic announcements',
        'Maintenance requests',
        'Email support',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Professional',
      price: 'R599',
      period: '/month',
      description: 'For growing communities with more needs',
      features: [
        'Up to 200 units',
        'Everything in Starter',
        'Facility bookings',
        'Event management',
        'Surveys & voting',
        'Custom branding',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large HOAs and property management companies',
      features: [
        'Unlimited units',
        'Everything in Professional',
        'Multiple communities',
        'Advanced analytics',
        'API access',
        'Dedicated account manager',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Choose the plan that fits your community. All plans include a 14-day free trial.
          </p>
        </div>
      </header>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative bg-white rounded-2xl border-2 ${
                  plan.popular
                    ? 'border-indigo-600 shadow-xl scale-105'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-600 mb-6">{plan.description}</p>
                  <div className="mb-6">
                    {plan.price === 'Custom' ? (
                      <span className="text-4xl font-bold text-slate-900">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                        <span className="text-slate-500">{plan.period}</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-center text-slate-600">
                        <svg
                          className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`block w-full py-3 px-6 text-center font-semibold rounded-lg transition-colors ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
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
            ].map((faq, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Still have questions?</h2>
          <p className="text-xl text-indigo-100 mb-8">
            Our team is here to help you find the right plan for your community.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Contact Sales
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          <p>© 2026 NetComplex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
