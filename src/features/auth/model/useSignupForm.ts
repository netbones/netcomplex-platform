'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { authClient } from '@api/client';
import { identitySignupSchema, type IdentitySignupFormData } from '@entities/tenant';

type Step = 1 | 2;

export function useSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<IdentitySignupFormData>({
    resolver: zodResolver(identitySignupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof IdentitySignupFormData)[];

    switch (step) {
      case 1:
        fieldsToValidate = ['firstName', 'lastName', 'email', 'phone'];
        break;
      case 2:
        fieldsToValidate = ['password', 'confirmPassword'];
        break;
      default:
        return true;
    }

    const result = await form.trigger(fieldsToValidate);
    if (!result) {
      setError('Please fix the errors below');
      return false;
    }

    setError('');
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (step < 2) {
      setStep((step + 1) as Step);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      setError('Please fix all errors before submitting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = form.getValues();

      const { error: signUpError } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        callbackURL: '/verify-email',
      });

      if (signUpError) {
        throw new Error(signUpError.message || 'Failed to create account');
      }

      // Account creation requires email verification before a session exists,
      // so we cannot land the user on an authenticated destination yet.
      // Send them to verify their email; after verifying + signing in they reach
      // their community space.
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    step,
    loading,
    error,
    handleNext,
    handleBack,
    setError,
  };
}
