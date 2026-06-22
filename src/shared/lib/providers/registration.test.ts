import { describe, expect, it } from 'vitest';

import {
  buildDueDiligenceChecklist,
  createDueDiligenceRegistrationNote,
  DEFAULT_PROVIDER_REGISTRATION_MODE,
  normalizeProviderRegistrationMode,
  providerRegistrationSchema,
} from './registration';

describe('provider registration helpers', () => {
  it('normalizes invalid registration modes to the secure default', () => {
    expect(normalizeProviderRegistrationMode('OPEN')).toBe('OPEN');
    expect(normalizeProviderRegistrationMode('INVITE_ONLY')).toBe(DEFAULT_PROVIDER_REGISTRATION_MODE);
    expect(normalizeProviderRegistrationMode(undefined)).toBe(DEFAULT_PROVIDER_REGISTRATION_MODE);
  });

  it('parses valid registration input and trims optional empty strings', () => {
    const result = providerRegistrationSchema.parse({
      companyName: '  Bright Spark Electrical  ',
      contactName: '  Jamie Provider ',
      email: 'jamie@example.com',
      phone: '   ',
      trade: ' Electrical ',
      website: 'https://example.com',
      legalAgreements: {
        tos: true,
        privacy: true,
        codeOfConduct: true,
      },
    });

    expect(result.companyName).toBe('Bright Spark Electrical');
    expect(result.contactName).toBe('Jamie Provider');
    expect(result.phone).toBeUndefined();
    expect(result.trade).toBe('Electrical');
  });

  it('requires all legal agreements before registration', () => {
    const result = providerRegistrationSchema.safeParse({
      companyName: 'Provider Co',
      contactName: 'Jamie Provider',
      email: 'jamie@example.com',
      legalAgreements: {
        tos: true,
        privacy: false,
        codeOfConduct: true,
      },
    });

    expect(result.success).toBe(false);
  });

  it('builds a pending due diligence checklist and registration note', () => {
    const checklist = buildDueDiligenceChecklist();
    const note = createDueDiligenceRegistrationNote('https://example.com');

    expect(checklist).toHaveLength(3);
    expect(checklist.every(item => item.status === 'PENDING')).toBe(true);
    expect(note).toContain('Awaiting due diligence review.');
    expect(note).toContain('https://example.com');
  });
});
