'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { communitySetupSchema, type CommunitySetupFormData } from '@entities/tenant';
import type { PricingPlan } from '@shared/lib';
import { SectionLayout } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { apiGet, apiPost, ApiClientError } from '@/shared/api/http-client';

const log = createComponentLogger('CommunitySetupForm');

export function CommunitySetupForm() {
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CommunitySetupFormData>({
    resolver: zodResolver(communitySetupSchema),
    defaultValues: {
      communityName: '',
      subdomain: '',
      plan: undefined,
    },
  });

  const selectedPlan = watch('plan');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data } = await apiGet<{ plans: PricingPlan[] }>('/api/pricing');
        setPlans(data.plans);
      } catch (fetchError) {
        log.error({}, 'Failed to fetch pricing plans', fetchError);
      } finally {
        setPlansLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const onSubmit = async (data: CommunitySetupFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      try {
        await apiPost('/api/platform/tenants', {
          name: data.communityName,
          slug: data.subdomain,
          plan: data.plan,
        });
      } catch (e) {
        if (e instanceof ApiClientError && e.statusCode === 409) {
          throw new Error('This subdomain is already taken. Please choose another.');
        }
        throw e;
      }

      // On success, redirect to dashboard
      router.push('/dashboard');
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong creating your community. Please try again.';
      setError(message);
      log.error({}, 'Community creation failed', submitError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionLayout size="lg" className="flex-1">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-bark mb-2">Tell us about your community</h2>
          <p className="text-lg text-slate-600">Set up your community&apos;s online presence</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            {!error.includes('already taken') && (
              <p className="mt-1 text-sm text-red-600">If this persists, contact support.</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Community Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Community Name</label>
            <input
              type="text"
              {...register('communityName')}
              placeholder="e.g. Soralia Village HOA"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.communityName && (
              <p className="mt-1 text-sm text-red-600">{errors.communityName.message}</p>
            )}
          </div>

          {/* Subdomain */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subdomain</label>
            <div className="flex items-center">
              <input
                type="text"
                {...register('subdomain')}
                placeholder="soralia"
                className="w-full px-4 py-3 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-slate-500 whitespace-nowrap">
                .netbones.co.za
              </span>
            </div>
            {errors.subdomain && (
              <p className="mt-1 text-sm text-red-600">{errors.subdomain.message}</p>
            )}
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Select a Plan</label>

            {plansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border-2 border-slate-200 rounded-lg p-4 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map(plan => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <label
                      key={plan.id}
                      className={`block border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          value={plan.id}
                          checked={isSelected}
                          onChange={() =>
                            setValue('plan', plan.id as CommunitySetupFormData['plan'], {
                              shouldValidate: true,
                            })
                          }
                          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{plan.name}</span>
                            <span className="text-lg font-bold text-indigo-600">{plan.price}</span>
                          </div>
                          {plan.features && plan.features.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {plan.features.map((feature, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-slate-600 flex items-center gap-1.5"
                                >
                                  <svg
                                    className="w-4 h-4 text-green-500 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
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
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {errors.plan && <p className="mt-1 text-sm text-red-600">{errors.plan.message}</p>}
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-8 py-3 bg-canopy text-white font-semibold rounded-lg hover:bg-canopy-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating Community...
                </span>
              ) : (
                'Create Community'
              )}
            </button>
          </div>
        </form>
      </div>
    </SectionLayout>
  );
}
