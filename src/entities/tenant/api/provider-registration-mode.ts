import { unstable_cache } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { CACHE_TAGS, db, settings } from '@api/server';
import { createComponentLogger } from '@shared/lib';
import {
  DEFAULT_PROVIDER_REGISTRATION_MODE,
  normalizeProviderRegistrationMode,
  providerRegistrationModeSchema,
  type ProviderRegistrationMode,
} from '@shared/lib/providers/registration';

import { SETTINGS_KEYS } from './settings';

const log = createComponentLogger('provider-registration-mode');

export async function getProviderRegistrationModeImpl(
  tenantId: string
): Promise<ProviderRegistrationMode> {
  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.tenantId, tenantId),
          eq(settings.key, SETTINGS_KEYS.PROVIDER_REGISTRATION_MODE)
        )
      )
      .limit(1);

    return normalizeProviderRegistrationMode(row?.value);
  } catch (error) {
    log.error(
      { operation: 'getProviderRegistrationMode', tenantId },
      'Failed to read provider registration mode',
      error
    );
    return DEFAULT_PROVIDER_REGISTRATION_MODE;
  }
}

export const getProviderRegistrationMode = unstable_cache(
  getProviderRegistrationModeImpl,
  ['provider-registration-mode'],
  {
    revalidate: 300,
    tags: [CACHE_TAGS.SETTINGS],
  }
);

export async function setProviderRegistrationMode(
  tenantId: string,
  mode: ProviderRegistrationMode
): Promise<boolean> {
  try {
    const normalizedMode = providerRegistrationModeSchema.parse(mode);
    const [existing] = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.tenantId, tenantId),
          eq(settings.key, SETTINGS_KEYS.PROVIDER_REGISTRATION_MODE)
        )
      )
      .limit(1);

    if (existing) {
      await db.update(settings).set({ value: normalizedMode }).where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        tenantId,
        key: SETTINGS_KEYS.PROVIDER_REGISTRATION_MODE,
        value: normalizedMode,
      });
    }

    return true;
  } catch (error) {
    log.error(
      { operation: 'setProviderRegistrationMode', tenantId, mode },
      'Failed to save provider registration mode',
      error
    );
    return false;
  }
}
