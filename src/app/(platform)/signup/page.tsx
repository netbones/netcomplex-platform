'use client';

import { useEffect, useState } from 'react';
import { useSignupForm } from '@/features/auth/model/useSignupForm';
import type { PricingPlan } from '@/app/api/pricing/route';
import { PageLayout } from '@shared/ui';
import { SignupHeader, SignupFormSection, SignupCTA } from '@features/auth';

import { PlatformFooter } from '@features/platform';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('signup-page');

export default function SignupPage() {
  const { form, step, loading, error, handleNext, handleBack, handleSubdomainChange } =
    useSignupForm();

  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/pricing');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans);
        }
      } catch (error) {
        log.error({}, 'Failed to fetch pricing plans', error);
      } finally {
        setPlansLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const steps = [
    { num: 1, label: 'Community Details' },
    { num: 2, label: 'Your Information' },
    { num: 3, label: 'Create Account' },
  ];

  return (
    <PageLayout background="fieldstone">
      <SignupHeader steps={steps} currentStep={step} />

      {step === 1 && (
        <SignupFormSection
          title="Tell us about your community"
          description="Set up your community's online presence"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Community Name
              </label>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Subdomain</label>
              <div className="flex items-center">
                <input
                  type="text"
                  {...register('subdomain')}
                  onChange={e => handleSubdomainChange(e.target.value)}
                  placeholder="soralia"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-r-none"
                />
                <span className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-slate-500">
                  .netbones.co.za
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Your community will be at: {watch('subdomain') || 'yourname'}.netbones.co.za
              </p>
              {errors.subdomain && (
                <p className="mt-1 text-sm text-red-600">{errors.subdomain.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Plan</label>
              {plansLoading ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="border-2 rounded-lg p-4 animate-pulse">
                      <div className="h-5 bg-slate-200 rounded mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {plans.slice(0, 2).map(plan => (
                    <label
                      key={plan.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        watch('plan') === plan.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={plan.id}
                        {...register('plan')}
                        className="sr-only"
                      />
                      <div className="font-semibold text-slate-900">{plan.name}</div>
                      <div className="text-slate-500 text-sm">
                        {plan.price === 'Custom' ? 'Custom pricing' : plan.price}
                        {plan.period && plan.price !== 'Custom' && plan.period}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {errors.plan && <p className="mt-1 text-sm text-red-600">{errors.plan.message}</p>}
            </div>
          </div>

          <SignupCTA
            step={step}
            totalSteps={3}
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
            canProceed={true}
          />
        </SignupFormSection>
      )}

      {step === 2 && (
        <SignupFormSection
          title="Your details"
          description="Tell us about yourself as the community administrator"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                <input
                  type="text"
                  {...register('firstName')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                <input
                  type="text"
                  {...register('lastName')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>
          </div>

          <SignupCTA
            step={step}
            totalSteps={3}
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
            canProceed={true}
          />
        </SignupFormSection>
      )}

      {step === 3 && (
        <SignupFormSection
          title="Create your account"
          description="Set up your password and review your community details"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-2 text-sm text-slate-500">Must be at least 8 characters</p>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-medium text-slate-900 mb-2">Summary</h3>
              <dl className="text-sm text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <dt>Community:</dt>
                  <dd className="font-medium">{watch('communityName')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>URL:</dt>
                  <dd className="font-medium">{watch('subdomain')}.netbones.co.za</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Plan:</dt>
                  <dd className="font-medium capitalize">{watch('plan')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Admin:</dt>
                  <dd className="font-medium">
                    {watch('firstName')} {watch('lastName')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <SignupCTA
            step={step}
            totalSteps={3}
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
            canProceed={true}
          />
        </SignupFormSection>
      )}

      <PlatformFooter />
    </PageLayout>
  );
}
