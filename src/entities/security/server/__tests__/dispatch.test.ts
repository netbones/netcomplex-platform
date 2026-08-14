import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { infoMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ info: infoMock, error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { dispatchPanicAlert } from '../dispatch';

const ORIGINAL = process.env.SECURITY_DISPATCH_ENABLED;

describe('dispatchPanicAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.SECURITY_DISPATCH_ENABLED;
    else process.env.SECURITY_DISPATCH_ENABLED = ORIGINAL;
  });

  it('fails closed when SECURITY_DISPATCH_ENABLED is not true', async () => {
    delete process.env.SECURITY_DISPATCH_ENABLED;
    const result = await dispatchPanicAlert({
      tenantId: 'tenant-1',
      alertId: 'alert-1',
      defaultContactPhone: '0821234567',
    });

    expect(result.success).toBe(false);
    expect(result.channel).toBe('none');
    expect(result.errorMessage).toContain('Emergency dispatch is not enabled');
  });

  it('fails closed when explicitly disabled even with a contact', async () => {
    process.env.SECURITY_DISPATCH_ENABLED = 'false';
    const result = await dispatchPanicAlert({
      tenantId: 'tenant-1',
      alertId: 'alert-1',
      defaultContactPhone: '0821234567',
    });

    expect(result.success).toBe(false);
    expect(result.channel).toBe('none');
  });

  it('fails closed when no default contact is configured', async () => {
    process.env.SECURITY_DISPATCH_ENABLED = 'true';
    const result = await dispatchPanicAlert({
      tenantId: 'tenant-1',
      alertId: 'alert-1',
      defaultContactPhone: null,
    });

    expect(result.success).toBe(false);
    expect(result.channel).toBe('none');
    expect(result.errorMessage).toContain('No default security contact is configured');
  });

  it('fails closed when the dispatch adapter is not wired (integration point)', async () => {
    process.env.SECURITY_DISPATCH_ENABLED = 'true';
    const result = await dispatchPanicAlert({
      tenantId: 'tenant-1',
      alertId: 'alert-1',
      defaultContactPhone: '0821234567',
    });

    expect(result.success).toBe(false);
    expect(result.channel).toBe('sms_push');
    expect(result.errorMessage).toContain('not fully configured');
    expect(infoMock).toHaveBeenCalled();
  });
});
