'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SectionLayout } from '@shared/ui';
import type { PricingPlan } from '../model/types';

export function PricingCards() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPricing() {
      try {
        const response = await fetch('/api/pricing');
        if (!response.ok) {
          throw new Error('Failed to fetch pricing data');
        }
        const data = await response.json();
        setPlans(data.data?.plans || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pricing');
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, []);

  if (loading) {
    return (
      <SectionLayout size="xl">
        <div className="grid md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border-2 border-slate-200 p-8 animate-pulse"
            >
              <div className="h-8 bg-fieldstone rounded mb-4"></div>
              <div className="h-4 bg-fieldstone rounded mb-6"></div>
              <div className="h-12 bg-fieldstone rounded mb-6"></div>
              <div className="space-y-3 mb-8">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 bg-fieldstone rounded"></div>
                ))}
              </div>
              <div className="h-12 bg-fieldstone rounded"></div>
            </div>
          ))}
        </div>
      </SectionLayout>
    );
  }

  if (error) {
    return (
      <SectionLayout size="xl">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load pricing</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout size="xl">
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border-2 ${
              plan.popular
                ? 'border-gold-vein shadow-xl scale-105'
                : 'border-lapis-azure/30 shadow-sm'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-gold-vein text-lapis-deep px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            <div className="p-8">
              <h3 className="text-2xl font-bold text-lapis-deep mb-2">{plan.name}</h3>
              <p className="text-lapis-mid mb-6">{plan.description}</p>
              <div className="mb-6">
                {plan.price === 'Custom' ? (
                  <span className="text-4xl font-bold text-lapis-deep">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-lapis-deep">{plan.price}</span>
                    <span className="text-lapis-mid">{plan.period}</span>
                  </>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-center text-lapis-mid">
                    <svg
                      className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0"
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
                    ? 'bg-gold-vein hover:bg-gold-vein/90 text-lapis-deep'
                    : 'bg-vellum hover:bg-vellum-light text-lapis-deep'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </SectionLayout>
  );
}
