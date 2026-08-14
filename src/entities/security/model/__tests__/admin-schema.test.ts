import { describe, it, expect } from 'vitest';
import {
  securityContactSchema,
  anonymousTipSchema,
  panicAlertSchema,
  alertStatusActionSchema,
} from '../admin-schema';

describe('securityContactSchema', () => {
  const base = { label: 'Main gate', phone: '0821234567', contactType: 'INTERNAL_SECURITY' };

  it('accepts a valid contact', () => {
    expect(securityContactSchema.safeParse(base).success).toBe(true);
  });

  it('accepts EMERGENCY_SERVICES and ARMED_RESPONSE types', () => {
    expect(
      securityContactSchema.safeParse({ ...base, contactType: 'EMERGENCY_SERVICES' }).success
    ).toBe(true);
    expect(
      securityContactSchema.safeParse({ ...base, contactType: 'ARMED_RESPONSE' }).success
    ).toBe(true);
  });

  it('rejects an invalid contact type', () => {
    expect(securityContactSchema.safeParse({ ...base, contactType: 'BOUNCER' }).success).toBe(
      false
    );
  });

  it('rejects a missing label', () => {
    expect(securityContactSchema.safeParse({ ...base, label: ' ' }).success).toBe(false);
  });

  it('rejects a phone with too few digits', () => {
    expect(securityContactSchema.safeParse({ ...base, phone: '12345678' }).success).toBe(false);
  });

  it('rejects a phone with too many digits', () => {
    expect(securityContactSchema.safeParse({ ...base, phone: '1234567890123456' }).success).toBe(
      false
    );
  });

  it('accepts formatted international phones by digit count', () => {
    expect(securityContactSchema.safeParse({ ...base, phone: '+27 82 123 4567' }).success).toBe(
      true
    );
  });

  it('defaults isDefaultCallTarget to false', () => {
    const result = securityContactSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isDefaultCallTarget).toBe(false);
  });

  it('honors an explicit isDefaultCallTarget', () => {
    const result = securityContactSchema.safeParse({ ...base, isDefaultCallTarget: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isDefaultCallTarget).toBe(true);
  });
});

describe('anonymousTipSchema', () => {
  it('requires a non-empty message', () => {
    expect(anonymousTipSchema.safeParse({ message: '' }).success).toBe(false);
    expect(anonymousTipSchema.safeParse({ message: ' ' }).success).toBe(false);
  });

  it('accepts a valid message', () => {
    expect(anonymousTipSchema.safeParse({ message: 'Suspicious van on Elm street' }).success).toBe(
      true
    );
  });

  it('trims the message', () => {
    const result = anonymousTipSchema.safeParse({ message: '  hello  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe('hello');
  });

  it('rejects messages over 2000 chars', () => {
    expect(anonymousTipSchema.safeParse({ message: 'a'.repeat(2001) }).success).toBe(false);
  });
});

describe('panicAlertSchema', () => {
  it('accepts an empty payload (optional location)', () => {
    expect(panicAlertSchema.safeParse({}).success).toBe(true);
  });

  it('accepts numeric location fields', () => {
    const result = panicAlertSchema.safeParse({
      latitude: -26.2041,
      longitude: 28.0473,
      locationAccuracyM: 12.5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric location fields', () => {
    expect(panicAlertSchema.safeParse({ latitude: 'north' }).success).toBe(false);
  });
});

describe('alertStatusActionSchema', () => {
  it('accepts acknowledge, responding, and resolve', () => {
    expect(alertStatusActionSchema.safeParse('acknowledge').success).toBe(true);
    expect(alertStatusActionSchema.safeParse('responding').success).toBe(true);
    expect(alertStatusActionSchema.safeParse('resolve').success).toBe(true);
  });

  it('rejects unknown actions', () => {
    expect(alertStatusActionSchema.safeParse('dismiss').success).toBe(false);
  });
});
