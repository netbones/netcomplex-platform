'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 1 | 2 | 3;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    communityName: '',
    subdomain: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    plan: 'professional',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.communityName.trim()) return 'Community name is required';
    if (!formData.subdomain.trim()) return 'Subdomain is required';
    if (!/^[a-z0-9-]+$/.test(formData.subdomain))
      return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
    if (formData.subdomain.length < 3) return 'Subdomain must be at least 3 characters';
    return '';
  };

  const validateStep2 = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email address';
    return '';
  };

  const validateStep3 = () => {
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return '';
  };

  const handleNext = () => {
    let validation = '';
    if (step === 1) validation = validateStep1();
    if (step === 2) validation = validateStep2();
    if (step === 3) validation = validateStep3();

    if (validation) {
      setError(validation);
      return;
    }

    if (step < 3) {
      setStep((step + 1) as Step);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.communityName,
          slug: formData.subdomain,
          plan: formData.plan,
          admin: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create community');
      }

      router.push('/signup/success?subdomain=' + formData.subdomain);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create community';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Community Details' },
    { num: 2, label: 'Your Information' },
    { num: 3, label: 'Create Account' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s.num ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`ml-3 font-medium ${step >= s.num ? 'text-slate-900' : 'text-slate-500'}`}
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-16 md:w-24 h-0.5 mx-4 ${step > s.num ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">
            {step === 1 && 'Tell us about your community'}
            {step === 2 && 'Your details'}
            {step === 3 && 'Create your account'}
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Community Name
                </label>
                <input
                  type="text"
                  value={formData.communityName}
                  onChange={e => updateField('communityName', e.target.value)}
                  placeholder="e.g. Soralia Village HOA"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subdomain</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={e =>
                      updateField(
                        'subdomain',
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                      )
                    }
                    placeholder="soralia"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-r-none"
                  />
                  <span className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-slate-500">
                    .netbones.co.za
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Your community will be at: {formData.subdomain || 'yourname'}.netbones.co.za
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Plan</label>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { id: 'starter', name: 'Starter', price: 'R299/mo' },
                    { id: 'professional', name: 'Professional', price: 'R599/mo' },
                  ].map(plan => (
                    <label
                      key={plan.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.plan === plan.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={formData.plan === plan.id}
                        onChange={e => updateField('plan', e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-semibold text-slate-900">{plan.name}</div>
                      <div className="text-slate-500 text-sm">{plan.price}</div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => updateField('firstName', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => updateField('lastName', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => updateField('password', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-2 text-sm text-slate-500">Must be at least 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Summary</h3>
                <dl className="text-sm text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <dt>Community:</dt>
                    <dd className="font-medium">{formData.communityName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>URL:</dt>
                    <dd className="font-medium">{formData.subdomain}.netbones.co.za</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Plan:</dt>
                    <dd className="font-medium capitalize">{formData.plan}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Admin:</dt>
                    <dd className="font-medium">
                      {formData.firstName} {formData.lastName}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as Step)}
                className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="ml-auto px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : step === 3 ? 'Create Community' : 'Continue'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
