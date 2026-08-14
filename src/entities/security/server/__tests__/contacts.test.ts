import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

const { selectMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('@api/server', () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
  securityContacts: {
    tenantId: { name: 'tenantId' },
    isDefaultCallTarget: { name: 'isDefaultCallTarget' },
    id: { name: 'id' },
  },
}));

import { clearDefaultSecurityContact, setDefaultSecurityContact } from '../contacts';

describe('clearDefaultSecurityContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectMock.mockReturnValue(makeSelectChain([]));
    updateMock.mockReturnValue(makeUpdateChain([]));
  });

  it('clears every default contact when no exceptId is given', async () => {
    selectMock.mockReturnValue(makeSelectChain([{ id: 'c1' }, { id: 'c2' }]));

    await clearDefaultSecurityContact('tenant-1');

    expect(selectMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('skips the exceptId contact', async () => {
    selectMock.mockReturnValue(makeSelectChain([{ id: 'c1' }, { id: 'keep' }, { id: 'c3' }]));

    await clearDefaultSecurityContact('tenant-1', 'keep');

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock.mock.calls.map(call => call[0])).toHaveLength(2);
  });

  it('does nothing when no defaults exist', async () => {
    selectMock.mockReturnValue(makeSelectChain([]));

    await clearDefaultSecurityContact('tenant-1');

    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('setDefaultSecurityContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectMock.mockReturnValue(makeSelectChain([{ id: 'other' }]));
    updateMock.mockReturnValue(makeUpdateChain([]));
  });

  it('clears other defaults then sets the target as default', async () => {
    await setDefaultSecurityContact('tenant-1', 'target');

    expect(selectMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledTimes(2);
  });
});
