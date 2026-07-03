'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { TenantFacility } from '@entities/booking';
import type { TenantCategory } from '@entities/maintenance';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OnboardingFormData {
  branding: {
    logoUrl?: string;
    primaryColor: string;
    accentColor?: string;
    fontFamily?: string;
  };
  modules: Record<string, boolean>;
  facilities: TenantFacility[];
  maintenanceCategories: TenantCategory[];
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
  facilities: [],
  maintenanceCategories: [],
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
          const msg =
            errorData?.error?.message ||
            errorData?.error ||
            errorData?.message ||
            'Failed to save onboarding progress';
          throw new Error(typeof msg === 'string' ? msg : 'Failed to save onboarding progress');
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
    if (currentStep < 7) {
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
    if (currentStep < 7) {
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
