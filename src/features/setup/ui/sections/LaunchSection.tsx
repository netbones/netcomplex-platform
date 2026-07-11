'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAutoSaveSetting } from '../../model/useAutoSaveSetting';

interface LaunchSectionProps {
  tenantId: string;
}

const FONT_OPTIONS = [
  { value: 'system', label: 'System Default' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'lato', label: 'Lato' },
];

const TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf('timeZone')
  : ['UTC', 'Africa/Johannesburg', 'America/New_York', 'Europe/London'];

interface FieldState {
  // Community Name
  name: string;
  // Contact
  contactEmail: string;
  contactPhone: string;
  // Domain
  domain: string;
  // Timezone
  timezone: string;
  // Address
  addressLine1: string;
  addressCity: string;
  addressProvince: string;
  addressPostalCode: string;
  // Branding
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}

const DEFAULT_FIELDS: FieldState = {
  name: '',
  contactEmail: '',
  contactPhone: '',
  domain: '',
  timezone: '',
  addressLine1: '',
  addressCity: '',
  addressProvince: '',
  addressPostalCode: '',
  logoUrl: '',
  primaryColor: '#4F46E5',
  accentColor: '#F59E0B',
  fontFamily: 'system',
};

type FieldKey = keyof FieldState;

function InlineTextInput({
  label,
  value,
  fieldKey,
  placeholder,
  fields,
  setFields,
  saveSetting,
  isSaving,
}: {
  label: string;
  value: string;
  fieldKey: FieldKey;
  placeholder?: string;
  fields: FieldState;
  setFields: (fn: (prev: FieldState) => FieldState) => void;
  saveSetting: (key: string, value: unknown) => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {isSaving && (
        <span className="text-xs text-amber-500 animate-pulse w-16 flex-shrink-0">Saving…</span>
      )}
      <label className="text-sm font-medium text-gray-600 w-28 flex-shrink-0">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => setFields(prev => ({ ...prev, [fieldKey]: e.target.value }))}
        onBlur={() => saveSetting(fieldKey, fields[fieldKey])}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary text-sm"
      />
    </div>
  );
}

function MissionCard({
  id,
  title,
  description,
  isComplete,
  children,
}: {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0">
            {isComplete ? (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9" strokeWidth={2} />
              </svg>
            )}
          </span>
          <div>
            <h4
              className={`text-sm font-semibold ${isComplete ? 'text-gray-500' : 'text-gray-900'}`}
            >
              {title}
            </h4>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          Required
        </span>
      </div>
      <div className="px-4 py-3 space-y-3" data-testid={`mission-${id}`}>
        {children}
      </div>
    </div>
  );
}

export default function LaunchSection({ tenantId }: LaunchSectionProps) {
  const { saveSetting, isSaving, error } = useAutoSaveSetting(tenantId);
  const [fields, setFields] = useState<FieldState>(DEFAULT_FIELDS);

  // Derive completion status for each mission
  const isNameDone = fields.name.trim().length > 0;
  const isContactDone =
    fields.contactEmail.trim().length > 0 && fields.contactPhone.trim().length > 0;
  const isDomainDone = fields.domain.trim().length > 0;
  const isTimezoneDone = fields.timezone.trim().length > 0;
  const isAddressDone =
    fields.addressLine1.trim().length > 0 && fields.addressCity.trim().length > 0;
  const isBrandingDone = fields.primaryColor.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">Launch Your Community</h3>
        <span className="text-xs text-gray-500">6 required missions</span>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* 1. Community Name */}
      <MissionCard
        id="launch-name"
        title="Community Name"
        description="What should your community be called?"
        isComplete={isNameDone}
      >
        <InlineTextInput
          label="Name"
          value={fields.name}
          fieldKey="name"
          placeholder="e.g. Soralia Village"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, v) => saveSetting('launch.name', v)}
          isSaving={isSaving}
        />
      </MissionCard>

      {/* 2. Branding */}
      <MissionCard
        id="launch-branding"
        title="Brand Your Community"
        description="Upload a logo, choose colors, and pick a font."
        isComplete={isBrandingDone}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            {fields.logoUrl ? (
              <Image
                src={fields.logoUrl}
                alt="Logo"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-xs text-center">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  alert('File must be under 2MB');
                  return;
                }
                const reader = new FileReader();
                reader.onload = ev => {
                  const dataUrl = ev.target?.result as string;
                  setFields(prev => ({ ...prev, logoUrl: dataUrl }));
                  saveSetting('launch.branding', {
                    ...serializeBranding(fields),
                    logoUrl: dataUrl,
                  });
                };
                reader.readAsDataURL(file);
              }}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-soralia-primary/10 file:text-soralia-primary hover:file:bg-soralia-primary/20"
            />
          </div>
        </div>

        {/* Primary Color */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-28 flex-shrink-0">
            Primary Color
          </label>
          <input
            type="color"
            value={fields.primaryColor}
            onChange={e => {
              const v = e.target.value;
              setFields(prev => ({ ...prev, primaryColor: v }));
            }}
            onBlur={() => saveSetting('launch.branding', serializeBranding(fields))}
            className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={fields.primaryColor}
            onChange={e => setFields(prev => ({ ...prev, primaryColor: e.target.value }))}
            onBlur={() => saveSetting('launch.branding', serializeBranding(fields))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary text-sm"
            placeholder="#4F46E5"
          />
        </div>

        {/* Accent Color */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-28 flex-shrink-0">
            Accent Color
          </label>
          <input
            type="color"
            value={fields.accentColor}
            onChange={e => setFields(prev => ({ ...prev, accentColor: e.target.value }))}
            onBlur={() => saveSetting('launch.branding', serializeBranding(fields))}
            className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={fields.accentColor}
            onChange={e => setFields(prev => ({ ...prev, accentColor: e.target.value }))}
            onBlur={() => saveSetting('launch.branding', serializeBranding(fields))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary text-sm"
            placeholder="#F59E0B"
          />
        </div>

        {/* Font Family */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-28 flex-shrink-0">Font</label>
          <select
            value={fields.fontFamily}
            onChange={e => setFields(prev => ({ ...prev, fontFamily: e.target.value }))}
            onBlur={() => saveSetting('launch.branding', serializeBranding(fields))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary text-sm"
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </MissionCard>

      {/* 3. Contact Details */}
      <MissionCard
        id="launch-contact"
        title="Contact Details"
        description="How can residents reach you?"
        isComplete={isContactDone}
      >
        <InlineTextInput
          label="Email"
          value={fields.contactEmail}
          fieldKey="contactEmail"
          placeholder="hello@soralia.co.za"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, _v) => saveSetting('launch.contact', serializeContact(fields))}
          isSaving={isSaving}
        />
        <InlineTextInput
          label="Phone"
          value={fields.contactPhone}
          fieldKey="contactPhone"
          placeholder="+27 11 234 5678"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, _v) => saveSetting('launch.contact', serializeContact(fields))}
          isSaving={isSaving}
        />
      </MissionCard>

      {/* 4. Domain */}
      <MissionCard
        id="launch-domain"
        title="Connect a Domain"
        description="Where can residents find your community online?"
        isComplete={isDomainDone}
      >
        <InlineTextInput
          label="Domain"
          value={fields.domain}
          fieldKey="domain"
          placeholder="soralia.netbones.co.za"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, v) => saveSetting('launch.domain', v)}
          isSaving={isSaving}
        />
      </MissionCard>

      {/* 5. Timezone */}
      <MissionCard
        id="launch-timezone"
        title="Set Your Timezone"
        description="Events and reminders will use this timezone."
        isComplete={isTimezoneDone}
      >
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-xs text-amber-500 animate-pulse w-16 flex-shrink-0">Saving…</span>
          )}
          <label className="text-sm font-medium text-gray-600 w-28 flex-shrink-0">Timezone</label>
          <select
            value={fields.timezone}
            onChange={e => setFields(prev => ({ ...prev, timezone: e.target.value }))}
            onBlur={() => saveSetting('launch.timezone', fields.timezone)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary text-sm"
          >
            <option value="">Select timezone…</option>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </MissionCard>

      {/* 6. Address */}
      <MissionCard
        id="launch-address"
        title="Add Your Address"
        description="Set the physical address for maps and directions."
        isComplete={isAddressDone}
      >
        <InlineTextInput
          label="Line 1"
          value={fields.addressLine1}
          fieldKey="addressLine1"
          placeholder="123 Village Road"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, _v) => saveSetting('launch.address', serializeAddress(fields))}
          isSaving={isSaving}
        />
        <InlineTextInput
          label="City"
          value={fields.addressCity}
          fieldKey="addressCity"
          placeholder="Johannesburg"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, _v) => saveSetting('launch.address', serializeAddress(fields))}
          isSaving={isSaving}
        />
        <InlineTextInput
          label="Province"
          value={fields.addressProvince}
          fieldKey="addressProvince"
          placeholder="Gauteng"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, _v) => saveSetting('launch.address', serializeAddress(fields))}
          isSaving={isSaving}
        />
        <InlineTextInput
          label="Postal Code"
          value={fields.addressPostalCode}
          fieldKey="addressPostalCode"
          placeholder="2000"
          fields={fields}
          setFields={setFields}
          saveSetting={(_, _v) => saveSetting('launch.address', serializeAddress(fields))}
          isSaving={isSaving}
        />
      </MissionCard>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function serializeBranding(f: FieldState) {
  return {
    logoUrl: f.logoUrl,
    primaryColor: f.primaryColor,
    accentColor: f.accentColor,
    fontFamily: f.fontFamily,
  };
}

function serializeContact(f: FieldState) {
  return { email: f.contactEmail, phone: f.contactPhone };
}

function serializeAddress(f: FieldState) {
  return {
    line1: f.addressLine1,
    city: f.addressCity,
    province: f.addressProvince,
    postalCode: f.addressPostalCode,
  };
}
