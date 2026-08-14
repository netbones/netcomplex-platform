import { describe, it, expect } from 'vitest';
import {
  createVisitorSchema,
  quickAccessCodeSchema,
  accessRequestActionSchema,
  manualAccessEventSchema,
  accessEventsQuerySchema,
} from '../schemas';

describe('createVisitorSchema', () => {
  const base = {
    fullName: 'Jane Doe',
    visitorType: 'WALK_IN',
    visitType: 'SINGLE',
    validFrom: '2026-01-01T10:00:00.000Z',
  };

  it('accepts a minimal valid walk-in visitor', () => {
    const result = createVisitorSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = createVisitorSchema.safeParse({ ...base, fullName: '  ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('fullName'))).toBe(true);
    }
  });

  it('trims padded values', () => {
    const result = createVisitorSchema.safeParse({ ...base, phone: '  +2712345678  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe('+2712345678');
  });

  it('defaults visitType to SINGLE', () => {
    const result = createVisitorSchema.safeParse({
      fullName: 'Jane Doe',
      visitorType: 'WALK_IN',
      validFrom: '2026-01-01T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.visitType).toBe('SINGLE');
  });

  it('requires vehicleReg and phone for VEHICLE visitors', () => {
    const result = createVisitorSchema.safeParse({ ...base, visitorType: 'VEHICLE' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'));
      expect(paths).toContain('vehicleReg');
      expect(paths).toContain('phone');
    }
  });

  it('accepts a complete VEHICLE visitor', () => {
    const result = createVisitorSchema.safeParse({
      ...base,
      visitorType: 'VEHICLE',
      phone: '+2712345678',
      vehicleReg: 'ABC123GP',
    });
    expect(result.success).toBe(true);
  });

  it('requires recurrenceRule for RECURRING visits', () => {
    const result = createVisitorSchema.safeParse({ ...base, visitType: 'RECURRING' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('recurrenceRule'))).toBe(true);
    }
  });

  it('accepts RECURRING visits with a recurrence rule', () => {
    const result = createVisitorSchema.safeParse({
      ...base,
      visitType: 'RECURRING',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
    });
    expect(result.success).toBe(true);
  });
});

describe('quickAccessCodeSchema', () => {
  it('requires a name and trims it', () => {
    const ok = quickAccessCodeSchema.safeParse({ fullName: '  Sam  ' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.fullName).toBe('Sam');
  });

  it('rejects an empty name', () => {
    const result = quickAccessCodeSchema.safeParse({ fullName: '   ' });
    expect(result.success).toBe(false);
  });

  it('allows optional null phone', () => {
    const result = quickAccessCodeSchema.safeParse({ fullName: 'Sam', phone: null });
    expect(result.success).toBe(true);
  });
});

describe('accessRequestActionSchema', () => {
  it('accepts allow and deny', () => {
    expect(accessRequestActionSchema.safeParse('allow').success).toBe(true);
    expect(accessRequestActionSchema.safeParse('deny').success).toBe(true);
  });

  it('rejects unknown actions', () => {
    expect(accessRequestActionSchema.safeParse('ban').success).toBe(false);
  });
});

describe('manualAccessEventSchema', () => {
  const base = { visitorLabel: 'Courier', state: 'GRANTED' };

  it('accepts a minimal manual event', () => {
    const result = manualAccessEventSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('rejects missing state', () => {
    const result = manualAccessEventSchema.safeParse({ visitorLabel: 'Courier' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid state values', () => {
    const result = manualAccessEventSchema.safeParse({ ...base, state: 'MAYBE' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty visitor label', () => {
    const result = manualAccessEventSchema.safeParse({ visitorLabel: '', state: 'GRANTED' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid propertyId', () => {
    const result = manualAccessEventSchema.safeParse({ ...base, propertyId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid uuid propertyId', () => {
    const result = manualAccessEventSchema.safeParse({
      ...base,
      propertyId: 'b1e2a45c-6d5e-4f8a-9b2c-3f0a9e8d7c6b',
    });
    expect(result.success).toBe(true);
  });
});

describe('accessEventsQuerySchema', () => {
  it('accepts an empty query', () => {
    const result = accessEventsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid filters including ANY', () => {
    const result = accessEventsQuerySchema.safeParse({
      q: 'jane',
      state: 'ANY',
      method: 'QR',
      range: '7d',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown state values', () => {
    const result = accessEventsQuerySchema.safeParse({ state: 'BOGUS' });
    expect(result.success).toBe(false);
  });
});
