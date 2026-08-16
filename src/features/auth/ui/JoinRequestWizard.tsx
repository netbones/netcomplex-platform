'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Honeypot, TurnstileWidget } from '@shared/ui';
import { apiGet, apiPost, ApiClientError } from '@/shared/api/http-client';

type RelationshipType = 'OWNER_RESIDENT' | 'OWNER_LEASING' | 'TENANT_RENTER' | 'ADDITIONAL_USER';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface PropertyMatch {
  id: string;
  tenantId: string;
  street: string;
  unit: string;
}

interface VehicleDraft {
  make: string;
  model: string;
  color: string;
  registration: string;
}

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: 'OWNER_RESIDENT', label: "I'm the owner and reside in the property" },
  { value: 'OWNER_LEASING', label: "I'm the owner and lease the property" },
  { value: 'TENANT_RENTER', label: "I'm a tenant and rent this property" },
  { value: 'ADDITIONAL_USER', label: "I'm an additional user" },
];

const STEP_LABELS = [
  'Your details',
  'Relationship to property',
  'Vehicles (optional)',
  'Review and submit',
];

export function JoinRequestWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [propertyNumber, setPropertyNumber] = useState('');
  const [propertyMatch, setPropertyMatch] = useState<PropertyMatch | null>(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDraft[]>([]);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTurnstileSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '');
    apiGet<TenantOption[]>('/api/join-requests/tenants')
      .then(({ data }) => setTenants(data ?? []))
      .catch(() => setTenants([]));
  }, []);

  const selectedTenant = useMemo(() => tenants.find(t => t.id === tenantId), [tenants, tenantId]);

  const lookupProperty = async () => {
    setError('');
    setPropertyMatch(null);
    if (!tenantId || !propertyNumber) return;
    try {
      const { data } = await apiGet<PropertyMatch>(
        `/api/join-requests/property?tenantId=${encodeURIComponent(tenantId)}&propertyNumber=${encodeURIComponent(propertyNumber)}`
      );
      setPropertyMatch(data);
    } catch (err) {
      setPropertyMatch(null);
      if (err instanceof ApiClientError && err.statusCode === 404) {
        setError('No matching property found for that unit number.');
      } else {
        setError('Property lookup failed. Please try again.');
      }
    }
  };

  const addVehicle = () => {
    setVehicles(prev => [...prev, { make: '', model: '', color: '', registration: '' }]);
  };

  const updateVehicle = (index: number, patch: Partial<VehicleDraft>) => {
    setVehicles(prev => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const removeVehicle = (index: number) => {
    setVehicles(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (): boolean => {
    setError('');
    if (step === 0) {
      if (!name || !email || !tenantId || !propertyNumber) {
        setError('Fill in name, email, community, and property number.');
        return false;
      }
      if (!rulesAccepted) {
        setError("Please confirm you've read the estate rules.");
        return false;
      }
      if (!propertyMatch) {
        setError('Please confirm your property number matches.');
        return false;
      }
    }
    if (step === 1 && !relationshipType) {
      setError('Choose how you relate to this property.');
      return false;
    }
    if (step === 2) {
      for (const v of vehicles) {
        if (!v.registration.trim()) {
          setError('Every vehicle needs a registration number.');
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await apiPost('/api/join-requests', {
        tenantId,
        propertyId: propertyMatch?.id ?? null,
        propertyNumberRaw: propertyNumber,
        relationshipType,
        requestedName: name,
        requestedSurname: surname,
        requestedEmail: email,
        requestedPhone: phone,
        rulesAcceptedAt: new Date().toISOString(),
        turnstileToken,
        vehicles: vehicles.filter(v => v.registration.trim()),
      });
      router.push('/join-request/success');
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to submit request';
      setError(message);
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30"
            aria-label="Back"
          >
            ‹
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Join your community</h1>
          <span className="w-8" />
        </div>

        <div className="flex gap-1.5 mb-3">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full"
              style={{ background: i <= step ? '#4F46E5' : '#e5e7eb' }}
            />
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
        </p>

        {step === 0 && (
          <div className="space-y-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={surname}
              onChange={e => setSurname(e.target.value)}
              placeholder="Surname (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={tenantId}
              onChange={e => {
                setTenantId(e.target.value);
                setPropertyMatch(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Community</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                value={propertyNumber}
                onChange={e => setPropertyNumber(e.target.value)}
                onBlur={() => void lookupProperty()}
                placeholder="Property number"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => void lookupProperty()}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Look up
              </button>
            </div>

            {propertyMatch && (
              <p className="text-sm text-green-700">
                ✓ {propertyMatch.street} · Unit {propertyMatch.unit}
              </p>
            )}

            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={e => setRulesAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <span>I&apos;ve read the estate rules for this community</span>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            {RELATIONSHIP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRelationshipType(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-md border text-sm transition ${
                  relationshipType === opt.value
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {vehicles.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={v.make}
                  onChange={e => updateVehicle(i, { make: e.target.value })}
                  placeholder="Make and model"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  value={v.registration}
                  onChange={e => updateVehicle(i, { registration: e.target.value })}
                  placeholder="Registration"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeVehicle(i)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Remove vehicle"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addVehicle}
              className="w-full py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:bg-gray-50"
            >
              + Add vehicle
            </button>
            <div className="bg-green-50 rounded-md px-3 py-2 text-sm text-green-700">
              Vehicle details are only visible to your community&apos;s managing agency and
              management committee.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 rounded-md p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900">{[name, surname].filter(Boolean).join(' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Community</span>
                <span className="text-gray-900">{selectedTenant?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Property number</span>
                <span className="text-gray-900">{propertyNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Relationship</span>
                <span className="text-gray-900">
                  {RELATIONSHIP_OPTIONS.find(o => o.value === relationshipType)?.label ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicles</span>
                <span className="text-gray-900">
                  {vehicles.filter(v => v.registration.trim()).length} added
                </span>
              </div>
            </div>

            <div className="bg-amber-50 rounded-md px-3 py-2 text-sm text-amber-700">
              You won&apos;t be able to sign in until your community admin approves this request.
            </div>

            {turnstileSiteKey && (
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                theme="auto"
                onTokenChange={setTurnstileToken}
              />
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => void handleNext()}
          disabled={submitting}
          className="mt-5 w-full bg-indigo-600 text-white py-2.5 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : step === 3 ? 'Submit request' : 'Next'}
        </button>

        <Honeypot />
      </div>
    </div>
  );
}
