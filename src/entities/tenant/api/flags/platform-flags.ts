import { db, settings, CACHE_TAGS } from '@api/server';

import type { DbSchema } from '@api/server';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { SETTINGS_KEYS } from '../settings';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('platform-flags');

import { type PlatformPageFlags } from '@shared/lib';
export type { PlatformPageFlags };

import { DEFAULT_PAGE_FLAGS } from '@shared/lib/settings/defaults';

type FlagType = 'boolean' | 'enum' | 'json';

interface FlagDef {
  settingKey: string;
  type: FlagType;
  enumValues?: string[];
}

const FLAG_DEFS: Record<keyof PlatformPageFlags, FlagDef> = {
  campaign: { settingKey: SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED, type: 'boolean' },
  conservation: {
    settingKey: SETTINGS_KEYS.PAGE_CONSERVATION_MODE,
    type: 'enum',
    enumValues: ['default', 'managed', 'external'],
  },
  conservationExternalUrl: {
    settingKey: SETTINGS_KEYS.PAGE_CONSERVATION_URL,
    type: 'enum',
  },
  chat: { settingKey: SETTINGS_KEYS.PAGE_CHAT_ENABLED, type: 'boolean' },
  education: { settingKey: SETTINGS_KEYS.PAGE_EDUCATION_ENABLED, type: 'boolean' },
  news: { settingKey: SETTINGS_KEYS.PAGE_NEWS_ENABLED, type: 'boolean' },
  events: { settingKey: SETTINGS_KEYS.PAGE_EVENTS_ENABLED, type: 'boolean' },
  directory: { settingKey: SETTINGS_KEYS.PAGE_DIRECTORY_ENABLED, type: 'boolean' },
  groups: { settingKey: SETTINGS_KEYS.PAGE_GROUPS_ENABLED, type: 'boolean' },
  services: { settingKey: SETTINGS_KEYS.PAGE_SERVICES_ENABLED, type: 'boolean' },
  resources: { settingKey: SETTINGS_KEYS.PAGE_RESOURCES_ENABLED, type: 'boolean' },
  maintenance: { settingKey: SETTINGS_KEYS.PAGE_MAINTENANCE_ENABLED, type: 'boolean' },
  surveys: { settingKey: SETTINGS_KEYS.PAGE_SURVEYS_ENABLED, type: 'boolean' },
  competitions: { settingKey: SETTINGS_KEYS.PAGE_COMPETITIONS_ENABLED, type: 'boolean' },
  dashboard: { settingKey: SETTINGS_KEYS.PAGE_DASHBOARD_ENABLED, type: 'boolean' },
  disputes: { settingKey: SETTINGS_KEYS.PAGE_DISPUTES_ENABLED, type: 'boolean' },
  dWallet: { settingKey: SETTINGS_KEYS.PAGE_DWALLET_ENABLED, type: 'boolean' },
  providers: { settingKey: SETTINGS_KEYS.PAGE_PROVIDERS_ENABLED, type: 'boolean' },
  bookings: { settingKey: SETTINGS_KEYS.PAGE_BOOKINGS_ENABLED, type: 'boolean' },
  marketplacePaypal: { settingKey: SETTINGS_KEYS.PAGE_MARKETPLACE_PAYPAL_ENABLED, type: 'boolean' },
  messages: { settingKey: SETTINGS_KEYS.PAGE_MESSAGES_ENABLED, type: 'boolean' },
  headerLinks: { settingKey: SETTINGS_KEYS.HEADER_LINKS, type: 'json' },
};

function applySettingToFlags(flags: PlatformPageFlags, key: string, value: string): void {
  const entry = Object.entries(FLAG_DEFS).find(([_, def]) => def.settingKey === key) as
    | [keyof PlatformPageFlags, FlagDef]
    | undefined;
  if (!entry) return;

  const [flagKey, def] = entry;

  if (def.type === 'boolean') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (flags as any)[flagKey] = value === 'true';
  } else if (def.type === 'json') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (flags as any)[flagKey] = parsed;
      }
    } catch {
      /* keep default */
    }
  } else {
    const raw = value as unknown;
    if (!def.enumValues || def.enumValues.includes(raw as string)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (flags as any)[flagKey] = raw;
    }
  }
}

function buildFlagsFromSettings(rows: { key: string; value: string }[]): PlatformPageFlags {
  const flags: PlatformPageFlags = { ...DEFAULT_PAGE_FLAGS };
  for (const row of rows) {
    applySettingToFlags(flags, row.key, row.value);
  }
  return flags;
}

export async function getPlatformPageFlagsImpl(tenantId: string): Promise<PlatformPageFlags> {
  try {
    const tenantSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
    return buildFlagsFromSettings(tenantSettings);
  } catch (error) {
    log.error({ operation: 'getPageFlags' }, 'Failed to get platform page flags', error);
    return DEFAULT_PAGE_FLAGS;
  }
}

export const getPlatformPageFlags = unstable_cache(
  getPlatformPageFlagsImpl,
  ['platform-page-flags'],
  {
    revalidate: 300,
    tags: [CACHE_TAGS.SETTINGS],
  }
);

function serializeValue(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

export async function setPlatformPageFlag(
  tenantId: string,
  key: keyof PlatformPageFlags,
  value: string | boolean | string[]
): Promise<boolean> {
  try {
    const settingKey = mapFlagToSettingKey(key);
    if (!settingKey) return false;

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .then(rows => rows.find(s => s.key === settingKey));

    if (existing) {
      await db
        .update(settings)
        .set({ value: serializeValue(value) })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        tenantId,
        key: settingKey,
        value: serializeValue(value),
      });
    }

    return true;
  } catch (error) {
    log.error({ operation: 'setPageFlag' }, 'Failed to set platform page flag', error);
    return false;
  }
}

export async function getPlatformPageFlagsWithTx(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string
): Promise<PlatformPageFlags> {
  try {
    const tenantSettings = await tx.select().from(settings).where(eq(settings.tenantId, tenantId));
    return buildFlagsFromSettings(tenantSettings);
  } catch (error) {
    log.error({ operation: 'getPageFlagsWithTx' }, 'Failed to get platform page flags', error);
    return DEFAULT_PAGE_FLAGS;
  }
}

export async function setPlatformPageFlagWithTx(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string,
  key: keyof PlatformPageFlags,
  value: string | boolean | string[]
): Promise<boolean> {
  try {
    const settingKey = mapFlagToSettingKey(key);
    if (!settingKey) return false;

    const existing = await tx
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .then(rows => rows.find(s => s.key === settingKey));

    if (existing) {
      await tx
        .update(settings)
        .set({ value: serializeValue(value) })
        .where(eq(settings.id, existing.id));
    } else {
      await tx.insert(settings).values({
        id: uuidv4(),
        tenantId,
        key: settingKey,
        value: serializeValue(value),
      });
    }

    return true;
  } catch (error) {
    log.error({ operation: 'setPageFlagWithTx' }, 'Failed to set platform page flag', error);
    return false;
  }
}

export function mapFlagToSettingKey(key: keyof PlatformPageFlags): string | undefined {
  return FLAG_DEFS[key]?.settingKey;
}
