'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface OnboardingFormData {
  branding: {
    logoUrl?: string;
    primaryColor: string;
    accentColor?: string;
    fontFamily?: string;
  };
  modules: Record<string, boolean>;
  pages: Record<string, boolean>;
  invites: { email: string; role: string }[];
}

const DEFAULT_FORM_DATA: OnboardingFormData = {
  branding: {
    primaryColor: '#4F46E5',
    accentColor: '',
    fontFamily: 'system',
  },
  modules: {},
  pages: {},
  invites: [],
};

export function useOnboarding(tenantId: string) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM_DATA);

  const saveStep = useCallback(
    async (step: OnboardingStep, data: Record<string, unknown>) => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/platform/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, step, data }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save onboarding progress');
        }

        setFormData(prev => ({ ...prev, ...data }));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [tenantId]
  );

  const handleNext = useCallback(async () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  }, [currentStep]);

  const handleSkip = useCallback(async () => {
    // Skip just advances without saving step data
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    }
  }, [currentStep]);

  const complete = useCallback(() => {
    router.push('/admin');
  }, [router]);

  return {
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
  };
}
