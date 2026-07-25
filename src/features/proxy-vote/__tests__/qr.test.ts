import { describe, it, expect } from 'vitest';
import { REFERENCE_CODE_FORMAT } from '@/features/proxy-vote/lib/constants';

describe('ProxyQRCode (Wave 0)', () => {
  it('REFERENCE_CODE_FORMAT matches PV-{YYYY}-{NNNN} template', () => {
    expect(REFERENCE_CODE_FORMAT).toBe('PV-{YYYY}-{NNNN}');
  });

  it('REFERENCE_CODE_FORMAT produces deterministic PV-2026-0043 when formatted', () => {
    const next = REFERENCE_CODE_FORMAT.replace('{YYYY}', '2026').replace('{NNNN}', '0043');
    expect(next).toBe('PV-2026-0043');
    expect(next).toMatch(/^PV-\d{4}-\d{4}$/);
  });
});
