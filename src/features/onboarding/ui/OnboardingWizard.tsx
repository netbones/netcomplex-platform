'use client';

import { useOnboarding, type OnboardingStep } from '../model/useOnboarding';
import { OnboardingStep as StepWrapper } from './OnboardingStep';
import { BrandingStep } from './steps/BrandingStep';
import { ModulesStep } from './steps/ModulesStep';
import { PagesStep } from './steps/PagesStep';
import { InviteStep } from './steps/InviteStep';
import { LaunchStep } from './steps/LaunchStep';

const STEPS: { label: string; skippable: boolean }[] = [
  { label: 'Branding', skippable: false },
  { label: 'Modules', skippable: true },
  { label: 'Pages', skippable: false },
  { label: 'Invite Team', skippable: true },
  { label: 'Launch', skippable: false },
];

interface OnboardingWizardProps {
  tenantId: string;
}

export function OnboardingWizard({ tenantId }: OnboardingWizardProps) {
  const {
    currentStep,
    loading,
    error,
    formData,
    setFormData,
    saveStep,
    handleNext,
    handleBack,
    handleSkip,
    complete,
  } = useOnboarding(tenantId);

  // Shared props for all steps
  const baseProps = {
    loading,
    error,
    formData,
    setFormData,
    saveStep,
    onNext: handleNext,
    onBack: handleBack,
    onSkip: handleSkip,
    onComplete: complete,
    tenantId,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BrandingStep {...(baseProps as Parameters<typeof BrandingStep>[0])} />;
      case 2:
        return <ModulesStep {...(baseProps as Parameters<typeof ModulesStep>[0])} />;
      case 3:
        return <PagesStep {...(baseProps as Parameters<typeof PagesStep>[0])} />;
      case 4:
        return <InviteStep {...(baseProps as Parameters<typeof InviteStep>[0])} />;
      case 5:
        return <LaunchStep {...(baseProps as Parameters<typeof LaunchStep>[0])} />;
      default:
        return null;
    }
  };

  const stepConfig = STEPS[currentStep - 1];

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Step {currentStep} of 5</span>
          <span className="text-sm font-medium text-gray-500">
            {Math.round((currentStep / 5) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
        {/* Step Labels */}
        <div className="flex justify-between mt-3">
          {STEPS.map((step, index) => (
            <span
              key={step.label}
              className={`text-xs font-medium transition-colors ${
                index + 1 === currentStep
                  ? 'text-indigo-600'
                  : index + 1 < currentStep
                    ? 'text-green-600'
                    : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
            )}
            {stepConfig.skippable && (
              <button
                onClick={handleSkip}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Skip for now
              </button>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : currentStep === 4 ? 'Next' : 'Continue'}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
