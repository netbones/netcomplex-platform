'use client';

import { useSignupForm, SignupHeader, SignupFormSection, SignupCTA } from '@features/auth';
import { PageLayout } from '@shared/ui';

import { PlatformFooter } from '@features/platform';

export default function SignupPage() {
  const { form, step, loading, error, handleNext, handleBack } = useSignupForm();

  const {
    register,
    formState: { errors },
  } = form;

  const steps = [
    { num: 1, label: 'Your Information' },
    { num: 2, label: 'Create Account' },
  ];

  return (
    <PageLayout background="fieldstone">
      <SignupHeader steps={steps} currentStep={step} />

      {step === 1 && (
        <SignupFormSection
          title="Create your account"
          description="Enter your details to get started with NetComplex"
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
            totalSteps={2}
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
            canProceed={true}
          />
        </SignupFormSection>
      )}

      {step === 2 && (
        <SignupFormSection
          title="Create your account"
          description="Set up your password to complete registration"
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
          </div>

          <SignupCTA
            step={step}
            totalSteps={2}
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
