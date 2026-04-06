'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { signupSchema, type SignupFormData } from '@/lib/schemas';

type Step = 1 | 2 | 3;

export function useSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      communityName: '',
      subdomain: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      plan: 'depth',
    },
  });

  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof SignupFormData)[];

    switch (step) {
      case 1:
        fieldsToValidate = ['communityName', 'subdomain', 'plan'];
        break;
      case 2:
        fieldsToValidate = ['firstName', 'lastName', 'email', 'phone'];
        break;
      case 3:
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

    if (step < 3) {
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

      const res = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.communityName,
          slug: data.subdomain,
          plan: data.plan,
          admin: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone || '',
            password: data.password,
          },
        }),
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || 'Failed to create community');
      }

      // Redirect to sign-in page for the new tenant
      const signInUrl = `https://${data.subdomain}.netbones.co.za/sign-in?message=Community created successfully! Please sign in with your credentials.`;
      router.push(signInUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create community';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    form.setValue('subdomain', cleanValue);
  };

  return {
    form,
    step,
    loading,
    error,
    handleNext,
    handleBack,
    handleSubdomainChange,
    setError,
  };
}
