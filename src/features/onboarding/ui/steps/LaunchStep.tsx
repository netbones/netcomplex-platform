'use client';

import { useState } from 'react';
import Link from 'next/link';
import { OnboardingStep } from '../OnboardingStep';
import type { OnboardingFormData } from '../../model/useOnboarding';

interface StepProps {
  loading: boolean;
  error: string;
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  saveStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7, data: Record<string, unknown>) => Promise<boolean>;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  onComplete: () => void;
  tenantId: string;
}

export function LaunchStep({ loading, error, onComplete, saveStep }: StepProps) {
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    const success = await saveStep(7, { completed: true });
    setCompleting(false);
    if (success) {
      onComplete();
    }
  };

  return (
    <OnboardingStep
      title="Your Community is Live!"
      description="Congratulations! Your community site is ready. Here are your next steps."
    >
      <div className="space-y-6 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <i className="fas fa-check-circle text-4xl text-green-600" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Setup Complete</h3>
          <p className="text-gray-600">
            Your community site has been created and is ready for residents.
          </p>
        </div>

        {/* Action Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin"
            className="flex flex-col items-center p-6 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <i className="fas fa-cog text-2xl text-indigo-600 mb-2" />
            <span className="font-medium text-indigo-900">Admin Panel</span>
            <span className="text-xs text-indigo-600 mt-1">Manage your community</span>
          </Link>
          <Link
            href="/"
            className="flex flex-col items-center p-6 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
          >
            <i className="fas fa-globe text-2xl text-green-600 mb-2" />
            <span className="font-medium text-green-900">Public Site</span>
            <span className="text-xs text-green-600 mt-1">View your community</span>
          </Link>
        </div>

        {/* Complete Button */}
        <button
          onClick={handleComplete}
          disabled={completing || loading}
          className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {completing ? 'Completing...' : 'Complete Setup & Go to Admin'}
        </button>

        {/* Back Option */}
        <button
          onClick={() => window.history.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Go back to make changes
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
