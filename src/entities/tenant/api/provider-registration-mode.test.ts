import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getProviderRegistrationModeImpl,
  setProviderRegistrationMode,
} from './provider-registration-mode';
import { db } from '@api/server';
import { SETTINGS_KEYS } from './settings';

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
  },
  settings: {
    id: 'id',
    tenantId: 'tenantId',
    key: 'key',
  },
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('provider-registration-mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to invitation only when no tenant setting exists', async () => {
    const mode = await getProviderRegistrationModeImpl('tenant-1');
    expect(mode).toBe('INVITATION_ONLY');
  });

  it('returns an explicitly configured mode', async () => {
    vi.mocked(db.where).mockResolvedValueOnce([
      { key: SETTINGS_KEYS.PROVIDER_REGISTRATION_MODE, value: 'OPEN' },
    ]);

    const mode = await getProviderRegistrationModeImpl('tenant-1');
    expect(mode).toBe('OPEN');
  });

  it('updates an existing setting when saving the mode', async () => {
    vi.mocked(db.where).mockResolvedValueOnce([
      { id: 'setting-1', key: SETTINGS_KEYS.PROVIDER_REGISTRATION_MODE, value: 'INVITATION_ONLY' },
    ]);

    const ok = await setProviderRegistrationMode('tenant-1', 'OPEN');

    expect(ok).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });
});
