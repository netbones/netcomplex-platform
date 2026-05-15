'use client';

import { useState } from 'react';
import { OnboardingStep } from '../OnboardingStep';
import type { OnboardingFormData } from '../../model/useOnboarding';

interface StepProps {
  loading: boolean;
  error: string;
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  saveStep: (step: 1 | 2 | 3 | 4 | 5, data: Record<string, unknown>) => Promise<boolean>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete?: () => void;
  tenantId: string;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'BOARD', label: 'Board Member' },
];

export function InviteStep({
  loading,
  error,
  formData,
  setFormData,
  saveStep,
  onNext,
  onSkip,
}: StepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [saving, setSaving] = useState(false);

  const addInvite = () => {
    if (!email || !email.includes('@')) return;
    setFormData(prev => ({
      ...prev,
      invites: [...prev.invites, { email, role }],
    }));
    setEmail('');
    setRole('ADMIN');
  };

  const removeInvite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      invites: prev.invites.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // First save to onboarding settings (existing behavior)
    const success = await saveStep(4, { invites: formData.invites });
    if (!success) {
      setSaving(false);
      return;
    }

    // Then send actual invitations
    const errors: string[] = [];
    for (const invite of formData.invites) {
      try {
        const res = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: invite.email,
            name: invite.email.split('@')[0],
            role: invite.role,
            residentType: 'OWNER',
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          errors.push(`${invite.email}: ${data.error || 'Failed'}`);
        }
      } catch {
        errors.push(`${invite.email}: Network error`);
      }
    }

    setSaving(false);
    if (errors.length > 0) {
      console.error('Invitation errors:', errors);
    }
    onNext();
  };

  return (
    <OnboardingStep
      title="Invite Your Team"
      description="Add co-administrators or board members to help manage your community."
    >
      <div className="space-y-4">
        {/* Add Invite */}
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onKeyDown={e => e.key === 'Enter' && addInvite()}
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            onClick={addInvite}
            disabled={!email || !email.includes('@')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* Invite List */}
        {formData.invites.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-500">Pending Invites</h4>
            {formData.invites.map((invite, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {invite.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                    <p className="text-xs text-gray-500">
                      {ROLE_OPTIONS.find(r => r.value === invite.role)?.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeInvite(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
          </div>
        )}

        {formData.invites.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <i className="fas fa-user-plus text-2xl mb-2" />
            <p className="text-sm">No invites added yet</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onSkip}
            disabled={loading}
            className="flex-1 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
